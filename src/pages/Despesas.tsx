// Módulo Despesas — controle financeiro dos gastos da revenda.
//
// O que esta página entrega:
//   • Banner de "Em aberto" no topo (cor de alerta quando há saldo devedor)
//   • 7 cards de KPI (um por categoria) clicáveis para filtrar
//   • Listagem em tabela (desktop) ou cards (mobile <md)
//   • Filtros: período, tipo (multi), status pago, veículo (incl. Geral) + busca
//   • CRUD completo com modal de form + confirmação de exclusão
//   • Toggle rápido pago/em aberto direto na linha
//   • Estados vazios distintos (sem despesas vs. sem resultados no filtro)
//
// Integração:
//   • Tudo persiste no store Zustand → Dashboard reflete em tempo real
//     via `lucroDoMes`, `despesasDoMes`, `ultimasMovimentacoes`, etc.

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Plus,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/useToast'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatPbError } from '@/lib/pbApi'
import {
  correspondeFiltroPagoPor,
  opcoesFiltroPagoPor,
} from '@/utils/despesaOrigem'
import {
  somarDespesasEmAberto,
  somarDespesasPorTipo,
} from '@/utils/calculos'
import { formatarMoeda } from '@/utils/formatadores'
import { TIPOS_DESPESA, type Despesa, type TipoDespesa, type Veiculo } from '@/types'

import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { DespesaCategoriaCard } from '@/components/DespesaCategoriaCard'
import { DespesaCard } from '@/components/DespesaCard'
import { DespesaFormModal } from '@/components/DespesaFormModal'
import {
  DespesaTable,
  type TotaisDespesas,
} from '@/components/DespesaTable'
import {
  DespesaFiltros,
  filtrosDespesasVazios,
  type FiltrosDespesas,
} from '@/components/DespesaFiltros'

// Debounce simples para a busca por descrição (250ms — spec).
function useDebounce<T>(valor: T, delayMs = 250): T {
  const [val, setVal] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => setVal(valor), delayMs)
    return () => window.clearTimeout(t)
  }, [valor, delayMs])
  return val
}

