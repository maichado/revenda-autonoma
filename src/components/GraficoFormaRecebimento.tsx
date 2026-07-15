// Donut "Distribuição da receita por forma de recebimento".
//
// Cores alinhadas às badges das formas (dinheiro=verde, pix=azul,
// financiado=violeta, consórcio=âmbar; outras formas viram cinza).

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { WalletCards } from 'lucide-react'

import {
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { FatiaForma } from '@/utils/relatorios'

const CORES_FORMA: Record<string, string> = {
  dinheiro: '#22C55E',
  pix: '#0EA5E9',
  financiado: '#8B5CF6',
  consórcio: '#F59E0B',
  // Cores neutras para formas legadas.
  transferência: '#64748B',
  cartão: '#0F766E',
  financiamento: '#7C3AED',
  cheque: '#A78BFA',
  outros: '#71717A',
}

function corDe(forma: string): string {
  return CORES_FORMA[forma] ?? '#71717A'
}

interface Props {
  fatias: FatiaForma[]
}

function TooltipCustom({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null
  const f = payload[0]?.payload as FatiaForma
  return (
    <div className="card border px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold capitalize">{f.forma}</p>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: corDe(f.forma) }}
        />
        <span className="text-zinc-500 dark:text-zinc-400">Receita:</span>
        <span className="tabular font-medium">{formatarMoeda(f.receita)}</span>
      </div>
      <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
        {formatarPercentual(f.percentual, 1)} do total
      </p>
    </div>
  )
}

export function GraficoFormaRecebimento({ fatias }: Props) {
  const total = fatias.reduce((acc, f) => acc + f.receita, 0)

  if (fatias.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold">Receita por forma de recebimento</h3>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Sem vendas no período — gráfico indisponível.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Receita por recebimento</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Distribuição da receita do período
          </p>
        </div>
        <span className="badge bg-primary/15 text-primary">
          <WalletCards size={12} /> {fatias.length}{' '}
          {fatias.length === 1 ? 'forma' : 'formas'}
        </span>
      </div>
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<TooltipCustom />} />
            <Pie
              data={fatias}
              dataKey="receita"
              nameKey="forma"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              stroke="none"
            >
              {fatias.map((f) => (
                <Cell key={f.forma} fill={corDe(f.forma)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-base font-semibold">
            {formatarMoeda(total)}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Receita total
          </span>
        </div>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {fatias.map((f) => (
          <li
            key={f.forma}
            className="flex flex-col items-start gap-1 rounded-lg border border-border-light p-2 dark:border-border-dark"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: corDe(f.forma) }}
              />
              <span className="capitalize text-zinc-500 dark:text-zinc-400">
                {f.forma}
              </span>
            </span>
            <span className="tabular text-sm font-semibold">
              {formatarPercentual(f.percentual, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
