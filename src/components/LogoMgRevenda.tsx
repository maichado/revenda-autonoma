import { useState } from 'react'

const LOGO_SRC = '/logo-mg-revenda.png'

interface Props {
  /** Altura em px — padrão 40 (header/sidebar expandida). */
  height?: number
  className?: string
}

export function LogoMgRevenda({ height = 40, className = '' }: Props) {
  const [erro, setErro] = useState(false)

  if (erro) {
    return (
      <div
        className={[
          'flex shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10',
          className,
        ].join(' ')}
        style={{ height, width: height * 1.6 }}
        role="img"
        aria-label="MG Revenda"
      />
    )
  }

  return (
    <img
      src={LOGO_SRC}
      alt="MG Revenda"
      className={['mx-auto block w-auto shrink-0 object-contain', className].join(' ')}
      style={{ height }}
      onError={() => setErro(true)}
    />
  )
}
