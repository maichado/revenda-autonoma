import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Search, Tags } from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/useToast'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatPbError } from '@/lib/pbApi'
import { calcularLucroVenda } from '@/utils/calculos'
import { exportarVendasCSV } from '@/utils/exportarCSV'
import type { Veiculo, Venda } from '@/types'

import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { VendaTable } from '@/components/VendaTable'
import { VendaCard } from '@/components/VendaCard'
import { VendaFormModal } from '@/components/VendaFormModal'
import {
  VendaFiltros,
  type FiltrosVendas,
} from '@/components/VendaFiltros'

// Valores iniciais dos filtros — vazios significam "sem filtro aplicado".
const filtrosVazios: FiltrosVendas = {
  dataInicio: '',
  dataFim: '',
  formasRecebimento: [],
}

// Hook simples de debounce — usado pela busca por placa/comprador/modelo.
function useDebounce<T>(valor: T, delayMs = 250): T {
  const [val, setVal] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => setVal(valor), delayMs)
    return () => window.clearTimeout(t)
  }, [valor, delayMs])
  return val
}

export default function Vendas() {
  const vendas = useStore((s) => s.vendas)
  const veiculos = useStore((s) => s.veiculos)
  const despesas = useStore((s) => s.despesas)
  const addVenda = useStore((s) => s.addVenda)
  const updateVenda = useStore((s) => s.updateVenda)
  const deleteVenda = useStore((s) => s.deleteVenda)
  const toast = useToast()
  const salvarServidor = useSalvarServidor()

  // UI state ---------------------------------------------------------------
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 250)
  const [filtros, setFiltros] = useState<FiltrosVendas>(filtrosVazios)

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Venda | undefined>(undefined)

  const [vendaExcluir, setVendaExcluir] = useState<Venda | undefined>(undefined)

  // Mapa veiculo_id -> Veiculo para evitar find() em cada linha. ----------
  const veiculosPorId = useMemo(() => {
    const map: Record<string, Veiculo> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  // Filtragem completa (busca + filtros). ---------------------------------
  const vendasFiltradas = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase()
    const dataIni = filtros.dataInicio || null
    const dataFim = filtros.dataFim || null

    return vendas.filter((v) => {
      // Busca por placa OU nome do comprador OU modelo do veículo.
      if (termo) {
        const veic = veiculosPorId[v.veiculo_id]
        const alvo = [
          veic?.placa ?? '',
          veic?.modelo ?? '',
          v.comprador_nome,
        ]
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }

      if (
        filtros.formasRecebimento.length > 0 &&
        !filtros.formasRecebimento.includes(
          v.forma_recebimento as (typeof filtros.formasRecebimento)[number],
        )
      ) {
        return false
      }

      // Comparação ISO yyyy-MM-dd como string funciona lexicograficamente.
      if (dataIni && v.data < dataIni) return false
      if (dataFim && v.data > dataFim) return false
      return true
    })
  }, [vendas, veiculosPorId, buscaDebounced, filtros])

  // Vendas ordenadas por data (mais recente primeiro).
  const vendasOrdenadas = useMemo(
    () => [...vendasFiltradas].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [vendasFiltradas],
  )

  // Totais agregados — alimentam o rodapé da tabela e os totais mobile.
  const totais = useMemo(() => {
    const quantidade = vendasOrdenadas.length
    const receita = vendasOrdenadas.reduce(
      (acc, v) => acc + v.valor_venda,
      0,
    )
    const lucroTotal = vendasOrdenadas.reduce((acc, v) => {
      const veic = veiculosPorId[v.veiculo_id]
      return acc + calcularLucroVenda(v, veic, despesas)
    }, 0)
    const ticketMedio = quantidade > 0 ? receita / quantidade : 0
    return { quantidade, receita, lucroTotal, ticketMedio }
  }, [vendasOrdenadas, veiculosPorId, despesas])

  // Handlers ---------------------------------------------------------------
  function abrirCadastro() {
    if (veiculos.length === 0) {
      toast.warning(
        'Cadastre um veículo primeiro',
        'A venda precisa referenciar um veículo do estoque.',
      )
      return
    }
    setEditando(undefined)
    setFormAberto(true)
  }
  function abrirEdicao(v: Venda) {
    setEditando(v)
    setFormAberto(true)
  }
  function fecharForm() {
    setFormAberto(false)
    setEditando(undefined)
  }
  async function salvarVenda(v: Venda) {
    if (editando) {
      const ok = await salvarServidor(
        () => updateVenda(editando.id, v),
        'Venda atualizada',
      )
      if (ok) fecharForm()
    } else {
      const ok = await salvarServidor(
        () => addVenda(v),
        'Venda registrada',
      )
      if (ok) fecharForm()
    }
  }

  async function confirmarExclusao() {
    if (!vendaExcluir) return
    try {
      await deleteVenda(vendaExcluir.id)
      toast.success('Venda excluída', 'Salvo no servidor.')
      setVendaExcluir(undefined)
    } catch (err) {
      toast.error('Falha ao excluir no servidor', formatPbError(err))
    }
  }

  function exportarCSV() {
    if (vendasOrdenadas.length === 0) {
      toast.warning(
        'Nada para exportar',
        'Ajuste os filtros para incluir pelo menos uma venda.',
      )
      return
    }
    exportarVendasCSV(vendasOrdenadas, veiculos, despesas)
    toast.success(
      'CSV gerado',
      `${vendasOrdenadas.length} venda(s) exportada(s).`,
    )
  }

  // Renderização -----------------------------------------------------------
  const totalGeral = vendas.length
  const totalFiltrado = vendasOrdenadas.length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Registro de vendas — cada venda atualiza o status do veículo e
            recalcula lucro / ROI a partir das despesas vinculadas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            leftIcon={<Download size={16} />}
            onClick={exportarCSV}
            disabled={vendas.length === 0}
            title="Exporta a listagem filtrada como CSV (UTF-8 + BOM, ; como delimitador)."
          >
            Exportar CSV
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={abrirCadastro}
          >
            Nova venda
          </Button>
        </div>
      </div>

      {totalGeral === 0 ? (
        <EstadoVazio onAdicionar={abrirCadastro} />
      ) : (
        <>
          {/* Barra de busca */}
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
                placeholder="Buscar por placa, comprador ou modelo..."
                className="input pl-9"
                aria-label="Buscar vendas"
              />
            </div>
          </section>

          {/* Filtros */}
          <VendaFiltros
            filtros={filtros}
            onChange={setFiltros}
            totalResultados={totalFiltrado}
            onLimpar={() => setFiltros(filtrosVazios)}
          />

          {/* Contagem */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando{' '}
            <span className="tabular font-semibold">{totalFiltrado}</span> de{' '}
            <span className="tabular">{totalGeral}</span>{' '}
            {totalGeral === 1 ? 'venda' : 'vendas'}.
          </p>

          {/* Conteúdo: tabela em desktop, cards em mobile */}
          {totalFiltrado === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-medium">
                Nenhuma venda encontrada com os filtros atuais.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Ajuste a busca ou limpe os filtros para ver mais resultados.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop (md+) */}
              <div className="hidden md:block">
                <VendaTable
                  vendas={vendasOrdenadas}
                  veiculosPorId={veiculosPorId}
                  despesas={despesas}
                  totais={totais}
                  onEditar={abrirEdicao}
                  onExcluir={(v) => setVendaExcluir(v)}
                />
              </div>

              {/* Mobile (<md) — cards empilhados + linha de totais */}
              <div className="space-y-3 md:hidden">
                {vendasOrdenadas.map((v) => (
                  <VendaCard
                    key={v.id}
                    venda={v}
                    veiculo={veiculosPorId[v.veiculo_id]}
                    despesas={despesas}
                    onEditar={() => abrirEdicao(v)}
                    onExcluir={() => setVendaExcluir(v)}
                  />
                ))}
                <TotaisMobile totais={totais} />
              </div>
            </>
          )}
        </>
      )}

      {/* Modal cadastro/edição */}
      <VendaFormModal
        open={formAberto}
        venda={editando}
        veiculos={veiculos}
        onClose={fecharForm}
        onSubmit={salvarVenda}
      />

      {/* Confirmação de exclusão */}
      <Modal
        open={!!vendaExcluir}
        title="Excluir venda"
        description="A venda será removida e o veículo associado voltará para 'disponível' no estoque."
        onClose={() => setVendaExcluir(undefined)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVendaExcluir(undefined)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </>
        }
      >
        {vendaExcluir && (
          <p className="text-sm">
            Tem certeza que deseja excluir a venda para{' '}
            <span className="font-semibold">
              {vendaExcluir.comprador_nome || 'comprador não informado'}
            </span>
            ?
          </p>
        )}
      </Modal>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Totais em mobile — equivalente ao <tfoot> da tabela.