export default function Despesas() {
  const despesas = useStore((s) => s.despesas)
  const veiculos = useStore((s) => s.veiculos)
  const socios = useStore((s) => s.configuracoes.socios)
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const addDespesa = useStore((s) => s.addDespesa)
  const updateDespesa = useStore((s) => s.updateDespesa)
  const deleteDespesa = useStore((s) => s.deleteDespesa)
  const toggleDespesaPaga = useStore((s) => s.toggleDespesaPaga)
  const toast = useToast()
  const salvarServidor = useSalvarServidor()

  // UI state ---------------------------------------------------------------
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 250)
  const [filtros, setFiltros] = useState<FiltrosDespesas>(
    filtrosDespesasVazios,
  )

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Despesa | undefined>(undefined)
  const [despesaExcluir, setDespesaExcluir] = useState<Despesa | undefined>(
    undefined,
  )

  // Mapa veiculo_id -> Veiculo para evitar find() em cada linha. -----------
  const veiculosPorId = useMemo(() => {
    const map: Record<string, Veiculo> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  // Opções do filtro "Quem pagou" -------------------------------------------
  const opcoesPagoPor = useMemo(
    () => opcoesFiltroPagoPor(despesas, nomeRevenda, socios),
    [despesas, nomeRevenda, socios],
  )

  // Filtragem ---------------------------------------------------------------
  const despesasFiltradas = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase()
    return despesas.filter((d) => {
      if (termo && !d.descricao.toLowerCase().includes(termo)) return false
      if (filtros.tipos.length > 0 && !filtros.tipos.includes(d.tipo))
        return false
      if (filtros.pago === 'pago' && !d.pago) return false
      if (filtros.pago === 'aberto' && d.pago) return false
      if (filtros.veiculoId === 'sem' && d.veiculo_id) return false
      if (
        filtros.veiculoId &&
        filtros.veiculoId !== 'sem' &&
        d.veiculo_id !== filtros.veiculoId
      )
        return false
      if (filtros.dataInicio && d.data < filtros.dataInicio) return false
      if (filtros.dataFim && d.data > filtros.dataFim) return false
      if (
        filtros.pagoPor &&
        !correspondeFiltroPagoPor(
          d.pago_por,
          filtros.pagoPor,
          nomeRevenda,
          socios,
        )
      ) {
        return false
      }
      return true
    })
  }, [despesas, buscaDebounced, filtros, nomeRevenda, socios])

  const despesasOrdenadas = useMemo(
    () => [...despesasFiltradas].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [despesasFiltradas],
  )

  // KPIs por categoria — sempre baseados no FILTRO ATUAL (spec).
  const porTipo = useMemo(
    () => somarDespesasPorTipo(despesasFiltradas),
    [despesasFiltradas],
  )

  // Banner "Em aberto" — sempre considera o estado GLOBAL para não esconder
  // pendências quando o filtro corrente está restrito (ex.: "só pagas").
  const emAbertoGlobal = useMemo(
    () => somarDespesasEmAberto(despesas),
    [despesas],
  )

  // Totais para o rodapé da tabela / card de totais mobile (filtro atual).
  const totais = useMemo<TotaisDespesas>(() => {
    let totalGeral = 0
    let totalPago = 0
    let totalEmAberto = 0
    for (const d of despesasOrdenadas) {
      totalGeral += d.valor
      if (d.pago) totalPago += d.valor
      else totalEmAberto += d.valor
    }
    return {
      quantidade: despesasOrdenadas.length,
      totalGeral,
      totalPago,
      totalEmAberto,
    }
  }, [despesasOrdenadas])

  // Handlers ----------------------------------------------------------------
  function abrirCadastro() {
    setEditando(undefined)
    setFormAberto(true)
  }
  function abrirEdicao(d: Despesa) {
    setEditando(d)
    setFormAberto(true)
  }
  function fecharForm() {
    setFormAberto(false)
    setEditando(undefined)
  }

  async function salvarDespesa(d: Despesa) {
    if (editando) {
      const ok = await salvarServidor(
        () =>
          updateDespesa(editando.id, {
            data: d.data,
            tipo: d.tipo,
            descricao: d.descricao,
            valor: d.valor,
            veiculo_id: d.veiculo_id,
            pago: d.pago,
            forma_pagamento: d.forma_pagamento,
            pago_por: d.pago_por,
            reembolsado: d.reembolsado,
          }),
        'Despesa atualizada',
      )
      if (ok) fecharForm()
    } else {
      const ok = await salvarServidor(
        () => addDespesa(d),
        'Despesa registrada',
      )
      if (ok) fecharForm()
    }
  }

  async function confirmarExclusao() {
    if (!despesaExcluir) return
    try {
      await deleteDespesa(despesaExcluir.id)
      toast.success('Despesa excluída', 'Salvo no servidor.')
      setDespesaExcluir(undefined)
    } catch (err) {
      toast.error('Falha ao excluir no servidor', formatPbError(err))
    }
  }

  async function handleTogglePago(d: Despesa) {
    try {
      await toggleDespesaPaga(d.id)
    } catch (err) {
      toast.error('Falha ao atualizar no servidor', formatPbError(err))
    }
  }

  // Alterna um tipo no filtro corrente — chamado pelos cards de categoria.
  function toggleTipoFiltro(t: TipoDespesa) {
    const ja = filtros.tipos.includes(t)
    setFiltros({
      ...filtros,
      tipos: ja ? filtros.tipos.filter((x) => x !== t) : [...filtros.tipos, t],
    })
  }

  function aplicarFiltroEmAberto() {
    setFiltros({ ...filtros, pago: 'aberto' })
    // Garante visibilidade do toggle "em aberto" recém-aplicado.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Renderização ------------------------------------------------------------
  const totalGeral = despesas.length
  const totalFiltrado = despesasOrdenadas.length
  const semDespesas = totalGeral === 0
  const filtroEmAbertoAtivo = filtros.pago === 'aberto'

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Despesas</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Controle financeiro dos gastos — gerais ou vinculados a um veículo.
            Tudo entra no lucro líquido do Dashboard em tempo real.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={abrirCadastro}
        >
          Nova despesa
        </Button>
      </div>

      {semDespesas ? (
        <EstadoVazio onAdicionar={abrirCadastro} />
      ) : (
        <>
          {/* Banner: despesas em aberto -------------------------------------
              Cor de alerta âmbar quando há saldo devedor, neutro quando zero. */}
          <BannerEmAberto
            quantidade={emAbertoGlobal.quantidade}
            total={emAbertoGlobal.total}
            filtroAtivo={filtroEmAbertoAtivo}
            onAplicarFiltro={aplicarFiltroEmAberto}
          />

          {/* 7 cards por categoria — clique aplica/remove o tipo do filtro */}
          <section
            aria-label="Totais por categoria"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7"
          >
            {TIPOS_DESPESA.map((t) => (
              <DespesaCategoriaCard
                key={t}
                tipo={t}
                total={porTipo[t].total}
                quantidade={porTipo[t].quantidade}
                ativo={filtros.tipos.includes(t)}
                onClick={() => toggleTipoFiltro(t)}
              />
            ))}
          </section>

          {/* Busca */}
          <section className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por descrição..."
                className="input pl-9"
                aria-label="Buscar despesas"
              />
            </div>
          </section>

          {/* Filtros */}
          <DespesaFiltros
            filtros={filtros}
            onChange={setFiltros}
            veiculos={veiculos}
            opcoesPagoPor={opcoesPagoPor}
            totalResultados={totalFiltrado}
            onLimpar={() => setFiltros(filtrosDespesasVazios)}
          />

          {/* Contador */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando{' '}
            <span className="tabular font-semibold">{totalFiltrado}</span> de{' '}
            <span className="tabular">{totalGeral}</span>{' '}
            {totalGeral === 1 ? 'despesa' : 'despesas'}.
          </p>

          {/* Conteúdo */}
          {totalFiltrado === 0 ? (
            <SemResultados onLimpar={() => setFiltros(filtrosDespesasVazios)} />
          ) : (
            <>
              {/* Desktop (md+) */}
              <div className="hidden md:block">
                <DespesaTable
                  despesas={despesasOrdenadas}
                  veiculosPorId={veiculosPorId}
                  nomeRevenda={nomeRevenda}
                  socios={socios}
                  totais={totais}
                  onEditar={abrirEdicao}
                  onExcluir={(d) => setDespesaExcluir(d)}
                  onTogglePago={handleTogglePago}
                />
              </div>

              {/* Mobile (<md) */}
              <div className="space-y-3 md:hidden">
                {despesasOrdenadas.map((d) => (
                  <DespesaCard
                    key={d.id}
                    despesa={d}
                    nomeRevenda={nomeRevenda}
                    socios={socios}
                    veiculo={
                      d.veiculo_id ? veiculosPorId[d.veiculo_id] : undefined
                    }
                    onEditar={() => abrirEdicao(d)}
                    onExcluir={() => setDespesaExcluir(d)}
                    onTogglePago={() => handleTogglePago(d)}
                  />
                ))}
                <TotaisMobile totais={totais} />
              </div>
            </>
          )}
        </>
      )}

      {/* Modal cadastro/edição */}
      <DespesaFormModal
        open={formAberto}
        despesa={editando}
        veiculos={veiculos}
        socios={socios}
        nomeRevenda={nomeRevenda}
        onClose={fecharForm}
        onSubmit={salvarDespesa}
      />

      {/* Confirmação de exclusão */}
      <Modal
        open={!!despesaExcluir}
        title="Excluir despesa"
        description="O valor será removido dos cálculos do Dashboard. Esta ação não pode ser desfeita."
        onClose={() => setDespesaExcluir(undefined)}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDespesaExcluir(undefined)}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </>
        }
      >
        {despesaExcluir && (
          <p className="text-sm">
            Tem certeza que deseja excluir{' '}
            <span className="font-semibold">{despesaExcluir.descricao}</span> (
            <span className="tabular">
              {formatarMoeda(despesaExcluir.valor)}
            </span>
            )?
          </p>
        )}
      </Modal>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Banner "Em aberto" — destaque visual no topo (CTA aplica filtro automático).
