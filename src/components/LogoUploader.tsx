import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  LOGO_MAX_ALTURA,
  LOGO_MAX_ARQUIVO_KB,
  LOGO_MAX_LARGURA,
} from '@/constants/logoRevenda'
import { processarLogoArquivo } from '@/utils/logoImagem'
import { useToast } from '@/hooks/useToast'
import { Button } from './Button'
import { LogoRevenda } from './LogoRevenda'

interface Props {
  logoAtual: string
  nomeRevenda: string
  /** Chamado após processar/remover — deve persistir no servidor. */
  onSalvar: (logo: string) => Promise<void>
  disabled?: boolean
}

export function LogoUploader({
  logoAtual,
  nomeRevenda,
  onSalvar,
  disabled = false,
}: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [salvando, setSalvando] = useState(false)
  const temCustom = Boolean(logoAtual.trim())
  const bloqueado = disabled || salvando

  async function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSalvando(true)
    try {
      const processada = await processarLogoArquivo(file)
      await onSalvar(processada)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao processar imagem.'
      toast.error('Logo inválida', msg)
    } finally {
      setSalvando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remover() {
    setSalvando(true)
    try {
      await onSalvar('')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={[
            'flex min-h-[88px] min-w-[140px] items-center justify-center rounded-xl border',
            'border-border-light bg-zinc-50 px-4 py-3 dark:border-border-dark dark:bg-white/[0.02]',
          ].join(' ')}
        >
          <LogoRevenda
            height={48}
            nomeRevenda={nomeRevenda}
            src={logoAtual}
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:min-w-[200px]">
          <p className="text-sm font-medium">Logo da revenda</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aparece na sidebar, login, header (mobile) e relatórios.
            PNG/JPG/WebP/SVG · até {LOGO_MAX_ARQUIVO_KB} KB (1 MB) · redimensionada para
            no máx. {LOGO_MAX_LARGURA}×{LOGO_MAX_ALTURA}px · salva automaticamente.
          </p>
          {salvando && (
            <p className="text-xs text-primary">Salvando logo no servidor…</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ImagePlus size={14} />}
              disabled={bloqueado}
              onClick={() => inputRef.current?.click()}
            >
              {temCustom ? 'Trocar logo' : 'Enviar logo'}
            </Button>
            {temCustom && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                disabled={bloqueado}
                onClick={remover}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        disabled={bloqueado}
        onChange={handleSelect}
      />
    </div>
  )
}
