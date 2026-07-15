// Relatório Geral — visão executiva consolidada do período.
//
// Visual:
//   • 4 KpiCards (Receita, Custos, Lucro, Margem) + 3 secundários (Compras, Despesas)
//   • Seção "Situação do Estoque" (sempre visível, independente do período)
//   • Seção "Vendas no Período" (com estado vazio quando zero)
//   • Mini-gráfico de barras Receita × Custos × Lucro do período
//   • Card de destaque do veículo mais lucrativo e indicadores rápidos
// Texto WhatsApp: gerado por `gerarTextoRelatorioGeral`.

import { useMemo } from 'react'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Award,
  CircleDollarSign,
  Clock,
  CreditCard,
  Gauge,
  Handshake,
  PackageOpen,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Wallet,
} from 'lucide-react'

import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import {
  calcularIndicadoresDestaque,
  calcularLinhasVeiculos,
  calcularResumoFinanceiro,
  calcularValorEstoque,
  formatarMoedaBR,
  formatarPercentualBR,
  labelPeriodo,
  type Periodo,
} from '@/utils/relatorios'
import {
  gerarTextoRelatorioGeral,
  type EstadoRelatorio,
} from '@/utils/relatoriosTexto'

interface Props {
  estado: EstadoRelatorio
  periodo: Periodo
}

const COR_RECEITA = '#C8A96E'
const COR_CUSTO = '#7E683E'
const COR_LUCRO = '#22C55E'
const COR_LUCRO_NEG = '#EF4444'

