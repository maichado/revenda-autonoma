// Exibição compacta de dias: total, preparação e anunciado.

import { Clock, Megaphone, Wrench } from 'lucide-react'
import type { MetricasTempoVeiculo } from '@/utils/tempoVeiculo'
import { formatarDiasTempo } from '@/utils/tempoVeiculo'
import { formatarDataCurta } from '@/utils/formatadores'

interface Props {
  metricas: MetricasTempoVeiculo
  /** 'compact' = uma linha; 'detalhado' = bloco com ícones */
  variant?: 'compact' | 'detalhado'
  className?: string
}

export function TempoEstoqueResumo({
  metricas,
  variant = 'compact',
  className = '',
}: Props) {
  const {
    diasTotal,
    diasPreparacao,
    diasAnunciado,
    dataAnuncio,
    anuncioEstimado,
    emPreparacao,
  } = metricas

  if (variant === 'compact') {
    return (
      <div
        className={[
          'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400',
          className,
        ].join(' ')}
      >
        <span className="inline-flex items-center gap-1 tabular">
          <Clock size={11} className="shrink-0 opacity-70" />
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            {formatarDiasTempo(diasTotal)}
          </span>
          <span>total</span>
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="inline-flex items-center gap-1 tabular">
          <Wrench size={11} className="shrink-0 opacity-70" />
          {formatarDiasTempo(diasPreparacao)} prep.
        </span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="inline-flex items-center gap-1 tabular">
          <Megaphone size={11} className="shrink-0 opacity-70" />
          {emPreparacao
            ? 'não anunciado'
            : `${formatarDiasTempo(diasAnunciado)} anúncio${anuncioEstimado ? ' (est.)' : ''}`}
        </span>
      </div>
    )
  }

  return (
    <div
      className={[
        'grid grid-cols-3 gap-3 rounded-xl border border-border-light bg-zinc-50/80 p-3 text-center dark:border-border-dark dark:bg-white/[0.03]',
        className,
      ].join(' ')}
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Total
        </p>
        <p className="tabular text-lg font-semibold">{diasTotal}</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">dias</p>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Preparação
        </p>
        <p className="tabular text-lg font-semibold">{diasPreparacao}</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">dias</p>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Anunciado
        </p>
        <p className="tabular text-lg font-semibold">
          {emPreparacao ? '—' : (diasAnunciado ?? '—')}
        </p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {emPreparacao
            ? 'em prep.'
            : dataAnuncio
              ? formatarDataCurta(dataAnuncio)
              : anuncioEstimado
                ? 'estimado'
                : 'dias'}
        </p>
      </div>
    </div>
  )
}