// -----------------------------------------------------------------------------
function TotaisMobile({
  totais,
}: {
  totais: {
    quantidade: number
    receita: number
    lucroTotal: number
    ticketMedio: number
  }
}) {
  const brl = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
  const corLucro =
    totais.lucroTotal >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'
  return (
    <div className="card flex flex-col gap-2 bg-zinc-50/60 p-4 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Totais do filtro
      </p>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-500 dark:text-zinc-400">Vendas</dt>
        <dd className="tabular text-right font-semibold">
          {totais.quantidade}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Receita</dt>
        <dd className="tabular text-right font-semibold">
          {brl.format(totais.receita)}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Lucro total</dt>
        <dd className={['tabular text-right font-semibold', corLucro].join(' ')}>
          {brl.format(totais.lucroTotal)}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Ticket médio</dt>
        <dd className="tabular text-right font-semibold">
          {brl.format(totais.ticketMedio)}
        </dd>
      </dl>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Estado vazio amigável.
// -----------------------------------------------------------------------------
function EstadoVazio({ onAdicionar }: { onAdicionar: () => void }) {
  return (
    <section className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Tags size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Nenhuma venda registrada
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Registre a primeira venda para acompanhar comprador, forma de
          recebimento e lucro real por negócio.
        </p>
      </div>
      <Button
        variant="primary"
        leftIcon={<Plus size={16} />}
        onClick={onAdicionar}
      >
        Registrar primeira venda
      </Button>
    </section>
  )
}
