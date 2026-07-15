import { Pencil, Trash2 } from 'lucide-react'
import type { Despesa, Veiculo, Venda } from '@/types'
import { FORMAS_RECEBIMENTO_VENDA } from '@/types'
import {
  formatarDataCurta,
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import {
  calcularLucroVenda,
  calcularROIVenda,
} from '@/utils/calculos'

interface Props {
  vendas: Venda[]
  veiculosPorId: Record<string, Veiculo>
  despesas: Despesa[]
  /** Totais agregados (já calculados na página com base no filtro). */
  totais: {
    quantidade: number
    receita: number
    lucroTotal: number
    ticketMedio: number
  }
  onEditar: (v: Venda) => void
  onExcluir: (v: Venda) => void
}

// -----------------------------------------------------------------------------
// Badge da forma de recebimento — paleta alinhada às pills do filtro.
// -----------------------------------------------------------------------------

const formasSet = new Set<string>(FORMAS_RECEBIMENTO_VENDA)

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
      // Formas legadas (transferência, cartão, financiamento, etc.) — neutro.
      return 'bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200'
  }
}

export function BadgeFormaRecebimento({ forma }: { forma: string }) {
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
// Formatação amigável de parcelas: "À vista" quando não informado, "Nx" caso
// contrário. (Spec.)
// -----------------------------------------------------------------------------
export function formatarParcelas(parcelas?: number): string {
  if (!parcelas || parcelas <= 1) return 'À vista'
  return `${parcelas}x`
}

// -----------------------------------------------------------------------------
// Tabela principal
// -----------------------------------------------------------------------------

export function VendaTable({
  vendas,
  veiculosPorId,
  despesas,
  totais,
  onEditar,
  onExcluir,
}: Props) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 py-3 font-medium">Data</th>
            <th className="px-3 py-3 font-medium">Veículo</th>
            <th className="px-3 py-3 font-medium">Comprador</th>
            <th className="px-3 py-3 text-right font-medium">Valor</th>
            <th className="px-3 py-3 font-medium">Recebimento</th>
            <th className="px-3 py-3 font-medium">Parcelas</th>
            <th className="px-3 py-3 text-right font-medium">Lucro</th>
            <th className="px-3 py-3 text-right font-medium">ROI</th>
            <th className="px-3 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="table-row-zebra table-row-hover">
          {vendas.map((venda) => {
            const veic = veiculosPorId[venda.veiculo_id]
            const lucro = calcularLucroVenda(venda, veic, despesas)
            const roi = calcularROIVenda(venda, veic, despesas)
            const corValor =
              lucro >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'

            return (
              <tr
                key={venda.id}
                className="border-t border-border-light dark:border-border-dark"
              >
                <td className="tabular px-3 py-3 whitespace-nowrap">
                  {formatarDataCurta(venda.data)}
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
                <td className="px-3 py-3">
                  <p className="font-medium">{venda.comprador_nome || '—'}</p>
                  {venda.comprador_contato && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {venda.comprador_contato}
                    </p>
                  )}
                </td>
                <td className="tabular px-3 py-3 text-right font-semibold">
                  {formatarMoeda(venda.valor_venda)}
                </td>
                <td className="px-3 py-3">
                  <BadgeFormaRecebimento forma={venda.forma_recebimento} />
                </td>
                <td className="tabular px-3 py-3 text-xs">
                  {formatarParcelas(venda.parcelas)}
                </td>
                <td
                  className={[
                    'tabular px-3 py-3 text-right font-semibold',
                    corValor,
                  ].join(' ')}
                  title={
                    veic
                      ? 'lucro = valor venda − valor compra − despesas vinculadas'
                      : 'Veículo associado foi removido — não é possível calcular.'
                  }
                >
                  {formatarMoeda(lucro)}
                </td>
                <td
                  className={[
                    'tabular px-3 py-3 text-right font-semibold',
                    corValor,
                  ].join(' ')}
                >
                  {formatarPercentual(roi, 1)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(venda)}
                      title="Editar"
                      aria-label="Editar venda"
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcluir(venda)}
                      title="Excluir"
                      aria-label="Excluir venda"
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

        {/* Rodapé com totais agregados (reflete sempre o filtro corrente). */}
        <tfoot>
          <tr className="border-t-2 border-border-light bg-zinc-50/60 text-sm dark:border-border-dark dark:bg-white/[0.03]">
            <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Totais
            </td>
            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="tabular font-semibold">
                {totais.quantidade}
              </span>{' '}
              {totais.quantidade === 1 ? 'venda' : 'vendas'}
            </td>
            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">
              Ticket médio:{' '}
              <span className="tabular font-semibold text-zinc-700 dark:text-zinc-200">
                {formatarMoeda(totais.ticketMedio)}
              </span>
            </td>
            <td className="tabular px-3 py-3 text-right font-semibold">
              {formatarMoeda(totais.receita)}
            </td>
            <td className="px-3 py-3" colSpan={2} />
            <td
              className={[
                'tabular px-3 py-3 text-right font-semibold',
                totais.lucroTotal >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              ].join(' ')}
              colSpan={2}
            >
              {formatarMoeda(totais.lucroTotal)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
