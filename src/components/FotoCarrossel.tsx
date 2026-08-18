import { useEffect, useState } from 'react'
import { Car, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  fotos: string[]
  alt: string
  className?: string
}

/**
 * Carrossel de fotos do veículo — setas, indicadores e contador.
 * Com uma foto (ou nenhuma), comporta-se como a capa estática anterior.
 */
export function FotoCarrossel({ fotos, alt, className }: Props) {
  const [indice, setIndice] = useState(0)
  const total = fotos.length
  const temVarias = total > 1

  useEffect(() => {
    setIndice(0)
  }, [fotos])

  useEffect(() => {
    if (indice >= total && total > 0) setIndice(0)
  }, [indice, total])

  function irPara(delta: number) {
    if (!temVarias) return
    setIndice((i) => (i + delta + total) % total)
  }

  const fotoAtual = total > 0 ? fotos[indice] : undefined

  return (
    <div
      className={[
        'relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-white/[0.04]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {fotoAtual ? (
        <img
          src={fotoAtual}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
          <Car size={40} strokeWidth={1.25} />
          <span className="text-[11px] uppercase tracking-wide">Sem foto</span>
        </div>
      )}

      {temVarias && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={(e) => {
              e.stopPropagation()
              irPara(-1)
            }}
            className={[
              'btn-press absolute left-2 top-1/2 z-[1] grid h-8 w-8 -translate-y-1/2 place-items-center',
              'rounded-full bg-black/50 text-white backdrop-blur-sm',
              'opacity-90 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            ].join(' ')}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={(e) => {
              e.stopPropagation()
              irPara(1)
            }}
            className={[
              'btn-press absolute right-2 top-1/2 z-[1] grid h-8 w-8 -translate-y-1/2 place-items-center',
              'rounded-full bg-black/50 text-white backdrop-blur-sm',
              'opacity-90 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            ].join(' ')}
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-2 left-1/2 z-[1] flex -translate-x-1/2 items-center gap-1.5">
            {fotos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para foto ${i + 1}`}
                aria-current={i === indice}
                onClick={(e) => {
                  e.stopPropagation()
                  setIndice(i)
                }}
                className={[
                  'h-1.5 rounded-full transition-all',
                  i === indice
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/50 hover:bg-white/80',
                ].join(' ')}
              />
            ))}
          </div>

          <span
            className={[
              'absolute bottom-2 right-2 z-[1] rounded-md px-1.5 py-0.5',
              'bg-black/55 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm',
            ].join(' ')}
          >
            {indice + 1}/{total}
          </span>
        </>
      )}
    </div>
  )
}
