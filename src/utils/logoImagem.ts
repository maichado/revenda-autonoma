import {
  LOGO_MAX_ALTURA,
  LOGO_MAX_ARQUIVO_KB,
  LOGO_MAX_BASE64_KB,
  LOGO_MAX_LARGURA,
  LOGO_MAX_SVG_KB,
  LOGO_PADRAO_SRC,
} from '@/constants/logoRevenda'

function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    img.src = src
  })
}

function tamanhoBase64Kb(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return (base64.length * 3) / 4 / 1024
}

function redimensionarCanvas(img: HTMLImageElement): string {
  let largura = img.naturalWidth
  let altura = img.naturalHeight
  const ratio = Math.min(
    LOGO_MAX_LARGURA / largura,
    LOGO_MAX_ALTURA / altura,
    1,
  )
  largura = Math.max(1, Math.round(largura * ratio))
  altura = Math.max(1, Math.round(altura * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível no navegador.')

  ctx.drawImage(img, 0, 0, largura, altura)

  let resultado = canvas.toDataURL('image/png')
  if (tamanhoBase64Kb(resultado) > LOGO_MAX_BASE64_KB) {
    resultado = canvas.toDataURL('image/jpeg', 0.82)
  }
  if (tamanhoBase64Kb(resultado) > LOGO_MAX_BASE64_KB) {
    resultado = canvas.toDataURL('image/jpeg', 0.65)
  }
  if (tamanhoBase64Kb(resultado) > LOGO_MAX_BASE64_KB) {
    throw new Error(
      `Imagem ainda grande após compressão (máx. ${LOGO_MAX_BASE64_KB} KB). Use arquivo menor ou menos detalhes.`,
    )
  }
  return resultado
}

/**
 * Valida, redimensiona e comprime a logo para persistir em configuracoes.logo_revenda.
 */
export async function processarLogoArquivo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione PNG, JPG, WebP ou SVG.')
  }
  if (file.size > LOGO_MAX_ARQUIVO_KB * 1024) {
    throw new Error(
      `Arquivo muito grande. Máximo ${LOGO_MAX_ARQUIVO_KB} KB antes do upload.`,
    )
  }

  if (file.type === 'image/svg+xml') {
    if (file.size > LOGO_MAX_SVG_KB * 1024) {
      throw new Error(`SVG muito grande. Máximo ${LOGO_MAX_SVG_KB} KB.`)
    }
    const svg = await fileParaBase64(file)
    if (tamanhoBase64Kb(svg) > LOGO_MAX_BASE64_KB) {
      throw new Error(`SVG excede ${LOGO_MAX_BASE64_KB} KB após codificação.`)
    }
    return svg
  }

  const dataUrl = await fileParaBase64(file)
  const img = await carregarImagem(dataUrl)
  return redimensionarCanvas(img)
}

/** Resolve src da logo: customizada ou padrão do projeto. */
export function resolverSrcLogo(logoRevenda?: string | null): string {
  const custom = logoRevenda?.trim()
  return custom || LOGO_PADRAO_SRC
}
