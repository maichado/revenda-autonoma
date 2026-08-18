import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Car,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Gauge,
  LayoutGrid,
  MoreVertical,
  Package,
  Plus,
  RefreshCw,
  Search,
  Table as TableIcon,
  Trash2,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatPbError } from '@/lib/pbApi'
import {
  calcularMargemEsperada,
  custoTotalVeiculo,
  receitaRealizadaDaVenda,
  resumoFinanceiroVeiculo,
  totalEmEstoque,
  type ResumoFinanceiroVeiculo,
} from '@/utils/calculos'
import {
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { TrocaNaVendaInput, Veiculo, Venda } from '@/types'

import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { KpiCard } from '@/components/KpiCard'
import { VeiculoCard } from '@/components/VeiculoCard'
import { VeiculoTable } from '@/components/VeiculoTable'
import { VeiculoFormModal } from '@/components/VeiculoFormModal'
import { VendaFormModal } from '@/components/VendaFormModal'
import { AnuncioVeiculoModal } from '@/components/AnuncioVeiculoModal'
import {
  VeiculoFiltros,
  type FiltrosVeiculos,
} from '@/components/VeiculoFiltros'

// Valores iniciais dos filtros — vazios significam "sem filtro aplicado".
const filtrosVazios: FiltrosVeiculos = {
  status: [],
  marca: '',
  precoMin: null,
  precoMax: null,
  dataInicio: '',
  dataFim: '',
}

type Visao = 'cards' | 'tabela'

export default function Veiculos() {
  const veiculos = useStore((s) => s.veiculos)
  const vendas = useStore((s) => s.vendas)
  const despesas = useStore((s) => s.despesas)
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const addVeiculo = useStore((s) => s.addVeiculo)
  const updateVeiculo = useStore((s) => s.updateVeiculo)
  const deleteVeiculo = useStore((s) => s.deleteVeiculo)
  // Integração com módulo Vendas: o botão "Registrar venda" do card abre o
  // VendaFormModal completo, que chama addVenda e cuida da transição de
  // status. O fluxo antigo "registrarVendaRapida" continua exportado pelo
  // store por compatibilidade, mas não é mais consumido aqui.
  const addVenda = useStore((s) => s.addVenda)
  const limparTudo = useStore((s) => s.limparTudo)
  const resetarParaSeed = useStore((s) => s.resetarParaSeed)
  const toast = useToast()
  const salvarServidor = useSalvarServidor()

  // UI state ---------------------------------------------------------------
  const [visao, setVisao] = useState<Visao>('cards')
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 250)
  const [filtros, setFiltros] = useState<FiltrosVeiculos>(filtrosVazios)

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Veiculo | undefined>(undefined)

  const [veiculoExcluir, setVeiculoExcluir] = useState<Veiculo | undefined>(
    undefined,
  )
  // ID do veículo que dispara a abertura do modal completo de Venda. O modal
  // do módulo Vendas é REUTILIZADO aqui — apenas pré-preenchemos o veículo.
  const [vendaVeiculoId, setVendaVeiculoId] = useState<string | undefined>(
    undefined,
  )
  const [anuncioVeiculo, setAnuncioVeiculo] = useState<Veiculo | undefined>(
    undefined,
  )

  // Menu de dados (limpar / restaurar) -------------------------------------
  const [menuDadosAberto, setMenuDadosAberto] = useState(false)
  const menuDadosRef = useRef<HTMLDivElement>(null)
  const [confirmLimparAberto, setConfirmLimparAberto] = useState(false)
  const [confirmRestaurarAberto, setConfirmRestaurarAberto] = useState(false)

  useEffect(() => {
    if (!menuDadosAberto) return
    function handler(e: MouseEvent) {
      if (
        menuDadosRef.current &&
        !menuDadosRef.current.contains(e.target as Node)
      ) {
        setMenuDadosAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuDadosAberto])

  // Resumo financeiro por veículo — venda pretendida/feita + lucro líquido.
  const vendasPorVeiculoId = useMemo(() => {
    const map: Record<string, Venda | undefined> = {}
    for (const venda of vendas) {
      if (!map[venda.veiculo_id]) {
        map[venda.veiculo_id] = venda
      }
    }
    return map
  }, [vendas])

  const veiculosPorId = useMemo(() => {
    const map: Record<string, Veiculo | undefined> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  /** Bem que entrou por troca → venda de origem (ex.: BIZ → venda do Uno). */
  const vendasOrigemTrocaPorId = useMemo(() => {
    const map: Record<string, Venda | undefined> = {}
    for (const venda of vendas) {
      if (venda.troca_veiculo_id) {
        map[venda.troca_veiculo_id] = venda
      }
    }
    return map
  }, [vendas])

  const resumosPorId = useMemo(() => {
    const out: Record<string, ResumoFinanceiroVeiculo> = {}
    for (const v of veiculos) {
      out[v.id] = resumoFinanceiroVeiculo(
        v,
        despesas,
        vendasPorVeiculoId[v.id],
        vendas,
      )
    }
    return out
  }, [veiculos, despesas, vendasPorVeiculoId, vendas])

  // Lista de marcas distintas — alimenta o select do componente de filtros.
  const marcasDisponiveis = useMemo(() => {
    const set = new Set(veiculos.map((v) => v.marca).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [veiculos])

  // KPIs do estoque — mesmas regras matemáticas do Dashboard. --------------
  // Estes números refletem 1:1 o que aparece no Dashboard, garantindo que
  // a tela de Veículos seja a "fonte da verdade" do estoque.
  const kpisEstoque = useMemo(() => {
    const ativos = veiculos.filter((v) => v.status !== 'vendido')
    const investido = ativos.reduce(
      (acc, v) => acc + custoTotalVeiculo(v, despesas),
      0,
    )
    const previsto = ativos.reduce(
      (acc, v) => acc + v.valor_venda_pretendido,
      0,
    )
    const margemMedia =
      ativos.length > 0
        ? ativos.reduce(
            (acc, v) => acc + calcularMargemEsperada(v, despesas),
            0,
          ) / ativos.length
        : 0
    return {
      emEstoque: totalEmEstoque(veiculos),
      investido,
      previsto,
      margemMedia,
    }
  }, [veiculos, despesas])

  // Filtragem completa (busca + filtros). ----------------------------------
  const veiculosFiltrados = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase()
    const dataIni = filtros.dataInicio || null
    const dataFim = filtros.dataFim || null

    return veiculos.filter((v) => {
      if (termo) {
        const alvo = `${v.placa} ${v.modelo}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (filtros.status.length > 0 && !filtros.status.includes(v.status)) {
        return false
      }
      if (filtros.marca && v.marca !== filtros.marca) return false
      if (
        filtros.precoMin != null &&
        v.valor_venda_pretendido < filtros.precoMin
      )
        return false
      if (
        filtros.precoMax != null &&
        v.valor_venda_pretendido > filtros.precoMax
      )
        return false
      if (dataIni && v.data_compra < dataIni) return false
      if (dataFim && v.data_compra > dataFim) return false
      return true
    })
  }, [veiculos, buscaDebounced, filtros])

  // Handlers ---------------------------------------------------------------
  function abrirCadastro() {
    setEditando(undefined)
    setFormAberto(true)
  }
  function abrirEdicao(v: Veiculo) {
    setEditando(v)
    setFormAberto(true)
  }
  function fecharForm() {
    setFormAberto(false)
    setEditando(undefined)
  }
  async function salvarVeiculo(v: Veiculo) {
    if (editando) {
      const ok = await salvarServidor(
        () => updateVeiculo(editando.id, v),
        'Veículo atualizado',
        `${v.marca} ${v.modelo} (${v.placa}).`,
      )
      if (ok) fecharForm()
    } else {
      const ok = await salvarServidor(
        () => addVeiculo(v),
        'Veículo cadastrado',
        `${v.marca} ${v.modelo} (${v.placa}) — compra registrada automaticamente.`,
      )
      if (ok) fecharForm()
    }
  }

  async function confirmarExclusao() {
    if (!veiculoExcluir) return
    const ref = veiculoExcluir
    try {
      const despesasConvertidas = await deleteVeiculo(ref.id)
      const sufixo =
        despesasConvertidas > 0
          ? ` · ${despesasConvertidas} despesa${despesasConvertidas === 1 ? '' : 's'} convertida${despesasConvertidas === 1 ? '' : 's'} em "geral".`
          : ''
      toast.success(
        'Veículo excluído',
        `${ref.marca} ${ref.modelo} (${ref.placa}). Compras e vendas vinculadas foram removidas.${sufixo} Salvo no servidor.`,
      )
      setVeiculoExcluir(undefined)
    } catch (err) {
      toast.error('Falha ao excluir no servidor', formatPbError(err))
    }
  }

  // Abre o modal completo do módulo Vendas, já pré-preenchendo o veículo.
  // (Spec — integração Veículos → Vendas.)
  function abrirRegistroVenda(v: Veiculo) {
    setVendaVeiculoId(v.id)
  }

  // Recebe a venda submetida pelo VendaFormModal; o store cuida da transição
  // de status (veiculo → "vendido") via addVenda. Troca opcional entra no estoque.
  async function salvarVendaDoCard(venda: Venda, troca?: TrocaNaVendaInput) {
    const ok = await salvarServidor(
      () => addVenda(venda, troca),
      troca
        ? 'Venda registrada com troca no estoque'
        : 'Venda registrada',
    )
    if (ok) setVendaVeiculoId(undefined)
  }

  async function executarLimparTudo() {
    const ok = await salvarServidor(
      () => limparTudo(),
      'Dados limpos',
      'Veículos, compras, vendas e despesas foram removidos.',
    )
    if (ok) setConfirmLimparAberto(false)
  }

  async function executarRestaurar() {
    const ok = await salvarServidor(
      () => resetarParaSeed(),
      'Dados de exemplo restaurados',
      'Estoque inicial recarregado a partir da seed.',
    )
    if (ok) setConfirmRestaurarAberto(false)
  }

  // Renderização -----------------------------------------------------------
  const totalGeral = veiculos.length
  const totalFiltrado = veiculosFiltrados.length

  // Separação visual: disponíveis (estoque ativo) vs. vendidos. Mesma tela,
  // duas seções bem demarcadas — em vez de misturar tudo numa lista só.
  const disponiveisFiltrados = useMemo(
    () => veiculosFiltrados.filter((v) => v.status !== 'vendido'),
    [veiculosFiltrados],
  )
  const vendidosFiltrados = useMemo(
    () => veiculosFiltrados.filter((v) => v.status === 'vendido'),
    [veiculosFiltrados],
  )
  const valorPrevistoDisponiveis = useMemo(
    () =>
      disponiveisFiltrados.reduce((acc, v) => acc + v.valor_venda_pretendido, 0),
    [disponiveisFiltrados],
  )
  const receitaVendidos = useMemo(
    () =>
      vendidosFiltrados.reduce((acc, v) => {
        const venda = vendasPorVeiculoId[v.id]
        return venda ? acc + receitaRealizadaDaVenda(venda) : acc
      }, 0),
    [vendidosFiltrados, vendasPorVeiculoId],
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Veículos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Estoque é a fonte da verdade do sistema — tudo que acontece aqui
            aparece em tempo real no Dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Menu "..." com opções de dados */}
          <div ref={menuDadosRef} className="relative">
            <Button
              variant="ghost"
              size="md"
              aria-label="Mais opções de dados"
              aria-haspopup="menu"
              aria-expanded={menuDadosAberto}
              onClick={() => setMenuDadosAberto((v) => !v)}
            >
              <MoreVertical size={16} />
            </Button>
            {menuDadosAberto && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-border-light bg-surface-light shadow-lg dark:border-border-dark dark:bg-surface-dark"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                  onClick={() => {
                    setMenuDadosAberto(false)
                    setConfirmRestaurarAberto(true)
                  }}
                >
                  <RefreshCw size={14} className="mt-0.5 text-primary" />
                  <span>
                    <span className="block font-medium">
                      Restaurar dados de exemplo
                    </span>
                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                      Recarrega o estoque demo da seed.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-start gap-2 border-t border-border-light px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-500/10 dark:border-border-dark dark:text-red-400"
                  onClick={() => {
                    setMenuDadosAberto(false)
                    setConfirmLimparAberto(true)
                  }}
                >
                  <Trash2 size={14} className="mt-0.5" />
                  <span>
                    <span className="block font-medium">Limpar tudo</span>
                    <span className="block text-[11px] text-red-500/80">
                      Remove veículos, compras, vendas e despesas.
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={abrirCadastro}
          >
            Novo veículo
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          titulo="Em estoque"
          valor={String(kpisEstoque.emEstoque)}
          icone={<Package size={16} />}
        />
        <KpiCard
          titulo="Investido (estoque)"
          valor={formatarMoeda(kpisEstoque.investido)}
          icone={<Coins size={16} />}
        />
        <KpiCard
          titulo="Previsto (estoque)"
          valor={formatarMoeda(kpisEstoque.previsto)}
          icone={<CircleDollarSign size={16} />}
        />
        <KpiCard
          titulo="Margem média esperada"
          valor={formatarPercentual(kpisEstoque.margemMedia, 1)}
          icone={<Gauge size={16} />}
        />
      </section>

      {totalGeral === 0 ? (
        <EstadoVazio
          onAdicionar={abrirCadastro}
          onRestaurar={() => setConfirmRestaurarAberto(true)}
        />
      ) : (
        <>
          {/* Barra: busca + toggle visualização */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por placa ou modelo..."
                className="input pl-9"
                aria-label="Buscar veículos"
              />
            </div>
            <div
              role="tablist"
              aria-label="Alternar visualização"
              className="inline-flex overflow-hidden rounded-lg border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
            >
              <button
                role="tab"
                aria-selected={visao === 'cards'}
                onClick={() => setVisao('cards')}
                className={[
                  'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
                  visao === 'cards'
                    ? 'bg-primary/15 text-primary'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <LayoutGrid size={14} /> Cards
              </button>
              <button
                role="tab"
                aria-selected={visao === 'tabela'}
                onClick={() => setVisao('tabela')}
                className={[
                  'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
                  visao === 'tabela'
                    ? 'bg-primary/15 text-primary'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
                ].join(' ')}
              >
                <TableIcon size={14} /> Tabela
              </button>
            </div>
          </section>

          {/* Filtros */}
          <VeiculoFiltros
            filtros={filtros}
            onChange={setFiltros}
            marcasDisponiveis={marcasDisponiveis}
            totalResultados={veiculosFiltrados.length}
            onLimpar={() => setFiltros(filtrosVazios)}
          />

          {/* Contagem */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Mostrando{' '}
            <span className="tabular font-semibold">{totalFiltrado}</span> de{' '}
            <span className="tabular">{totalGeral}</span>{' '}
            {totalGeral === 1 ? 'veículo' : 'veículos'}.
          </p>

          {/* Conteúdo: duas seções sempre visíveis — Disponíveis e Vendidos */}
          {totalFiltrado === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-medium">Nenhum veículo encontrado.</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Ajuste a busca ou limpe os filtros para ver mais resultados.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <SecaoVeiculos
                titulo="Disponíveis no estoque"
                descricao="Em preparação, disponíveis e reservados"
                icone={<Package size={16} />}
                corIcone="bg-primary/15 text-primary"
                contagem={disponiveisFiltrados.length}
                resumoLabel="previsto de venda"
                resumoValor={formatarMoeda(valorPrevistoDisponiveis)}
                veiculos={disponiveisFiltrados}
                visao={visao}
                resumosPorId={resumosPorId}
                vendasPorVeiculoId={vendasPorVeiculoId}
                veiculosPorId={veiculosPorId}
                vendasOrigemTrocaPorId={vendasOrigemTrocaPorId}
                onEditar={abrirEdicao}
                onExcluir={setVeiculoExcluir}
                onRegistrarVenda={abrirRegistroVenda}
                onGerarAnuncio={setAnuncioVeiculo}
                mensagemVazia="Nenhum veículo disponível com os filtros atuais."
              />

              <SecaoVeiculos
                titulo="Vendidos"
                descricao="Histórico de negócios já concluídos"
                icone={<CheckCircle2 size={16} />}
                corIcone="bg-sky-500/15 text-sky-500"
                contagem={vendidosFiltrados.length}
                resumoLabel="receita total"
                resumoValor={formatarMoeda(receitaVendidos)}
                veiculos={vendidosFiltrados}
                visao={visao}
                resumosPorId={resumosPorId}
                vendasPorVeiculoId={vendasPorVeiculoId}
                veiculosPorId={veiculosPorId}
                vendasOrigemTrocaPorId={vendasOrigemTrocaPorId}
                onEditar={abrirEdicao}
                onExcluir={setVeiculoExcluir}
                onRegistrarVenda={abrirRegistroVenda}
                onGerarAnuncio={setAnuncioVeiculo}
                mensagemVazia="Nenhum veículo vendido com os filtros atuais."
                colapsavel
              />
            </div>
          )}
        </>
      )}

      {/* Modal cadastro/edição */}
      <VeiculoFormModal
        open={formAberto}
        veiculo={editando}
        onClose={fecharForm}
        onSubmit={salvarVeiculo}
      />

      {/* Confirmação de exclusão. Compras/vendas saem em cascata, mas as
          despesas vinculadas viram "gerais" para preservar o histórico
          financeiro (regra atualizada com o módulo Despesas). */}
      <Modal
        open={!!veiculoExcluir}
        title="Excluir veículo"
        description="O veículo e suas compras/vendas vinculadas serão removidos. As despesas vinculadas serão convertidas em despesas gerais (sem veículo) para preservar o histórico financeiro. Esta ação não pode ser desfeita."
        onClose={() => setVeiculoExcluir(undefined)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVeiculoExcluir(undefined)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              Excluir veículo
            </Button>
          </>
        }
      >
        {veiculoExcluir && (
          <p className="text-sm">
            Tem certeza que deseja excluir{' '}
            <span className="font-semibold">
              {veiculoExcluir.marca} {veiculoExcluir.modelo}
            </span>{' '}
            (<span className="tabular">{veiculoExcluir.placa}</span>)?
          </p>
        )}
      </Modal>

      {/* Registrar venda — reaproveita o modal completo do módulo Vendas,
          pré-preenchendo o veículo selecionado. */}
      <VendaFormModal
        open={!!vendaVeiculoId}
        vendas={vendas}
        veiculos={veiculos}
        veiculoIdInicial={vendaVeiculoId}
        onClose={() => setVendaVeiculoId(undefined)}
        onSubmit={salvarVendaDoCard}
      />

      <AnuncioVeiculoModal
        open={!!anuncioVeiculo}
        veiculo={anuncioVeiculo}
        nomeRevenda={nomeRevenda}
        onClose={() => setAnuncioVeiculo(undefined)}
      />

      {/* Confirmação: limpar tudo */}
      <Modal
        open={confirmLimparAberto}
        title="Limpar todos os dados"
        description="Esta ação remove TODOS os veículos, compras, vendas e despesas registrados. As configurações da revenda e o tema escolhido são preservados."
        onClose={() => setConfirmLimparAberto(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLimparAberto(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={executarLimparTudo}>
              Apagar tudo
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Use esta opção para começar do zero com dados reais — sem o estoque
          de exemplo carregado na primeira execução.
        </p>
      </Modal>

      {/* Confirmação: restaurar exemplo */}
      <Modal
        open={confirmRestaurarAberto}
        title="Restaurar dados de exemplo"
        description="Recarrega o estoque demonstrativo (5 veículos + compras + vendas + despesas), substituindo o que houver hoje."
        onClose={() => setConfirmRestaurarAberto(false)}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmRestaurarAberto(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={executarRestaurar}>
              Restaurar exemplo
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Os dados atuais (incluindo veículos que você cadastrou) serão
          substituídos pelo conjunto de exemplo da seed.
        </p>
      </Modal>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Seção de veículos (Disponíveis ou Vendidos) — cabeçalho com contagem e
// resumo financeiro, seguido de cards ou tabela conforme a visão escolhida.
// -----------------------------------------------------------------------------
function SecaoVeiculos({
  titulo,
  descricao,
  icone,
  corIcone,
  contagem,
  resumoLabel,
  resumoValor,
  veiculos,
  visao,
  resumosPorId,
  vendasPorVeiculoId,
  veiculosPorId,
  vendasOrigemTrocaPorId,
  onEditar,
  onExcluir,
  onRegistrarVenda,
  onGerarAnuncio,
  mensagemVazia,
  colapsavel = false,
}: {
  titulo: string
  descricao: string
  icone: ReactNode
  corIcone: string
  contagem: number
  resumoLabel: string
  resumoValor: string
  veiculos: Veiculo[]
  visao: Visao
  resumosPorId: Record<string, ResumoFinanceiroVeiculo>
  vendasPorVeiculoId: Record<string, Venda | undefined>
  veiculosPorId: Record<string, Veiculo | undefined>
  vendasOrigemTrocaPorId: Record<string, Venda | undefined>
  onEditar: (v: Veiculo) => void
  onExcluir: (v: Veiculo) => void
  onRegistrarVenda: (v: Veiculo) => void
  onGerarAnuncio: (v: Veiculo) => void
  mensagemVazia: string
  colapsavel?: boolean
}) {
  const [aberto, setAberto] = useState(true)
  const mostrarConteudo = !colapsavel || aberto

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-3 dark:border-border-dark">
        <button
          type="button"
          onClick={() => colapsavel && setAberto((v) => !v)}
          className={[
            'flex items-center gap-3 text-left',
            colapsavel ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
          aria-expanded={colapsavel ? aberto : undefined}
        >
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${corIcone}`}
          >
            {icone}
          </span>
          <span>
            <span className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{titulo}</h2>
              <span className="badge bg-zinc-500/15 text-zinc-600 dark:text-zinc-300">
                {contagem}
              </span>
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {descricao}
            </span>
          </span>
          {colapsavel && (
            <ChevronDown
              size={16}
              className={[
                'ml-1 shrink-0 text-zinc-400 transition-transform',
                aberto ? 'rotate-180' : '',
              ].join(' ')}
            />
          )}
        </button>

        {contagem > 0 && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {resumoLabel}
            </p>
            <p className="tabular text-sm font-semibold">{resumoValor}</p>
          </div>
        )}
      </div>

      {mostrarConteudo &&
        (contagem === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mensagemVazia}
            </p>
          </div>
        ) : visao === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {veiculos.map((v) => (
              <VeiculoCard
                key={v.id}
                veiculo={v}
                resumo={resumosPorId[v.id]}
                venda={vendasPorVeiculoId[v.id]}
                veiculosPorId={veiculosPorId}
                vendaOrigemTroca={vendasOrigemTrocaPorId[v.id]}
                onEditar={() => onEditar(v)}
                onExcluir={() => onExcluir(v)}
                onRegistrarVenda={() => onRegistrarVenda(v)}
                onGerarAnuncio={() => onGerarAnuncio(v)}
              />
            ))}
          </div>
        ) : (
          <VeiculoTable
            veiculos={veiculos}
            resumosPorId={resumosPorId}
            vendasPorVeiculoId={vendasPorVeiculoId}
            veiculosPorId={veiculosPorId}
            vendasOrigemTrocaPorId={vendasOrigemTrocaPorId}
            onEditar={onEditar}
            onExcluir={onExcluir}
            onRegistrarVenda={onRegistrarVenda}
            onGerarAnuncio={onGerarAnuncio}
          />
        ))}
    </section>
  )
}

// -----------------------------------------------------------------------------
// Estado vazio amigável.
// -----------------------------------------------------------------------------
function EstadoVazio({
  onAdicionar,
  onRestaurar,
}: {
  onAdicionar: () => void
  onRestaurar: () => void
}) {
  return (
    <section className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Car size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Nenhum veículo no estoque
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Cadastre o primeiro carro real para começar. Tudo que você adicionar
          aqui aparece automaticamente no Dashboard — sem mocks.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={onAdicionar}
        >
          Cadastrar primeiro veículo
        </Button>
        <Button
          variant="ghost"
          leftIcon={<RefreshCw size={14} />}
          onClick={onRestaurar}
        >
          Carregar exemplo
        </Button>
      </div>
    </section>
  )
}
