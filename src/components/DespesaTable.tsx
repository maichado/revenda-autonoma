// Tabela de despesas (visão desktop ≥ md). Colunas:
//   Data · Tipo (badge colorida) · Descrição · Veículo (placa+modelo ou "—")
//   Valor · Forma · Status (toggle Pago / Em aberto) · Ações
// Rodapé com totais agregados (quantidade, total, total pago, total em aberto).

import { Check, Link2, Pencil, Trash2 } from 'lucide-react'
import type { Despesa, Veiculo } from '@/types'
import { rotuloExibicaoPagoPor } from '@/utils/despesaOrigem'
import { TIPO_META } from './despesaMeta'
import { formatarDataCurta, formatarMoeda } from '@/utils/formatadores'

export interface TotaisDespesas {
  quantidade: number
  totalGeral: number
  totalPago: number
  totalEmAberto: number
}

interface Props {
  despesas: Despesa[]
  veiculosPorId: Record<string, Veiculo>
  nomeRevenda: string
  socios: string[]
  totais: TotaisDespesas
  onEditar: (d: Despesa) => void
  onExcluir: (d: Despesa) => void
  onTogglePago: (d: Despesa) => void
}

export function DespesaTable({
  despesas,
  veiculosPorId,
  nomeRevenda,
  socios,
  totais,
  onEditar,
  onExcluir,
  onTogglePago,
}: Props) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[1040px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 py-3 font-medium">Data</th>
            <th className="px-3 py-3 font-medium">Tipo</th>
            <th className="px-3 py-3 font-medium">Descrição</th>
            <th className="px-3 py-3 font-medium">Veículo</th>
            <th className="px-3 py-3 text-right font-medium">Valor</th>
            <th className="px-3 py-3 font-medium">Forma</th>
            <th className="px-3 py-3 font-medium">Origem</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="table-row-zebra table-row-hover">
          {despesas.map((d) => {
            const veiculo = d.veiculo_id ? veiculosPorId[d.veiculo_id] : null
            const meta = TIPO_META[d.tipo]
            const Icone = meta?.Icone
            return (
              <tr
                key={d.id}
                className="border-t border-border-light dark:border-border-dark"
              >
                <td className="tabular whitespace-nowrap px-3 py-3 text-zinc-500 dark:text-zinc-400">
                  {formatarDataCurta(d.data)}
                </td>
                <td className="px-3 py-3">
                  <span className={['badge', meta?.badge ?? ''].join(' ')}>
                    {Icone ? <Icone size={11} /> : null}
                    {meta?.label ?? d.tipo}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="line-clamp-1">{d.descricao}</span>
                </td>
                <td className="px-3 py-3">
                  {veiculo ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Link2 size={12} className="text-zinc-400" />
                      <span className="tabular font-semibold">
                        {veiculo.placa}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {veiculo.marca} {veiculo.modelo}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="tabular px-3 py-3 text-right font-semibold">
                  {formatarMoeda(d.valor)}
                </td>
                <td className="px-3 py-3 text-xs capitalize text-zinc-500 dark:text-zinc-400">
                  {d.forma_pagamento}
                </td>
                <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                  {rotuloExibicaoPagoPor(d.pago_por, nomeRevenda, socios)}
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onTogglePago(d)}
                    aria-label={
                      d.pago ? 'Marcar como em aberto' : 'Marcar como pago'
                    }
                    title={
                      d.pago
                        ? 'Clique para marcar como em aberto'
                        : 'Clique para marcar como pago'
                    }
                    className={[
                      'btn-press inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      d.pago
                        ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400',
                    ].join(' ')}
                  >
                    {d.pago ? <Check size={12} /> : null}
                    {d.pago ? 'Pago' : 'Em aberto'}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(d)}
                      title="Editar"
                      aria-label={`Editar despesa ${d.descricao}`}
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcluir(d)}
                      title="Excluir"
                      aria-label={`Excluir despesa ${d.descricao}`}
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

        {/* Rodapé com totais — reflete o filtro corrente. */}
        <tfoot>
          <tr className="border-t-2 border-border-light bg-zinc-50/60 text-sm dark:border-border-dark dark:bg-white/[0.03]">
            <td
              className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              colSpan={3}
            >
              Totais ·{' '}
              <span className="tabular text-zinc-700 dark:text-zinc-200">
                {totais.quantidade}
              </span>{' '}
              {totais.quantidade === 1 ? 'despesa' : 'despesas'}
            </td>
            <td className="px-3 py-3 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
              Total
            </td>
            <td className="tabular px-3 py-3 text-right font-semibold">
              {formatarMoeda(totais.totalGeral)}
            </td>
            <td className="px-3 py-3 text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400">
                Pago: {formatarMoeda(totais.totalPago)}
              </span>
            </td>
            <td className="px-3 py-3" />
            <td
              className="px-3 py-3 text-[11px]"
              colSpan={2}
            >
              <span className="text-amber-600 dark:text-amber-400">
                Em aberto: {formatarMoeda(totais.totalEmAberto)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
