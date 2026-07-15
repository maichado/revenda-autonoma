import type { ReactNode } from 'react'

interface Props {
  /** Ícone exibido no canto superior esquerdo (Lucide). */
  icone: ReactNode
  titulo: string
  descricao?: string
  /** Quando true, aplica visual de "zona destrutiva" (borda/avesso vermelho). */
  perigo?: boolean
  /** Ação primária no header (botão Salvar, por ex.). Opcional. */
  acao?: ReactNode
  children: ReactNode
}

// Wrapper visual padrão das seções da página Configurações.
// Mantém alinhamento, dark/light, espaçamento e responsividade consistentes.
export function ConfigSection({
  icone,
  titulo,
  descricao,
  perigo = false,
  acao,
  children,
}: Props) {
  return (
    <section
      className={[
        'card overflow-hidden',
        perigo
          ? 'border-red-500/30 dark:border-red-500/40'
          : '',
      ].join(' ')}
    >
      <header
        className={[
          'flex flex-wrap items-start justify-between gap-3 border-b p-5',
          perigo
            ? 'border-red-500/20 bg-red-500/[0.04] dark:bg-red-500/[0.06]'
            : 'border-border-light dark:border-border-dark',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <span
            className={[
              'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
              perigo
                ? 'bg-red-500/15 text-red-500'
                : 'bg-primary/15 text-primary',
            ].join(' ')}
            aria-hidden
          >
            {icone}
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              {titulo}
            </h2>
            {descricao && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                {descricao}
              </p>
            )}
          </div>
        </div>
        {acao && <div className="ml-auto shrink-0">{acao}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}
