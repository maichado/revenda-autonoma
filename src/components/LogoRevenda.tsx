import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import { useStore } from '@/store/useStore'
import { resolverSrcLogo } from '@/utils/logoImagem'

interface Props {
  /** Altura em px — padrão 40 (header/sidebar expandida). */
  height?: number
  className?: string
  /** Nome da revenda — apenas para alt/aria (acessibilidade). */
  nomeRevenda?: string
  /** Força uma src (ex.: preview no upload); omitido = store ou padrão. */
  src?: string
}

/** Logo da revenda — customizada em Configurações ou padrão do sistema. */
export function LogoRevenda({
  height = 40,
  className = '',
  nomeRevenda,
  src,
}: Props) {
  const logoStore = useStore((s) => s.configuracoes.logo_revenda)
  const resolvedSrc = src !== undefined ? resolverSrcLogo(src) : resolverSrcLogo(logoStore)
  const alt = (nomeRevenda?.trim() || NOME_REVENDA_PADRAO).trim()

  return (
    <img
      key={resolvedSrc.slice(-48)}
      src={resolvedSrc}
      alt={alt}
      draggable={false}
      className={['block w-auto shrink-0 object-contain', className].join(' ')}
      style={{ height, width: 'auto', maxWidth: height * 4 }}
    />
  )
}
