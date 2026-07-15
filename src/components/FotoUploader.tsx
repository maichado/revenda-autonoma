import { useRef, type ChangeEvent } from 'react'
import { ImagePlus, X, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { Button } from './Button'

interface Props {
  fotos: string[]
  onChange: (fotos: string[]) => void
  /** Tamanho máximo individual em MB para alerta amigável. */
  maxMb?: number
}

// Converte File -> base64 (data URL). Mantemos no estado/store
// para persistir no localStorage junto ao restante do veículo.
function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Upload múltiplo + preview inline + remoção individual.
export function FotoUploader({ fotos, onChange, maxMb = 2 }: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const novas: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.warning('Arquivo ignorado', `${file.name} não é uma imagem.`)
        continue
      }
      // Alerta amigável quando passa do limite, mas ainda permite salvar
      // (algumas fotos de celular passam de 2MB facilmente).
      if (file.size > maxMb * 1024 * 1024) {
        toast.warning(
          'Imagem grande',
          `${file.name} ultrapassa ${maxMb}MB — pode deixar o app lento.`,
        )
      }
      try {
        const b64 = await fileParaBase64(file)
        novas.push(b64)
      } catch {
        toast.error('Falha ao ler imagem', file.name)
      }
    }

    if (novas.length > 0) onChange([...fotos, ...novas])
    // Resetar input para permitir selecionar o mesmo arquivo novamente.
    if (inputRef.current) inputRef.current.value = ''
  }

  function removerFoto(idx: number) {
    onChange(fotos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Fotos do veículo</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {fotos.length === 0
              ? 'Nenhuma foto adicionada.'
              : `${fotos.length} foto${fotos.length > 1 ? 's' : ''} no anúncio.`}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<ImagePlus size={14} />}
          onClick={() => inputRef.current?.click()}
        >
          Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {fotos.length === 0 ? (
        <div
          className={[
            'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed',
            'border-border-light bg-zinc-50 px-4 py-8 text-center',
            'dark:border-border-dark dark:bg-white/[0.02]',
          ].join(' ')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
            <ImageIcon size={18} />
          </span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aceita PNG/JPG. Você pode adicionar várias de uma vez.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fotos.map((src, i) => (
            <li
              key={`${i}-${src.slice(-12)}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border-light bg-zinc-100 dark:border-border-dark dark:bg-white/[0.04]"
            >
              {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
              <img
                src={src}
                alt={`Foto ${i + 1} do veículo`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removerFoto(i)}
                aria-label={`Remover foto ${i + 1}`}
                className={[
                  'absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full',
                  'bg-black/60 text-white opacity-0 transition-opacity',
                  'group-hover:opacity-100 focus:opacity-100 hover:bg-black/80',
                ].join(' ')}
              >
                <X size={14} />
              </button>
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">
                  Capa
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
