import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CircleDollarSign,
  Coins,
  Gauge,
  PiggyBank,
  ShoppingBag,
  Tags,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import { KpiCard } from '@/components/KpiCard'
import { EstoqueTempoCard } from '@/components/EstoqueTempoCard'
import {
  distribuicaoEstoque,
  lucroAcumuladoAno,
  lucroDoMesBreakdown,
  lucroRealizadoMes,
  receitaDoMes,
  refMesAnterior,
  roiMedioDoMes,
  serieUltimosMeses,
  ticketMedioDoMes,
  totalEmEstoque,
  ultimasMovimentacoes,
  variacaoPercentual,
  vendidosNoMes,
} from '@/utils/calculos'
import {
  linhasTempoVeiculos,
} from '@/utils/tempoVeiculo'
import {
  formatarMoeda,
  formatarMoedaCompacta,
  formatarPercentual,
  formatarDataCurta,
} from '@/utils/formatadores'

// Paleta dos gráficos (alinhada à identidade)
const COR_RECEITA = '#C8A96E'
const COR_CUSTO = '#7E683E'
const COR_LUCRO = '#22C55E'
const CORES_STATUS: Record<string, string> = {
  'em preparação': '#A855F7',
  'disponível': '#22C55E',
  reservado: '#F59E0B',
  vendido: '#0EA5E9',
}

