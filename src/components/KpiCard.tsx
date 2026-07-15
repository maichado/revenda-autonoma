import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { formatarPercentual } from '@/utils/formatadores'

interface Props {
  titulo: string
  valor: string
  icone?: ReactNode
  /** Variação percentual vs mês anterior. */
  variacaoPercentual?: number
  /** Texto do rodapé (ex.: "vs. mês anterior"). */
  comparacaoLabel?: string
  /**
   * Quando true, considera que "menor é melhor" (ex.: custos):
   * variação negativa = verde, positiva = vermelho.
   */
  inverso?: boolean
  /** Conteúdo extra abaixo do valor (ex.: divisão do lucro entre sócios). */
  detalhe?: ReactNode
}

// Card de KPI com variação percentual vs período anterior (verde/vermelho).
export function KpiCard({
  titulo,
  valor,
  icone,
  variacaoPercentual: variacao,
  comparacaoLabel = 'vs. mês anterior',
  inverso = false,
  detalhe,
}: Props) {
  const temVariacao = variacao !== undefined && isFinite(variacao)
  const positiva = (variacao ?? 0) > 0
  const negativa = (variacao ?? 0) < 0
  const neutra = (variacao ?? 0) === 0

  // Define cor com base no sinal e no flag `inverso`.
  let corVar = 'text-zinc-400'
  if (temVariacao && !neutra) {
    const ehBom = inverso ? negativa : positiva
    corVar = ehBom
      ? 'text-emerald-500 dark:text-emerald-400'
      : 'text-red-500 dark:text-red-400'
  }

  const Icone = neutra ? Minus : positiva ? ArrowUpRight : ArrowDownRight

  return (
    <div className="card card-hover min-w-0 overflow-hidden p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:text-xs">
          {titulo}
        </p>
        {icone && (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            {icone}
          </span>
        )}
      </div>
      <p
        className="kpi-valor tabular mt-2 text-lg font-semibold tracking-tight md:text-xl"
        title={valor}
      >
        {valor}
      </p>
      {detalhe && <div className="mt-2">{detalhe}</div>}
      {temVariacao && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
              corVar,
              'bg-current/10',
            ].join(' ')}
          >
            <Icone size={14} />
            <span className="tabular">
              {formatarPercentual(Math.abs(variacao ?? 0), 1)}
            </span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {comparacaoLabel}
          </span>
        </div>
      )}
    </div>
  )
}
