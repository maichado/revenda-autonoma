// Relatório de Compras — totais, distribuição por forma de pagamento e lista.

import { useMemo } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { ShoppingBag, Wallet } from 'lucide-react'

import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import {
  filtrarPorPeriodo,
  filtrarPorVeiculo,
  formatarDataBR,
  formatarMoedaBR,
  labelPeriodo,
  type Periodo,
} from '@/utils/relatorios'
import {
  gerarTextoRelatorio,
  type EstadoRelatorio,
} from '@/utils/relatoriosTexto'

interface Props {
  estado: EstadoRelatorio
  periodo: Periodo
  veiculoId?: string
}

const PALETA = ['#C8A96E', '#22C55E', '#0EA5E9', '#F59E0B', '#A855F7', '#EF4444']
const MAX_LINHAS_TABELA = 30

export function RelatorioCompras({ estado, periodo, veiculoId }: Props) {
  const { veiculos, compras } = estado

  const comprasPeriodo = useMemo(() => {
    let lista = filtrarPorPeriodo(
      compras,
      periodo.dataInicio,
      periodo.dataFim,
      (c) => c.data,
    )
    if (veiculoId) {
      lista = filtrarPorVeiculo(lista, veiculoId, (c) => c.veiculo_id)
    }
    return lista.sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [compras, periodo, veiculoId])

  const total = comprasPeriodo.reduce((acc, c) => acc + c.valor_pago, 0)
  const ticket = comprasPeriodo.length > 0 ? total / comprasPeriodo.length : 0

  const distFormas = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of comprasPeriodo) {
      const k = c.forma_pagamento || '—'
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([forma, qtd]) => ({ forma, qtd }))
  }, [comprasPeriodo])

  const texto = useMemo(
    () => gerarTextoRelatorio('compras', estado, periodo, veiculoId),
    [estado, periodo, veiculoId],
  )

  const veiculosPorId = useMemo(() => {
    const map: Record<string, { placa: string; modelo: string; marca: string }> =
      {}
    for (const v of veiculos)
      map[v.id] = { placa: v.placa, modelo: v.modelo, marca: v.marca }
    return map
  }, [veiculos])

  return (
    <RelatorioLayout
      titulo="Relatório de Compras"
      periodoLabel={labelPeriodo(periodo)}
      descricao="Aquisições do período — totais, ticket médio e listagem."
      slug="compras"
      texto={texto}
      visual={
        <div className="space-y-4">
          <section className="grid grid-cols-3 gap-3">
            <KpiCard
              titulo="Compras"
              valor={String(comprasPeriodo.length)}
              icone={<ShoppingBag size={16} />}
            />
            <KpiCard
              titulo="Total pago"
              valor={formatarMoedaBR(total)}
              icone={<Wallet size={16} />}
            />
            <KpiCard
              titulo="Ticket médio"
              valor={formatarMoedaBR(ticket)}
              icone={<Wallet size={16} />}
            />
          </section>

          {distFormas.length > 0 && (
            <section className="card p-4 sm:p-5">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">
                  Distribuição por forma de pagamento
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Quantidade de compras
                </p>
              </div>
              <div className="grid items-center gap-3 sm:grid-cols-2">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(v: any, n: any) => [`${v}`, String(n)]}
                        contentStyle={{
                          borderRadius: 8,
                          fontSize: 12,
                          border: '1px solid rgba(120,120,120,0.2)',
                        }}
                      />
                      <Pie
                        data={distFormas}
                        dataKey="qtd"
                        nameKey="forma"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {distFormas.map((d, i) => (
                          <Cell
                            key={d.forma}
                            fill={PALETA[i % PALETA.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1 text-xs">
                  {distFormas.map((d, i) => (
                    <li
                      key={d.forma}
                      className="flex items-center justify-between gap-2 rounded-md border border-border-light px-2 py-1 dark:border-border-dark"
                    >
                      <span className="inline-flex items-center gap-2 capitalize">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: PALETA[i % PALETA.length] }}
                        />
                        {d.forma}
                      </span>
                      <span className="tabular font-semibold">{d.qtd}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="card overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Placa</th>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium">Forma</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="table-row-zebra table-row-hover">
                {comprasPeriodo.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Nenhuma compra registrada no período.
                    </td>
                  </tr>
                ) : (
                  comprasPeriodo.slice(0, MAX_LINHAS_TABELA).map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border-light dark:border-border-dark"
                    >
                      <td className="tabular px-3 py-2">
                        {formatarDataBR(c.data)}
                      </td>
                      <td className="tabular px-3 py-2 font-semibold">
                        {veiculosPorId[c.veiculo_id]?.placa ?? '—'}
                      </td>
                      <td className="px-3 py-2">{c.vendedor_nome || '—'}</td>
                      <td className="px-3 py-2 capitalize">
                        {c.forma_pagamento || '—'}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        {c.origem || '—'}
                      </td>
                      <td className="tabular px-3 py-2 text-right font-semibold">
                        {formatarMoedaBR(c.valor_pago)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {comprasPeriodo.length > MAX_LINHAS_TABELA && (
              <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                Exibindo {MAX_LINHAS_TABELA} de {comprasPeriodo.length}{' '}
                compras.
              </p>
            )}
          </section>
        </div>
      }
    />
  )
}