export function RelatorioGeral({ estado, periodo }: Props) {
  const { veiculos, vendas, compras, despesas } = estado

  const resumo = useMemo(
    () =>
      calcularResumoFinanceiro(vendas, compras, despesas, veiculos, periodo),
    [vendas, compras, despesas, veiculos, periodo],
  )

  const linhas = useMemo(
    () => calcularLinhasVeiculos(veiculos, vendas, despesas, periodo),
    [veiculos, vendas, despesas, periodo],
  )

  const indicadores = useMemo(
    () => calcularIndicadoresDestaque(linhas, vendas, compras, periodo),
    [linhas, vendas, compras, periodo],
  )

  const estoque = useMemo(
    () => calcularValorEstoque(veiculos, despesas),
    [veiculos, despesas],
  )

  const texto = useMemo(
    () => gerarTextoRelatorioGeral(estado, periodo),
    [estado, periodo],
  )

  const dadosBarra = [
    { nome: 'Receita', valor: resumo.receita, cor: COR_RECEITA },
    { nome: 'Custos', valor: resumo.custoTotal, cor: COR_CUSTO },
    {
      nome: 'Lucro',
      valor: resumo.lucro,
      cor: resumo.lucro >= 0 ? COR_LUCRO : COR_LUCRO_NEG,
    },
  ]

  return (
    <RelatorioLayout
      titulo="Relatório Geral"
      periodoLabel={labelPeriodo(periodo)}
      descricao="Visão executiva consolidada — ideal para enviar como resumo do período."
      slug="geral"
      texto={texto}
      habilitarPdf
      nomeRevenda={estado.configuracoes.nome_revenda || NOME_REVENDA_PADRAO}
      visual={
        <div className="space-y-4">
          {/* KPIs financeiros */}
          <div data-pdf-section="kpis" className="relatorio-kpi-grid space-y-3">
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              titulo="Receita"
              valor={formatarMoedaBR(resumo.receita)}
              icone={<CircleDollarSign size={16} />}
            />
            <KpiCard
              titulo="Custos"
              valor={formatarMoedaBR(resumo.custoTotal)}
              icone={<Wallet size={16} />}
            />
            <KpiCard
              titulo="Lucro líquido"
              valor={formatarMoedaBR(resumo.lucro)}
              icone={<PiggyBank size={16} />}
            />
            <KpiCard
              titulo="Margem média"
              valor={formatarPercentualBR(resumo.margem, 1)}
              icone={<Gauge size={16} />}
            />
          </section>

          {/* KPIs secundários */}
          <section className="grid grid-cols-2 gap-3">
            <MiniKpi
              titulo="Compras"
              valor={String(resumo.qtdCompras)}
              icone={<ShoppingBag size={14} />}
            />
            <MiniKpi
              titulo="Despesas"
              valor={String(resumo.qtdDespesas)}
              icone={<Receipt size={14} />}
            />
          </section>
          </div>

          {/* Situação do estoque — sempre visível */}
          <section data-pdf-section="estoque" className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <PackageOpen size={16} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Situação do Estoque</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Inventário atual — independente do período
                </p>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="min-w-0 overflow-hidden rounded-lg bg-zinc-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Veículos
                </p>
                <p className="kpi-valor tabular text-lg font-semibold md:text-xl">
                  {estoque.qtd}
                </p>
              </div>
              <div className="min-w-0 overflow-hidden rounded-lg bg-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Valor investido
                </p>
                <p
                  className="kpi-valor tabular text-lg font-semibold text-primary md:text-xl"
                  title={formatarMoedaBR(estoque.custoTotal)}
                >
                  {formatarMoedaBR(estoque.custoTotal)}
                </p>
              </div>
              {estoque.valorVendaPretendido > 0 && (
                <div className="col-span-2 min-w-0 overflow-hidden rounded-lg bg-zinc-50 p-3 sm:col-span-1 dark:bg-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Venda pretendida
                  </p>
                  <p
                    className="kpi-valor tabular text-lg font-semibold md:text-xl"
                    title={formatarMoedaBR(estoque.valorVendaPretendido)}
                  >
                    {formatarMoedaBR(estoque.valorVendaPretendido)}
                  </p>
                </div>
              )}
            </div>
            {estoque.veiculos.length > 0 ? (
              <div className="overflow-x-auto print-table">
                <table className="relatorio-pdf-tabela w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '35%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                      <th className="pb-2 pr-2 font-medium">Placa</th>
                      <th className="pb-2 pr-2 font-medium">Modelo</th>
                      <th className="pb-2 pr-2 font-medium">Status</th>
                      <th className="pb-2 text-right font-medium">Investido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoque.veiculos.map(({ veiculo, investido }) => (
                      <tr
                        key={veiculo.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-white/[0.06]"
                      >
                        <td className="truncate py-2 pr-2 font-medium" title={veiculo.placa}>
                          {veiculo.placa}
                        </td>
                        <td
                          className="truncate py-2 pr-2 text-zinc-600 dark:text-zinc-300"
                          title={`${veiculo.marca} ${veiculo.modelo} ${veiculo.ano}`}
                        >
                          {veiculo.marca} {veiculo.modelo} {veiculo.ano}
                        </td>
                        <td className="truncate py-2 pr-2 capitalize">{veiculo.status}</td>
                        <td
                          className="kpi-valor tabular py-2 text-right font-medium"
                          title={formatarMoedaBR(investido)}
                        >
                          {formatarMoedaBR(investido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum veículo em estoque no momento.
              </p>
            )}
          </section>

          {/* Vendas no período — sempre exibir */}
          <section data-pdf-section="vendas" className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Handshake size={16} className="text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Vendas no Período</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {labelPeriodo(periodo)}
                </p>
              </div>
            </div>
            {resumo.qtdVendas === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nenhuma venda registrada no período selecionado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="min-w-0 overflow-hidden rounded-lg bg-zinc-50 p-3 dark:bg-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Quantidade
                  </p>
                  <p className="kpi-valor tabular text-lg font-semibold md:text-xl">
                    {resumo.qtdVendas}
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-lg bg-zinc-50 p-3 dark:bg-white/[0.04]">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Receita
                  </p>
                  <p
                    className="kpi-valor tabular text-lg font-semibold md:text-xl"
                    title={formatarMoedaBR(resumo.receita)}
                  >
                    {formatarMoedaBR(resumo.receita)}
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Lucro
                  </p>
                  <p
                    className={`kpi-valor tabular text-lg font-semibold md:text-xl ${
                      resumo.lucro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500'
                    }`}
                    title={formatarMoedaBR(resumo.lucro)}
                  >
                    {formatarMoedaBR(resumo.lucro)}
                  </p>
                </div>
              </div>
            )}
            {resumo.temDivisao && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0 overflow-hidden rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Sua parte do lucro
                  </p>
                  <p
                    className="kpi-valor tabular text-lg font-semibold text-emerald-600 md:text-xl dark:text-emerald-400"
                    title={formatarMoedaBR(resumo.lucroMeu)}
                  >
                    {formatarMoedaBR(resumo.lucroMeu)}
                  </p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-lg bg-amber-500/10 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Parte do sócio (a meia)
                  </p>
                  <p
                    className="kpi-valor tabular text-lg font-semibold text-amber-600 md:text-xl dark:text-amber-400"
                    title={formatarMoedaBR(resumo.parteSocios)}
                  >
                    {formatarMoedaBR(resumo.parteSocios)}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Gráfico de barras do período */}
          <section data-pdf-section="grafico" className="card p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  Receita × Custos × Lucro
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No período selecionado
                </p>
              </div>
            </div>
            <div className="chart-pdf-fallback relatorio-pdf-tabela-fallback hidden">
              <table className="relatorio-pdf-tabela w-full table-fixed text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="pb-2 text-left font-medium">Indicador</th>
                    <th className="pb-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosBarra.map((d) => (
                    <tr key={d.nome} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 font-medium">{d.nome}</td>
                      <td
                        className="kpi-valor tabular py-2 text-right font-semibold"
                        title={formatarMoedaBR(d.valor)}
                      >
                        {formatarMoedaBR(d.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="chart-screen-only h-[280px] min-h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosBarra}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-zinc-200 dark:text-white/[0.08]"
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-zinc-500 dark:text-zinc-400"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    className="text-zinc-500 dark:text-zinc-400"
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={(v) => formatarMoedaBR(Number(v))}
                  />
                  <Tooltip
                    formatter={(v: any) => formatarMoedaBR(Number(v))}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: '1px solid rgba(120,120,120,0.2)',
                    }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {dadosBarra.map((d) => (
                      <Cell key={d.nome} fill={d.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Destaques */}
          <section
            data-pdf-section="destaques"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {indicadores.veiculoMaisLucrativo && (
              <div className="card min-w-0 overflow-hidden p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <Award size={14} className="shrink-0 text-emerald-500" />
                  Mais lucrativo
                </div>
                <p className="mt-2 truncate text-sm font-semibold" title={`${indicadores.veiculoMaisLucrativo.veiculo.placa} — ${indicadores.veiculoMaisLucrativo.veiculo.marca} ${indicadores.veiculoMaisLucrativo.veiculo.modelo} ${indicadores.veiculoMaisLucrativo.veiculo.ano}`}>
                  {indicadores.veiculoMaisLucrativo.veiculo.placa} —{' '}
                  <span className="font-normal text-zinc-600 dark:text-zinc-300">
                    {indicadores.veiculoMaisLucrativo.veiculo.marca}{' '}
                    {indicadores.veiculoMaisLucrativo.veiculo.modelo}{' '}
                    {indicadores.veiculoMaisLucrativo.veiculo.ano}
                  </span>
                </p>
                <p className="kpi-valor tabular mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatarMoedaBR(indicadores.veiculoMaisLucrativo.lucro)}
                  <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    ROI{' '}
                    {formatarPercentualBR(
                      indicadores.veiculoMaisLucrativo.roi,
                      0,
                    )}
                  </span>
                </p>
              </div>
            )}

            <div className="card flex min-w-0 flex-col gap-2 overflow-hidden p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Clock size={14} className="text-primary" /> Indicadores rápidos
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                    Dias médios em estoque
                  </span>
                  <span className="kpi-valor tabular shrink-0 font-semibold">
                    {Math.round(indicadores.mediaDiasEstoque) || '—'}
                  </span>
                </li>
                <li className="flex min-w-0 items-center justify-between gap-2">
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                    Ticket médio venda
                  </span>
                  <span
                    className="kpi-valor tabular shrink-0 text-right font-semibold"
                    title={formatarMoedaBR(indicadores.ticketMedioVenda)}
                  >
                    {formatarMoedaBR(indicadores.ticketMedioVenda)}
                  </span>
                </li>
                <li className="flex min-w-0 items-center justify-between gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <CreditCard size={12} /> Recebimento top
                  </span>
                  <span className="truncate text-right font-medium capitalize">
                    {indicadores.formaRecebimentoTop
                      ? `${indicadores.formaRecebimentoTop.forma} (${formatarPercentualBR(indicadores.formaRecebimentoTop.percentual, 0)})`
                      : '—'}
                  </span>
                </li>
                <li className="flex min-w-0 items-center justify-between gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <ShoppingBag size={12} /> Origem top
                  </span>
                  <span className="truncate text-right font-medium capitalize">
                    {indicadores.origemTop
                      ? `${indicadores.origemTop.origem} (${formatarPercentualBR(indicadores.origemTop.percentual, 0)})`
                      : '—'}
                  </span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      }
    />
  )
}

function MiniKpi({
  titulo,
  valor,
  icone,
}: {
  titulo: string
  valor: string
  icone: React.ReactNode
}) {
  return (
    <div className="card flex min-w-0 items-center gap-3 overflow-hidden p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {titulo}
        </p>
        <p className="kpi-valor tabular truncate text-lg font-semibold" title={valor}>
          {valor}
        </p>
      </div>
    </div>
  )
}