// -----------------------------------------------------------------------------
function BannerEmAberto({
  quantidade,
  total,
  filtroAtivo,
  onAplicarFiltro,
}: {
  quantidade: number
  total: number
  filtroAtivo: boolean
  onAplicarFiltro: () => void
}) {
  const tem = quantidade > 0

  return (
    <section
      aria-label="Despesas em aberto"
      className={[
        'card flex flex-wrap items-center justify-between gap-4 border-l-4 p-4',
        tem
          ? 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-500/[0.06]'
          : 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/[0.06]',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'grid h-10 w-10 place-items-center rounded-lg',
            tem
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          ].join(' ')}
        >
          {tem ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
        </span>
        <div>
          <p className="text-sm font-semibold">
            {tem
              ? `${quantidade} ${quantidade === 1 ? 'despesa' : 'despesas'} em aberto`
              : 'Nenhuma despesa em aberto'}
          </p>
          <p className="tabular mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {tem
              ? `Soma a pagar: ${formatarMoeda(total)}`
              : 'Tudo pago em dia — boa gestão de fluxo!'}
          </p>
        </div>
      </div>
      {tem && (
        <Button
          variant={filtroAtivo ? 'secondary' : 'primary'}
          size="sm"
          leftIcon={<Filter size={14} />}
          onClick={onAplicarFiltro}
          disabled={filtroAtivo}
        >
          {filtroAtivo ? 'Filtro aplicado' : 'Filtrar em aberto'}
        </Button>
      )}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Totais agregados na visão mobile — equivalente do <tfoot> da tabela.
// -----------------------------------------------------------------------------
function TotaisMobile({ totais }: { totais: TotaisDespesas }) {
  return (
    <div className="card flex flex-col gap-2 bg-zinc-50/60 p-4 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Totais do filtro
      </p>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-500 dark:text-zinc-400">Despesas</dt>
        <dd className="tabular text-right font-semibold">
          {totais.quantidade}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Total</dt>
        <dd className="tabular text-right font-semibold">
          {formatarMoeda(totais.totalGeral)}
        </dd>
        <dt className="text-emerald-600 dark:text-emerald-400">Pago</dt>
        <dd className="tabular text-right font-semibold text-emerald-600 dark:text-emerald-400">
          {formatarMoeda(totais.totalPago)}
        </dd>
        <dt className="text-amber-600 dark:text-amber-400">Em aberto</dt>
        <dd className="tabular text-right font-semibold text-amber-600 dark:text-amber-400">
          {formatarMoeda(totais.totalEmAberto)}
        </dd>
      </dl>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Estados vazios — primeira execução vs. sem resultados com filtros aplicados.
// -----------------------------------------------------------------------------
function EstadoVazio({ onAdicionar }: { onAdicionar: () => void }) {
  return (
    <section className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Receipt size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Nenhuma despesa registrada
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Lance a primeira despesa — manutenção, documentação, marketing...
          Tudo entra no cálculo do lucro líquido do Dashboard.
        </p>
      </div>
      <Button
        variant="primary"
        leftIcon={<Plus size={16} />}
        onClick={onAdicionar}
      >
        Registrar primeira despesa
      </Button>
    </section>
  )
}

function SemResultados({ onLimpar }: { onLimpar: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-white/[0.06]">
        <Wallet size={20} />
      </span>
      <div>
        <p className="text-sm font-medium">
          Nenhuma despesa encontrada com os filtros atuais.
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ajuste a busca, os tipos ou o período — ou limpe tudo para ver
          todas as despesas.
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onLimpar}>
        Limpar filtros
      </Button>
    </div>
  )
}
