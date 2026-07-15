// Card compacto — Dashboard: foto pequena + tempo (estoque e vendidos).

import { Car } from 'lucide-react'
import type { Veiculo, Venda } from '@/types'
import { formatarMoeda } from '@/utils/formatadores'
import type { MetricasTempoVeiculo } from '@/utils/tempoVeiculo'
import { StatusBadge } from './Badge'
import { TempoEstoqueResumo } from './TempoEstoqueResumo'

interface Props {
  veiculo: Veiculo
  metricas: MetricasTempoVeiculo
  venda?: Venda
  compact?: boolean
}

export function EstoqueTempoCard({
  veiculo,
  metricas,
  venda,
  compact = false,
}: Props) {
  const foto = veiculo.fotos[0]
  const vendido = veiculo.status === 'vendido'

  if (!compact) {
    return (
      <article className="card card-hover overflow-hidden transition-shadow hover:shadow-lg dark:hover:shadow-card-dark">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-white/[0.04]">
          {foto ? (
            <img
              src={foto}
              alt={`${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
              <Car size={48} strokeWidth={1.15} />
              <span className="text-[11px] uppercase tracking-wide">Sem foto</span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <StatusBadge status={veiculo.status} />
          </div>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div>
            <span className="tabular inline-block rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
              {veiculo.placa}
            </span>
            <h3 className="mt-2 text-base font-semibold leading-tight">
              {veiculo.marca}{' '}
              <span className="text-zinc-600 dark:text-zinc-300">
                {veiculo.modelo}
              </span>
            </h3>
          </div>
          <TempoEstoqueResumo metricas={metricas} variant="detalhado" />
          <RodapeValor vendido={vendido} venda={venda} veiculo={veiculo} />
        </div>
      </article>
    )
  }

  return (
    <article
      className={[
        'card card-hover flex gap-3 overflow-hidden p-3 transition-shadow hover:shadow-md dark:hover:shadow-card-dark',
        vendido ? 'opacity-90' : '',
      ].join(' ')}
    >
      <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-border-light bg-zinc-100 dark:border-border-dark dark:bg-white/[0.04]">
        {foto ? (
          <img
            src={foto}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
            <Car size={22} strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="tabular text-xs font-semibold tracking-wide">
            {veiculo.placa}
          </span>
          <StatusBadge status={veiculo.status} />
        </div>
        <p className="truncate text-sm font-medium leading-tight">
          {veiculo.marca} {veiculo.modelo}{' '}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            · {veiculo.ano}
          </span>
        </p>
        <TempoEstoqueResumo metricas={metricas} variant="compact" />
        <RodapeValor vendido={vendido} venda={venda} veiculo={veiculo} />
      </div>
    </article>
  )
}

function RodapeValor({
  vendido,
  venda,
  veiculo,
}: {
  vendido: boolean
  venda?: Venda
  veiculo: Veiculo
}) {
  if (vendido && venda) {
    return (
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Vendido por{' '}
        <span className="tabular font-semibold text-zinc-800 dark:text-zinc-100">
          {formatarMoeda(venda.valor_venda)}
        </span>
      </p>
    )
  }
  if (vendido) {
    return (
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vendido</p>
    )
  }
  return (
    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
      Pretendido{' '}
      <span className="tabular font-semibold text-zinc-800 dark:text-zinc-100">
        {formatarMoeda(veiculo.valor_venda_pretendido)}
      </span>
    </p>
  )
}
