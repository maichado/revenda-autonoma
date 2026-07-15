// Relatório de Vendas — totais, distribuição por forma de recebimento e lista.

import { useMemo } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CircleDollarSign, PiggyBank, Tags } from 'lucide-react'

import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import { calcularLucroVenda } from '@/utils/calculos'
import {
  calcularResumoFinanceiro,
  filtrarPorPeriodo,
  filtrarPorVeiculo,
  formatarDataBR,
  formatarMoedaBR,
  formatarPercentualBR,
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

export function RelatorioVendas({ estado, periodo, veiculoId }: Props) {
  const { veiculos, vendas, compras, despesas } = estado

  const vendasPeriodo = useMemo(() => {
    let lista = filtrarPorPeriodo(
      vendas,
      periodo.dataInicio,
      periodo.dataFim,
      (v) => v.data,
    )
    if (veiculoId) {
      lista = filtrarPorVeiculo(lista, veiculoId, (v) => v.veiculo_id)
    }
    return lista.sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [vendas, periodo, veiculoId])

  const resumo = useMemo(() => {
    const vendasBase = veiculoId
      ? vendas.filter((v) => v.veiculo_id === veiculoId)
      : vendas
    const comprasBase = veiculoId
      ? compras.filter((c) => c.veiculo_id === veiculoId)
      : compras
    const despesasBase = veiculoId
      ? despesas.filter((d) => d.veiculo_id === veiculoId)
      : despesas
    return calcularResumoFinanceiro(
      vendasBase,
      comprasBase,
      despesasBase,
      veiculos,
      periodo,
    )
  }, [vendas, compras, despesas, veiculos, periodo, veiculoId])

  const ticket =
    vendasPeriodo.length > 0 ? resumo.receita / vendasPeriodo.length : 0

  const distFormas = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of vendasPeriodo) {
      const k = v.forma_recebimento || '—'
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([forma, qtd]) => ({ forma, qtd }))
  }, [vendasPeriodo])

  const texto = useMemo(
    () => gerarTextoRelatorio('vendas', estado, periodo, veiculoId),
    [estado, periodo, veiculoId],
  )

  const veiculosPorId = useMemo(() => {
    const map: Record<string, (typeof veiculos)[number]> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  return (
    <RelatorioLayout
      titulo="Relatório de Vendas"
      periodoLabel={labelPeriodo(periodo)}
      descricao="Vendas do período — totais, lucro real e listagem."
      slug="vendas"
      texto={texto}
      visual={
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              titulo="Vendas"
              valor={String(vendasPeriodo.length)}
              icone={<Tags size={16} />}
            />
            <KpiCard
              titulo="Receita"
              valor={formatarMoedaBR(resumo.receita)}
              icone={<CircleDollarSign size={16} />}
            />
            <KpiCard
              titulo="Lucro"
              valor={formatarMoedaBR(resumo.lucro)}
              icone={<PiggyBank size={16} />}
            />
            <KpiCard
              titulo="Ticket médio"
              valor={formatarMoedaBR(ticket)}
              icone={<CircleDollarSign size={16} />}
            />
          </section>

          {distFormas.length > 0 && (
            <section className="card p-4 sm:p-5">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">
                  Distribuição da receita por forma de recebimento
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Quantidade de vendas
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
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Placa</th>
                  <th className="px-3 py-2 font-medium">Comprador</th>
                  <th className="px-3 py-2 font-medium">Forma</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-right font-medium">Lucro</th>
                  <th className="px-3 py-2 text-right font-medium">Margem</th>
                </tr>
              </thead>
              <tbody className="table-row-zebra table-row-hover">
                {vendasPeriodo.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Nenhuma venda registrada no período.
                    </td>
                  </tr>
                ) : (
                  vendasPeriodo.slice(0, MAX_LINHAS_TABELA).map((v) => {
                    const veic = veiculosPorId[v.veiculo_id]
                    const lucro = calcularLucroVenda(v, veic, despesas)
                    const margem =
                      v.valor_venda > 0 ? (lucro / v.valor_venda) * 100 : 0
                    const corLucro =
                      lucro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    return (
                      <tr
                        key={v.id}
                        className="border-t border-border-light dark:border-border-dark"
                      >
                        <td className="tabular px-3 py-2">
                          {formatarDataBR(v.data)}
                        </td>
                        <td className="tabular px-3 py-2 font-semibold">
                          {veic?.placa ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          {v.comprador_nome || '—'}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {v.forma_recebimento || '—'}
                        </td>
                        <td className="tabular px-3 py-2 text-right font-semibold">
                          {formatarMoedaBR(v.valor_venda)}
                        </td>
                        <td
                          className={[
                            'tabular px-3 py-2 text-right font-semibold',
                            corLucro,
                          ].join(' ')}
                        >
                          {formatarMoedaBR(lucro)}
                        </td>
                        <td
                          className={[
                            'tabular px-3 py-2 text-right',
                            corLucro,
                          ].join(' ')}
                        >
                          {formatarPercentualBR(margem, 1)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {vendasPeriodo.length > MAX_LINHAS_TABELA && (
              <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                Exibindo {MAX_LINHAS_TABELA} de {vendasPeriodo.length} vendas.
              </p>
            )}
          </section>
        </div>
      }
    />
  )
}
