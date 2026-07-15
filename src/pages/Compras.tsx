import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, ShoppingBag } from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/useToast'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatPbError } from '@/lib/pbApi'
import {
  somarCompras,
  ticketMedioCompras,
} from '@/utils/calculos'
import type { Compra, Veiculo } from '@/types'

import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { CompraTable } from '@/components/CompraTable'
import { CompraCard } from '@/components/CompraCard'
import { CompraFormModal } from '@/components/CompraFormModal'
import {
  CompraFiltros,
  type FiltrosCompras,
} from '@/components/CompraFiltros'

// Valores iniciais dos filtros — vazios significam "sem filtro aplicado".
const filtrosVazios: FiltrosCompras = {
  dataInicio: '',
  dataFim: '',
  formasPagamento: [],
  origens: [],
}

// Hook simples de debounce — usado pela busca por placa/vendedor.
function useDebounce<T>(valor: T, delayMs = 250): T {
  const [val, setVal] = useState(valor)
  useEffect(() => {
    const t = window.setTimeout(() => setVal(valor), delayMs)
    return () => window.clearTimeout(t)
  }, [valor, delayMs])
  return val
}

export default function Compras() {
  const compras = useStore((s) => s.compras)
  const veiculos = useStore((s) => s.veiculos)
  const addCompra = useStore((s) => s.addCompra)
  const updateCompra = useStore((s) => s.updateCompra)
  const deleteCompra = useStore((s) => s.deleteCompra)
  const toast = useToast()
  const salvarServidor = useSalvarServidor()

  // UI state ---------------------------------------------------------------
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 250)
  const [filtros, setFiltros] = useState<FiltrosCompras>(filtrosVazios)

  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Compra | undefined>(undefined)

  const [compraExcluir, setCompraExcluir] = useState<Compra | undefined>(
    undefined,
  )

  // Mapa veiculo_id -> Veiculo para evitar find() em cada linha. ------------
  const veiculosPorId = useMemo(() => {
    const map: Record<string, Veiculo> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  // Filtragem completa (busca + filtros). ----------------------------------
  const comprasFiltradas = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase()
    const dataIni = filtros.dataInicio || null
    const dataFim = filtros.dataFim || null

    return compras.filter((c) => {
      // Busca por placa OU vendedor.
      if (termo) {
        const placa = veiculosPorId[c.veiculo_id]?.placa ?? ''
        const alvo = `${placa} ${c.vendedor_nome}`.toLowerCase()
        if (!alvo.includes(termo)) return false
      }

      if (
        filtros.formasPagamento.length > 0 &&
        !filtros.formasPagamento.includes(
          c.forma_pagamento as (typeof filtros.formasPagamento)[number],
        )
      ) {
        return false
      }

      if (
        filtros.origens.length > 0 &&
        !filtros.origens.includes(
          c.origem as (typeof filtros.origens)[number],
        )
      ) {
        return false
      }

      // Comparação ISO yyyy-MM-dd como string funciona lexicograficamente.
      if (dataIni && c.data < dataIni) return false
      if (dataFim && c.data > dataFim) return false
      return true
    })
  }, [compras, veiculosPorId, buscaDebounced, filtros])

  // Compras ordenadas por data (mais recente primeiro).
  const comprasOrdenadas = useMemo(
    () =>
      [...comprasFiltradas].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [comprasFiltradas],
  )

  // Agregados do filtro corrente — alimentam rodapé da tabela.
  const totalValorFiltrado = useMemo(
    () => somarCompras(comprasOrdenadas),
    [comprasOrdenadas],
  )
  const ticketMedioFiltrado = useMemo(
    () => ticketMedioCompras(comprasOrdenadas),
    [comprasOrdenadas],
  )

  // Handlers ---------------------------------------------------------------
  function abrirCadastro() {
    if (veiculos.length === 0) {
      toast.warning(
        'Cadastre um veículo primeiro',
        'A compra precisa referenciar um veículo do estoque.',
      )
      return
    }
    setEditando(undefined)
    setFormAberto(true)
  }
  function abrirEdicao(c: Compra) {
    setEditando(c)
    setFormAberto(true)
  }
  function fecharForm() {
    setFormAberto(false)
    setEditando(undefined)
  }
  async function salvarCompra(c: Compra) {
    if (editando) {
      const ok = await salvarServidor(
        () => updateCompra(editando.id, c),
        'Compra atualizada',
      )
      if (ok) fecharForm()
    } else {
      const ok = await salvarServidor(
        () => addCompra(c),
        'Compra registrada',
      )
      if (ok) fecharForm()
    }
  }

  async function confirmarExclusao() {
    if (!compraExcluir) return
    try {
      await deleteCompra(compraExcluir.id)
      toast.success('Compra excluída', 'Salvo no servidor.')
      setCompraExcluir(undefined)
    } catch (err) {
      toast.error('Falha ao excluir no servidor', formatPbError(err))
    }
  }

  // Renderização -----------------------------------------------------------
  const totalGeral = compras.length
  const totalFiltrado = comprasOrdenadas.length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Histórico de aquisições — cada registro representa a entrada de um
            veículo no estoque.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={abrirCadastro}
        >
          Nova compra
        </Button>
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
                placeholder="Buscar por placa ou vendedor..."
                className="input pl-9"
                aria-label="Buscar compras"
              />
            </div>
          </section>

          {/* Filtros */}
          <CompraFiltros
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
            {totalGeral === 1 ? 'compra' : 'compras'}.
          </p>

          {/* Conteúdo: tabela em desktop, cards em mobile */}
          {totalFiltrado === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-medium">
                Nenhuma compra encontrada com os filtros atuais.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Ajuste a busca ou limpe os filtros para ver mais resultados.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop (md+) */}
              <div className="hidden md:block">
                <CompraTable
                  compras={comprasOrdenadas}
                  veiculosPorId={veiculosPorId}
                  totalValor={totalValorFiltrado}
                  ticketMedio={ticketMedioFiltrado}
                  onEditar={abrirEdicao}
                  onExcluir={(c) => setCompraExcluir(c)}
                />
              </div>

              {/* Mobile (<md) — cards empilhados + linha de totais */}
              <div className="space-y-3 md:hidden">
                {comprasOrdenadas.map((c) => (
                  <CompraCard
                    key={c.id}
                    compra={c}
                    veiculo={veiculosPorId[c.veiculo_id]}
                    onEditar={() => abrirEdicao(c)}
                    onExcluir={() => setCompraExcluir(c)}
                  />
                ))}
                <TotaisMobile
                  quantidade={totalFiltrado}
                  total={totalValorFiltrado}
                  ticketMedio={ticketMedioFiltrado}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Modal cadastro/edição */}
      <CompraFormModal
        open={formAberto}
        compra={editando}
        veiculos={veiculos}
        onClose={fecharForm}
        onSubmit={salvarCompra}
      />

      {/* Confirmação de exclusão */}
      <Modal
        open={!!compraExcluir}
        title="Excluir compra"
        description="O registro será removido do histórico. O veículo continua no estoque."
        onClose={() => setCompraExcluir(undefined)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCompraExcluir(undefined)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </>
        }
      >
        {compraExcluir && (
          <p className="text-sm">
            Tem certeza que deseja excluir esta compra de{' '}
            <span className="font-semibold">
              {compraExcluir.vendedor_nome || 'vendedor não informado'}
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
  quantidade,
  total,
  ticketMedio,
}: {
  quantidade: number
  total: number
  ticketMedio: number
}) {
  return (
    <div className="card flex flex-col gap-2 bg-zinc-50/60 p-4 dark:bg-white/[0.03]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Totais do filtro
      </p>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-500 dark:text-zinc-400">Compras</dt>
        <dd className="tabular text-right font-semibold">{quantidade}</dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Total pago</dt>
        <dd className="tabular text-right font-semibold">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(total)}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">Ticket médio</dt>
        <dd className="tabular text-right font-semibold">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(ticketMedio)}
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
        <ShoppingBag size={28} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Nenhuma compra registrada
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Registre a primeira aquisição para começar a acompanhar a origem dos
          veículos, formas de pagamento e ticket médio.
        </p>
      </div>
      <Button
        variant="primary"
        leftIcon={<Plus size={16} />}
        onClick={onAdicionar}
      >
        Registrar primeira compra
      </Button>
    </section>
  )
}
