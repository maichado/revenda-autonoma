import { LogoRevenda } from './LogoRevenda'

interface Props {
  titulo: string
  periodoLabel?: string
  subtitulo?: string
  nomeRevenda?: string
}

/** Cabeçalho padronizado dos relatórios — logo + título + período. */
export function RelatorioCabecalho({
  titulo,
  periodoLabel,
  subtitulo,
  nomeRevenda,
}: Props) {
  return (
    <header
      data-pdf-section="cabecalho"
      className="relatorio-cabecalho border-b border-[#C8A96E]/40 pb-5"
    >
      <div className="relatorio-cabecalho-inner flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <LogoRevenda
          height={40}
          nomeRevenda={nomeRevenda}
          className="relatorio-cabecalho-logo mx-0 max-w-[120px] shrink-0 self-start"
        />
        <div className="relatorio-cabecalho-texto min-w-0 flex-1 text-left sm:text-right">
          <h2 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">
            {titulo}
          </h2>
          {periodoLabel && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Período:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {periodoLabel}
              </span>
            </p>
          )}
          {subtitulo && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {subtitulo}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
