import { NOME_REVENDA_PADRAO } from '@/constants/marca'

/** PNG transparente da logo. */
const LOGO_SRC = '/logo-revenda.png'

interface Props {
  /** Altura em px — padrão 40 (header/sidebar expandida). */
  height?: number
  className?: string
  /** Nome da revenda — apenas para alt/aria (acessibilidade). */
  nomeRevenda?: string
}

/** Logo RVD Autônoma — arquivo original, sem filtros, bordas ou fundo extra. */
export function LogoRevenda({
  height = 40,
  className = '',
  nomeRevenda,
}: Props) {
  const alt = (nomeRevenda?.trim() || NOME_REVENDA_PADRAO).trim()

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      draggable={false}
      className={['block w-auto shrink-0 object-contain', className].join(' ')}
      style={{ height, width: 'auto' }}
    />
  )
}
