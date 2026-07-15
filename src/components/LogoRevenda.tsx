import { useState } from 'react'
import { Car } from 'lucide-react'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'

const LOGO_CUSTOM = '/logo-revenda.png'
const LOGO_LEGADO = '/logo-mg-revenda.png'

interface Props {
  /** Altura em px — padrão 40 (header/sidebar expandida). */
  height?: number
  className?: string
  /** Nome da revenda (Configurações) — usado em alt/aria e iniciais do fallback. */
  nomeRevenda?: string
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'RA'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0] ?? ''}${partes[1][0] ?? ''}`.toUpperCase()
}

export function LogoRevenda({
  height = 40,
  className = '',
  nomeRevenda,
}: Props) {
  const rotulo = (nomeRevenda?.trim() || NOME_REVENDA_PADRAO).trim()
  const [srcAtual, setSrcAtual] = useState(LOGO_CUSTOM)
  const [erro, setErro] = useState(false)

  function onErroImagem() {
    if (srcAtual === LOGO_CUSTOM) {
      setSrcAtual(LOGO_LEGADO)
      return
    }
    setErro(true)
  }

  if (erro) {
    return (
      <div
        className={[
          'flex shrink-0 items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 text-primary',
          className,
        ].join(' ')}
        style={{ height, minWidth: height * 1.6, paddingInline: height * 0.2 }}
        role="img"
        aria-label={rotulo}
      >
        <Car size={Math.round(height * 0.45)} aria-hidden />
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: Math.max(10, height * 0.28) }}
        >
          {iniciais(rotulo)}
        </span>
      </div>
    )
  }

  return (
    <img
      src={srcAtual}
      alt={rotulo}
      className={['mx-auto block w-auto shrink-0 object-contain', className].join(
        ' ',
      )}
      style={{ height }}
      onError={onErroImagem}
    />
  )
}

/** @deprecated Use LogoRevenda */
export const LogoMgRevenda = LogoRevenda
