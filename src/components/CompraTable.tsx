import { Pencil, Trash2 } from 'lucide-react'
import type { Compra, Veiculo } from '@/types'
import { ORIGENS_COMPRA, FORMAS_PAGAMENTO_COMPRA } from '@/types'
import { Badge } from './Badge'
import { formatarDataCurta, formatarMoeda } from '@/utils/formatadores'

interface Props {
  compras: Compra[]
  veiculosPorId: Record<string, Veiculo>
  totalValor: number
  ticketMedio: number
  onEditar: (c: Compra) => void
  onExcluir: (c: Compra) => void
}

// -----------------------------------------------------------------------------
// Helpers de exibição (tons das badges).
// -----------------------------------------------------------------------------

const origensSet = new Set<string>(ORIGENS_COMPRA)
const formasSet = new Set<string>(FORMAS_PAGAMENTO_COMPRA)

// Mapeamento de cor para origem — alinhado ao filtro.
function classesOrigem(origem: string): string {
  switch (origem) {
    case 'leilão':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    case 'particular':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    case 'loja':
      return 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
    case 'pré-leilão':
      return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
    default:
      // Compras legadas (seed) podem ter origem freeform — tom neutro.
      return 'bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200'
  }
}

function classesForma(forma: string): string {
  switch (forma) {
    case 'dinheiro':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    case 'pix':
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
    case 'financiado':
      return 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
    case 'consórcio':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    default:
      // Formas legadas (transferência, cartão, etc.) — neutro.
      return 'bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200'
  }
}

export function BadgeOrigem({ origem }: { origem: string }) {
  const legacy = !origensSet.has(origem)
  return (
    <span
      className={['badge capitalize', classesOrigem(origem)].join(' ')}
      title={legacy ? 'Valor legado — fora das opções padrão.' : undefined}
    >
      {origem || '—'}
    </span>
  )
}

export function BadgeForma({ forma }: { forma: string }) {
  const legacy = !formasSet.has(forma)
  return (
    <span
      className={['badge capitalize', classesForma(forma)].join(' ')}
      title={legacy ? 'Forma legada — fora das opções padrão.' : undefined}
    >
      {forma || '—'}
    </span>
  )
}

// -----------------------------------------------------------------------------
// Tabela
// -----------------------------------------------------------------------------

export function CompraTable({
  compras,
  veiculosPorId,
  totalValor,
  ticketMedio,
  onEditar,
  onExcluir,
}: Props) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 py-3 font-medium">Data</th>
            <th className="px-3 py-3 font-medium">Veículo</th>
            <th className="px-3 py-3 text-right font-medium">Valor pago</th>
            <th className="px-3 py-3 font-medium">Forma</th>
            <th className="px-3 py-3 font-medium">Vendedor</th>
            <th className="px-3 py-3 font-medium">Origem</th>
            <th className="px-3 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="table-row-zebra table-row-hover">
          {compras.map((c) => {
            const veic = veiculosPorId[c.veiculo_id]
            return (
              <tr
                key={c.id}
                className="border-t border-border-light dark:border-border-dark"
              >
                <td className="tabular px-3 py-3 whitespace-nowrap">
                  {formatarDataCurta(c.data)}
                </td>
                <td className="px-3 py-3">
                  {veic ? (
                    <>
                      <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                        {veic.placa}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {veic.marca} {veic.modelo}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs italic text-zinc-400">
                      veículo removido
                    </span>
                  )}
                </td>
                <td className="tabular px-3 py-3 text-right font-semibold">
                  {formatarMoeda(c.valor_pago)}
                </td>
                <td className="px-3 py-3">
                  <BadgeForma forma={c.forma_pagamento} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{c.vendedor_nome || '—'}</p>
                  {c.vendedor_contato && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.vendedor_contato}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <BadgeOrigem origem={c.origem} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(c)}
                      title="Editar"
                      aria-label="Editar compra"
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcluir(c)}
                      title="Excluir"
                      aria-label="Excluir compra"
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* Rodapé com totais agregados (sempre reflete o filtro corrente). */}
        <tfoot>
          <tr className="border-t-2 border-border-light bg-zinc-50/60 dark:border-border-dark dark:bg-white/[0.03]">
            <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Totais
            </td>
            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="tabular font-semibold">{compras.length}</span>{' '}
              {compras.length === 1 ? 'compra' : 'compras'}
            </td>
            <td className="tabular px-3 py-3 text-right text-sm font-semibold">
              {formatarMoeda(totalValor)}
            </td>
            <td className="px-3 py-3" colSpan={3}>
              <Badge tone="primary" className="tabular">
                Ticket médio · {formatarMoeda(ticketMedio)}
              </Badge>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