// Tooltip customizado dos gráficos.
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="card border px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-zinc-500 dark:text-zinc-400">{p.name}:</span>
          <span className="tabular font-medium">
            {typeof p.value === 'number' ? formatarMoeda(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const veiculos = useStore((s) => s.veiculos)
  const vendas = useStore((s) => s.vendas)
  const compras = useStore((s) => s.compras)
  const despesas = useStore((s) => s.despesas)
  const metaLucro = useStore((s) => s.configuracoes.meta_lucro_mensal)
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const socios = useStore((s) => s.configuracoes.socios)

  // Nome curto do dono (primeiro sócio da lista) para rotular a "sua parte".
  const nomeDono = useMemo(
    () => socios[0]?.trim().split(/\s+/)[0] || 'Você',
    [socios],
  )

  const hoje = useMemo(() => new Date(), [])
  const anterior = useMemo(() => refMesAnterior(hoje), [hoje])

  // ----- KPIs principais -----
  const kpis = useMemo(() => {
    const estoque = totalEmEstoque(veiculos)
    // Variação vs mês anterior aproximada: comparamos com o total
    // que estava em estoque considerando vendas do mês.
    const vendidosMesAtual = vendidosNoMes(vendas, hoje)
    const estoqueAnteriorAprox = estoque + vendidosMesAtual
    const varEstoque = variacaoPercentual(estoque, estoqueAnteriorAprox)

    const vendidosAtual = vendidosNoMes(vendas, hoje)
    const vendidosAnt = vendidosNoMes(vendas, anterior)
    const varVendidos = variacaoPercentual(vendidosAtual, vendidosAnt)

    const receitaAtual = receitaDoMes(vendas, hoje)
    const receitaAnt = receitaDoMes(vendas, anterior)
    const varReceita = variacaoPercentual(receitaAtual, receitaAnt)

    const breakdown = lucroDoMesBreakdown(vendas, veiculos, despesas, hoje)
    const lucroAtual = breakdown.total
    const lucroAnt = lucroRealizadoMes(vendas, veiculos, despesas, anterior)
    const varLucro = variacaoPercentual(lucroAtual, lucroAnt)

    const ticketAtual = ticketMedioDoMes(vendas, hoje)
    const ticketAnt = ticketMedioDoMes(vendas, anterior)
    const varTicket = variacaoPercentual(ticketAtual, ticketAnt)

    const roiAtual = roiMedioDoMes(vendas, veiculos, despesas, hoje)
    const roiAnt = roiMedioDoMes(vendas, veiculos, despesas, anterior)
    const varRoi = variacaoPercentual(roiAtual, roiAnt)

    return {
      estoque,
      varEstoque,
      vendidosAtual,
      varVendidos,
      receitaAtual,
      varReceita,
      lucroAtual,
      varLucro,
      lucroMeu: breakdown.meu,
      lucroSocio: breakdown.socio,
      temDivisao: breakdown.temDivisao,
      ticketAtual,
      varTicket,
      roiAtual,
      varRoi,
    }
  }, [veiculos, vendas, despesas, hoje, anterior])

  // ----- Séries para gráficos -----
  const serie6m = useMemo(
    () => serieUltimosMeses(vendas, veiculos, despesas, hoje, 6),
    [vendas, veiculos, despesas, hoje],
  )
  const lucroAno = useMemo(
    () => lucroAcumuladoAno(vendas, veiculos, despesas, hoje),
    [vendas, veiculos, despesas, hoje],
  )
  const distEstoque = useMemo(() => distribuicaoEstoque(veiculos), [veiculos])
  const totalEstoqueGeral = distEstoque.reduce((acc, d) => acc + d.total, 0)

  const linhasTempo = useMemo(
    () => linhasTempoVeiculos(veiculos, vendas, hoje),
    [veiculos, vendas, hoje],
  )
  const qtdAtivos = useMemo(
    () => linhasTempo.filter((l) => l.veiculo.status !== 'vendido').length,
    [linhasTempo],
  )
  const qtdVendidos = linhasTempo.length - qtdAtivos

  // ----- Movimentações recentes -----
  const ultimas = useMemo(
    () => ultimasMovimentacoes(vendas, compras, despesas, veiculos, 5),
    [vendas, compras, despesas, veiculos],
  )

  // ----- Progresso da meta -----
  const percMeta = metaLucro > 0
    ? Math.max(0, Math.min(200, (kpis.lucroAtual / metaLucro) * 100))
    : 0
  const metaAtingida = percMeta >= 100

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Visão geral do desempenho da {nomeRevenda || NOME_REVENDA_PADRAO} no mês corrente.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          titulo="Em estoque"
          valor={String(kpis.estoque)}
          icone={<Car size={16} />}
          variacaoPercentual={kpis.varEstoque}
          inverso
        />
        <KpiCard
          titulo="Vendidos no mês"
          valor={String(kpis.vendidosAtual)}
          icone={<Tags size={16} />}
          variacaoPercentual={kpis.varVendidos}
        />
        <KpiCard
          titulo="Receita do mês"
          valor={formatarMoeda(kpis.receitaAtual)}
          icone={<CircleDollarSign size={16} />}
          variacaoPercentual={kpis.varReceita}
        />
        <KpiCard
          titulo="Lucro do mês (MG)"
          valor={formatarMoeda(kpis.lucroAtual)}
          icone={<PiggyBank size={16} />}
          variacaoPercentual={kpis.varLucro}
          detalhe={
            kpis.temDivisao ? (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400"
                  title={`Parte de ${nomeDono}: 100% dos carros próprios + metade dos carros a meia − despesas gerais`}
                >
                  <span className="text-emerald-500/70">{nomeDono}</span>
                  <span className="tabular">
                    {formatarMoeda(kpis.lucroMeu)}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/12 px-1.5 py-0.5 font-semibold text-amber-600 dark:text-amber-400"
                  title="Parte do sócio (metade do lucro dos carros a meia vendidos)"
                >
                  <span className="text-amber-500/70">Sócio</span>
                  <span className="tabular">
                    {formatarMoeda(kpis.lucroSocio)}
                  </span>
                </span>
              </div>
            ) : undefined
          }
        />
        <KpiCard
          titulo="Ticket médio"
          valor={formatarMoeda(kpis.ticketAtual)}
          icone={<Wallet size={16} />}
          variacaoPercentual={kpis.varTicket}
        />
        <KpiCard
          titulo="ROI médio"
          valor={formatarPercentual(kpis.roiAtual, 1)}
          icone={<Gauge size={16} />}
          variacaoPercentual={kpis.varRoi}
        />
      </section>

      {/* Meta de lucro */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Target size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold">Meta de lucro do mês</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatarMoeda(kpis.lucroAtual)} de {formatarMoeda(metaLucro)}
              </p>
              {kpis.temDivisao && (
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {nomeDono}:{' '}
                  <span className="tabular font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatarMoeda(kpis.lucroMeu)}
                  </span>{' '}
                  · Sócio:{' '}
                  <span className="tabular font-semibold text-amber-600 dark:text-amber-400">
                    {formatarMoeda(kpis.lucroSocio)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p
              className={[
                'tabular text-xl font-semibold',
                metaAtingida
                  ? 'text-emerald-500'
                  : 'text-zinc-900 dark:text-white',
              ].join(' ')}
            >
              {formatarPercentual(percMeta, 0)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {metaAtingida ? 'Meta atingida' : 'Atingido'}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
          <div
            className={[
              'h-full rounded-full transition-all',
              metaAtingida
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-primary-400 to-primary',
            ].join(' ')}
            style={{ width: `${Math.min(percMeta, 100)}%` }}
          />
        </div>
      </section>

      {/* Veículos — tempo no estoque */}
      {linhasTempo.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Veículos</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tempo total · preparação · dias anunciado (estoque e vendidos)
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {qtdAtivos > 0 && (
                <span className="badge bg-primary/15 text-primary">
                  {qtdAtivos} em estoque
                </span>
              )}
              {qtdVendidos > 0 && (
                <span className="badge bg-zinc-500/15 text-zinc-600 dark:text-zinc-300">
                  {qtdVendidos} vendido{qtdVendidos === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {linhasTempo.map(({ veiculo, metricas, venda }) => (
              <EstoqueTempoCard
                key={veiculo.id}
                veiculo={veiculo}
                metricas={metricas}
                venda={venda}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* Gráficos */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Barras: Receita vs Custos — 6 meses */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Receita vs. Custos</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Últimos 6 meses
              </p>
            </div>
            <span className="badge bg-primary/15 text-primary">
              <Coins size={12} /> mensal
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serie6m}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-white/[0.08]"
                />
                <XAxis
                  dataKey="mes"
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
                  tickFormatter={(v) => formatarMoedaCompacta(Number(v))}
                  width={70}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(200,169,110,0.08)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="receita"
                  name="Receita"
                  fill={COR_RECEITA}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="custos"
                  name="Custos"
                  fill={COR_CUSTO}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut: Distribuição do estoque */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Distribuição do estoque</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Por status
              </p>
            </div>
            <span className="badge bg-primary/15 text-primary">
              {totalEstoqueGeral} carros
            </span>
          </div>
          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie
                  data={distEstoque}
                  dataKey="total"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="none"
                >
                  {distEstoque.map((d) => (
                    <Cell key={d.status} fill={CORES_STATUS[d.status]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="tabular text-2xl font-semibold">
                {totalEstoqueGeral}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total
              </span>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {distEstoque.map((d) => (
              <li
                key={d.status}
                className="flex flex-col items-start gap-1 rounded-lg border border-border-light p-2 dark:border-border-dark"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: CORES_STATUS[d.status] }}
                  />
                  <span className="capitalize text-zinc-500 dark:text-zinc-400">
                    {d.status}
                  </span>
                </span>
                <span className="tabular text-sm font-semibold">
                  {d.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Linha: lucro acumulado no ano */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Lucro acumulado no ano</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Soma corrida do lucro líquido mensal
            </p>
          </div>
          <span className="badge bg-emerald-500/15 text-emerald-500">
            <TrendingUp size={12} />
            {hoje.getFullYear()}
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lucroAno}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-zinc-200 dark:text-white/[0.08]"
              />
              <XAxis
                dataKey="mes"
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
                tickFormatter={(v) => formatarMoedaCompacta(Number(v))}
                width={70}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="acumulado"
                name="Lucro acumulado"
                stroke={COR_LUCRO}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COR_LUCRO, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Últimas movimentações */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Últimas movimentações</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              5 mais recentes (vendas, compras e despesas)
            </p>
          </div>
        </div>

        {ultimas.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma movimentação registrada ainda.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-2 py-2 font-medium">Tipo</th>
                  <th className="px-2 py-2 font-medium">Descrição</th>
                  <th className="px-2 py-2 font-medium">Data</th>
                  <th className="px-2 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="table-row-zebra table-row-hover">
                {ultimas.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-border-light dark:border-border-dark"
                  >
                    <td className="px-2 py-2.5">
                      <span
                        className={[
                          'badge capitalize',
                          m.tipo === 'venda' &&
                            'bg-emerald-500/15 text-emerald-500',
                          m.tipo === 'compra' &&
                            'bg-sky-500/15 text-sky-500',
                          m.tipo === 'despesa' &&
                            'bg-amber-500/15 text-amber-500',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {m.tipo === 'venda' && <Tags size={11} />}
                        {m.tipo === 'compra' && <ShoppingBag size={11} />}
                        {m.tipo === 'despesa' && <Coins size={11} />}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="line-clamp-1">{m.descricao}</span>
                    </td>
                    <td className="px-2 py-2.5 tabular text-zinc-500 dark:text-zinc-400">
                      {formatarDataCurta(m.data)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <span
                        className={[
                          'tabular inline-flex items-center justify-end gap-1 font-semibold',
                          m.sinal === 'entrada'
                            ? 'text-emerald-500'
                            : 'text-red-500',
                        ].join(' ')}
                      >
                        {m.sinal === 'entrada' ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ArrowDownRight size={12} />
                        )}
                        {formatarMoeda(m.valor)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
