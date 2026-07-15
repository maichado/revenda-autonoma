// Relatório de Veículos / Estoque — foca no inventário do período.
//
// Visual:
//   • 3 KPIs: estoque atual, entrados no período, vendidos no período
//   • Mini-gráfico de barras: top 5 veículos mais lucrativos
//   • Tabela compacta dos veículos relevantes (limitada a 30 linhas; resto via
//     "+N veículos…" no texto WhatsApp)
// Texto WhatsApp: gerado por `gerarTextoRelatorioVeiculos`.

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Car, PackageOpen, TrendingDown, TrendingUp } from 'lucide-react'

import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import { totalEmEstoque } from '@/utils/calculos'
import {
  calcularLinhasVeiculos,
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

const COR_BARRA = '#C8A96E'
const MAX_LINHAS_TABELA = 30

export function RelatorioVeiculos({ estado, periodo, veiculoId }: Props) {
  const { veiculos, vendas, despesas } = estado

  const linhas = useMemo(() => {
    const todas = calcularLinhasVeiculos(veiculos, vendas, despesas, periodo)
    if (!veiculoId) return todas
    return todas.filter((l) => l.veiculo.id === veiculoId)
  }, [veiculos, vendas, despesas, periodo, veiculoId])

  const entradosPeriodo = useMemo(
    () =>
      veiculos.filter(
        (v) =>
          v.data_compra >= periodo.dataInicio &&
          v.data_compra <= periodo.dataFim,
      ).length,
    [veiculos, periodo],
  )

  const vendidosPeriodo = linhas.filter((l) => !!l.venda).length
  const estoqueAtual = totalEmEstoque(veiculos)

  const top5 = useMemo(
    () =>
      [...linhas]
        .filter((l) => !!l.venda)
        .sort((a, b) => b.lucro - a.lucro)
        .slice(0, 5)
        .map((l) => ({
          nome: l.veiculo.placa,
          lucro: l.lucro,
        })),
    [linhas],
  )

  const texto = useMemo(
    () => gerarTextoRelatorio('veiculos', estado, periodo, veiculoId),
    [estado, periodo, veiculoId],
  )

  return (
    <RelatorioLayout
      titulo="Relatório de Veículos / Estoque"
      periodoLabel={labelPeriodo(periodo)}
      descricao="Veículos relevantes ao período (entrados + vendidos)."
      slug="veiculos"
      texto={texto}
      visual={
        <div className="space-y-4">
          <section className="grid grid-cols-3 gap-3">
            <KpiCard
              titulo="Em estoque"
              valor={String(estoqueAtual)}
              icone={<PackageOpen size={16} />}
            />
            <KpiCard
              titulo="Entrados"
              valor={String(entradosPeriodo)}
              icone={<TrendingUp size={16} />}
            />
            <KpiCard
              titulo="Vendidos"
              valor={String(vendidosPeriodo)}
              icone={<TrendingDown size={16} />}
            />
          </section>

          {top5.length > 0 && (
            <section className="card p-4 sm:p-5">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">
                  Top 5 — lucro por veículo
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Apenas veículos vendidos no período
                </p>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5}
                    layout="vertical"
                    margin={{ top: 4, right: 10, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-white/[0.08]"
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-zinc-500 dark:text-zinc-400"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatarMoedaBR(Number(v))}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-zinc-500 dark:text-zinc-400"
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v: any) => formatarMoedaBR(Number(v))}
                      contentStyle={{
                        borderRadius: 8,
                        fontSize: 12,
                        border: '1px solid rgba(120,120,120,0.2)',
                      }}
                    />
                    <Bar
                      dataKey="lucro"
                      fill={COR_BARRA}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="card overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-3 py-2 font-medium">Placa</th>
                  <th className="px-3 py-2 font-medium">Veículo</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Compra</th>
                  <th className="px-3 py-2 text-right font-medium">Venda</th>
                  <th className="px-3 py-2 text-right font-medium">Lucro</th>
                  <th className="px-3 py-2 text-right font-medium">Dias</th>
                </tr>
              </thead>
              <tbody className="table-row-zebra table-row-hover">
                {linhas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      Nenhum veículo movimentado no período.
                    </td>
                  </tr>
                ) : (
                  linhas.slice(0, MAX_LINHAS_TABELA).map((l) => {
                    const corLucro = !l.venda
                      ? 'text-zinc-400'
                      : l.lucro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    return (
                      <tr
                        key={l.veiculo.id}
                        className="border-t border-border-light dark:border-border-dark"
                      >
                        <td className="tabular px-3 py-2 font-semibold">
                          {l.veiculo.placa}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-xs">
                            {l.veiculo.marca} {l.veiculo.modelo}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {l.veiculo.ano} ·{' '}
                            {formatarDataBR(l.veiculo.data_compra)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs capitalize">
                          {l.venda ? 'vendido' : l.veiculo.status}
                        </td>
                        <td className="tabular px-3 py-2 text-right">
                          {formatarMoedaBR(l.compra)}
                        </td>
                        <td className="tabular px-3 py-2 text-right">
                          {l.venda ? formatarMoedaBR(l.venda_valor) : '—'}
                        </td>
                        <td
                          className={[
                            'tabular px-3 py-2 text-right font-semibold',
                            corLucro,
                          ].join(' ')}
                        >
                          {l.venda ? formatarMoedaBR(l.lucro) : '—'}
                          {l.venda && (
                            <span className="ml-1 text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                              ROI {formatarPercentualBR(l.roi, 0)}
                            </span>
                          )}
                        </td>
                        <td className="tabular px-3 py-2 text-right">
                          {l.diasEmEstoque}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {linhas.length > MAX_LINHAS_TABELA && (
              <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                Exibindo {MAX_LINHAS_TABELA} de {linhas.length} veículos.
              </p>
            )}
          </section>

          {linhas.length === 0 && estoqueAtual === 0 && (
            <div className="card flex items-center gap-3 p-4 text-sm text-zinc-500 dark:text-zinc-400">
              <Car size={16} className="text-primary" />
              Estoque vazio e sem movimentações no período.
            </div>
          )}
        </div>
      }
    />
  )
}
