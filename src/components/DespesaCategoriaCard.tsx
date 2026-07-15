// Card compacto de KPI por categoria de despesa — exibe ícone colorido,
// total da categoria (R$) e a contagem de lançamentos. Inspirado no KpiCard
// global, mas com altura reduzida para caber 7 colunas em desktop.

import type { TipoDespesa } from '@/types'
import { TIPO_META } from './despesaMeta'
import { formatarMoedaCompacta } from '@/utils/formatadores'

interface Props {
  tipo: TipoDespesa
  total: number
  quantidade: number
  /** Quando true, destaca como filtro ativo (anel + acento mais saturado). */
  ativo?: boolean
  /** Clique aplica/remove o tipo do filtro atual. */
  onClick?: () => void
}

export function DespesaCategoriaCard({
  tipo,
  total,
  quantidade,
  ativo = false,
  onClick,
}: Props) {
  const meta = TIPO_META[tipo]
  const Icone = meta.Icone
  const interativo = !!onClick

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      disabled={!interativo}
      className={[
        'card card-hover btn-press relative flex w-full flex-col gap-2 overflow-hidden p-3 text-left',
        interativo ? 'cursor-pointer' : 'cursor-default',
        ativo ? 'ring-2 ring-primary/60 dark:ring-primary/50' : '',
      ].join(' ')}
    >
      {/* Acento decorativo na borda inferior — reforça a cor da categoria. */}
      <span
        aria-hidden
        className={['absolute inset-x-0 bottom-0 h-1', meta.acento].join(' ')}
      />

      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            'grid h-8 w-8 place-items-center rounded-lg',
            meta.iconBg,
          ].join(' ')}
        >
          <Icone size={16} />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {meta.label}
        </span>
      </div>

      <div className="mt-auto">
        <p
          className="tabular truncate text-lg font-semibold tracking-tight"
          title={formatarMoedaCompacta(total)}
        >
          {formatarMoedaCompacta(total)}
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="tabular font-semibold">{quantidade}</span>{' '}
          {quantidade === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </div>
    </button>
  )
}
