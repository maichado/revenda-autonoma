// Gráfico de barras "Lucro por veículo" — top 10 do período.
//
// Reaproveita a paleta e o estilo já usados no Dashboard, garantindo que o
// relatório tenha a mesma identidade visual. As barras ficam verdes para
// lucro positivo e vermelhas para prejuízo — o usuário identifica de
// relance os negócios bons e ruins.

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
import { TrendingUp } from 'lucide-react'

import {
  formatarMoeda,
  formatarMoedaCompacta,
} from '@/utils/formatadores'
import type { VeiculoLinhaRelatorio } from '@/utils/relatorios'

interface Props {
  linhas: VeiculoLinhaRelatorio[]
}

const COR_LUCRO = '#22C55E'
const COR_PREJUIZO = '#EF4444'

function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const valor = payload[0]?.value as number
  return (
    <div className="card border px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: valor >= 0 ? COR_LUCRO : COR_PREJUIZO }}
        />
        <span className="text-zinc-500 dark:text-zinc-400">Lucro:</span>
        <span className="tabular font-medium">{formatarMoeda(valor)}</span>
      </div>
    </div>
  )
}

export function GraficoLucroPorVeiculo({ linhas }: Props) {
  // Apenas os veículos com venda dentro do período; ordena por lucro DESC
  // e pega os 10 primeiros — evita gráfico ilegível em períodos com muitos
  // negócios.
  const dados = linhas
    .filter((l) => l.venda)
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 10)
    .map((l) => ({
      label: l.veiculo.placa,
      modelo: `${l.veiculo.marca} ${l.veiculo.modelo}`,
      lucro: l.lucro,
    }))

  if (dados.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold">Lucro por veículo</h3>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Nenhum veículo vendido no período — gráfico indisponível.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Lucro por veículo</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Top {dados.length} do período (apenas vendidos)
          </p>
        </div>
        <span className="badge bg-primary/15 text-primary">
          <TrendingUp size={12} />
          lucro
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-zinc-200 dark:text-white/[0.08]"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="text-zinc-500 dark:text-zinc-400"
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={50}
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
              content={<TooltipCustom />}
              cursor={{ fill: 'rgba(200,169,110,0.08)' }}
            />
            <Bar
              dataKey="lucro"
              name="Lucro"
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
            >
              {dados.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.lucro >= 0 ? COR_LUCRO : COR_PREJUIZO}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
