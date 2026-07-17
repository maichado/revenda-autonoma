export const AUTOR_SISTEMA = 'Maicon Machado'

interface Props {
  className?: string
}

/** Crédito do autor — "by Maicon Machado". */
export function AssinaturaAutor({ className = '' }: Props) {
  return (
    <p
      className={[
        'text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500',
        className,
      ].join(' ')}
    >
      by{' '}
      <span className="font-medium text-zinc-500 dark:text-zinc-400">
        {AUTOR_SISTEMA}
      </span>
    </p>
  )
}
