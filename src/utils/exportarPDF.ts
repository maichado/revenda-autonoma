// Exportação do relatório visual para PDF via html2canvas + jsPDF.
//
// Captura seção a seção (`data-pdf-section`) para evitar cortar cards no meio
// da página. Gráficos Recharts podem falhar no canvas; o Relatório Geral
// inclui tabela numérica como fallback visível só durante a captura.

import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const MARGEM_MM = 19
const ESCALA = 2
const GAP_SECAO_MM = 5
const RODAPE_GAP_MM = 6
const SECOES_ESTRUTURAIS = new Set(['cabecalho', 'rodape'])
/** Altura mínima acumulada (px no canvas) para considerar o PDF válido. */
const ALTURA_MIN_CONTEUDO_PX = 80
const FORMATO_IMAGEM = 'PNG' as const
const QUALIDADE_JPEG = 0.92

export class ErroPdfSemConteudo extends Error {
  constructor() {
    super('PDF sem conteúdo capturável')
    this.name = 'ErroPdfSemConteudo'
  }
}

function aguardarFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function aguardarRender(): Promise<void> {
  await aguardarFrame()
  await aguardarFrame()
  await new Promise<void>((resolve) => setTimeout(resolve, 100))
}

async function aguardarRecursos(root: HTMLElement): Promise<void> {
  await aguardarRender()
  if (document.fonts?.ready) {
    await document.fonts.ready
  }
  const imagens = root.querySelectorAll<HTMLImageElement>('img')
  await Promise.all(
    Array.from(imagens).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )
}

interface RestauracaoEstilo {
  element: HTMLElement
  className: string
  display: string
}

function forcarVisibilidadeCaptura(root: HTMLElement): () => void {
  const restauracoes: RestauracaoEstilo[] = []

  root.style.visibility = 'visible'
  root.style.opacity = '1'
  root.style.display = 'block'

  root.querySelectorAll<HTMLElement>('[data-pdf-section]').forEach((el) => {
    el.style.display = 'block'
    el.style.visibility = 'visible'
    el.style.opacity = '1'
  })

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const oculto =
      el.classList.contains('hidden') ||
      el.classList.contains('md:hidden') ||
      el.classList.contains('lg:hidden') ||
      el.classList.contains('sm:hidden') ||
      el.classList.contains('xl:hidden') ||
      window.getComputedStyle(el).display === 'none'

    if (oculto) {
      restauracoes.push({
        element: el,
        className: el.className,
        display: el.style.display,
      })
      el.classList.remove(
        'hidden',
        'md:hidden',
        'lg:hidden',
        'sm:hidden',
        'xl:hidden',
      )
      if (window.getComputedStyle(el).display === 'none') {
        el.style.display = 'block'
      }
    }
  })

  return () => {
    for (const { element, className, display } of restauracoes) {
      element.className = className
      element.style.display = display
    }
    root.style.visibility = ''
    root.style.opacity = ''
    root.style.display = ''
    root.querySelectorAll<HTMLElement>('[data-pdf-section]').forEach((el) => {
      el.style.display = ''
      el.style.visibility = ''
      el.style.opacity = ''
    })
  }
}

interface DimensoesImagem {
  larguraMm: number
  alturaMm: number
  xMm: number
}

/** Converte canvas em dimensões mm, centralizando horizontalmente na área útil. */
function calcularDimensoesImagem(
  canvas: HTMLCanvasElement,
  larguraUtilMm: number,
  margemMm: number,
): DimensoesImagem {
  const pageWidth = 210
  const larguraMm = larguraUtilMm
  const alturaMm = (canvas.height * larguraMm) / canvas.width
  const areaUtilTotal = pageWidth - margemMm * 2
  const xMm = margemMm + Math.max(0, (areaUtilTotal - larguraMm) / 2)

  return { larguraMm, alturaMm, xMm }
}

function canvasParaDataUrl(canvas: HTMLCanvasElement): string {
  if (FORMATO_IMAGEM === 'PNG') {
    return canvas.toDataURL('image/png', 1.0)
  }
  return canvas.toDataURL('image/jpeg', QUALIDADE_JPEG)
}

async function capturarElemento(el: HTMLElement): Promise<HTMLCanvasElement> {
  const largura = el.clientWidth || el.offsetWidth
  const altura = el.scrollHeight

  return html2canvas(el, {
    scale: ESCALA,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    width: largura,
    height: altura,
    x: 0,
    y: 0,
  })
}

/** Desenha fatias verticais de um canvas alto em uma ou mais páginas. */
function adicionarCanvasAltoAoPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  yInicialMm: number,
  larguraUtilMm: number,
  margemMm: number,
): number {
  const { larguraMm, alturaMm: alturaTotalMm, xMm } = calcularDimensoesImagem(
    canvas,
    larguraUtilMm,
    margemMm,
  )
  const pageHeight = pdf.internal.pageSize.getHeight()

  let restanteMm = alturaTotalMm
  let srcYPx = 0
  let yMm = yInicialMm

  while (restanteMm > 0.5) {
    const espacoPaginaMm = pageHeight - yMm - margemMm
    const fatiaMm = Math.min(restanteMm, espacoPaginaMm)

    if (fatiaMm <= 0) {
      pdf.addPage()
      yMm = margemMm
      continue
    }

    const fatiaPx = (fatiaMm / alturaTotalMm) * canvas.height
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = Math.max(1, Math.ceil(fatiaPx))
    const ctx = slice.getContext('2d')
    if (!ctx) break

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(
      canvas,
      0,
      srcYPx,
      canvas.width,
      fatiaPx,
      0,
      0,
      canvas.width,
      fatiaPx,
    )

    pdf.addImage(
      canvasParaDataUrl(slice),
      FORMATO_IMAGEM,
      xMm,
      yMm,
      larguraMm,
      fatiaMm,
    )

    restanteMm -= fatiaMm
    srcYPx += fatiaPx

    if (restanteMm > 0.5) {
      pdf.addPage()
      yMm = margemMm
    } else {
      yMm += fatiaMm
    }
  }

  return yMm
}

function adicionarCanvasAoPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  yAtual: number,
  larguraUtil: number,
  alturaUtil: number,
  pageHeight: number,
  margemMm: number,
  forcarNovaPagina = false,
): number {
  const { larguraMm, alturaMm: alturaSecaoMm, xMm } = calcularDimensoesImagem(
    canvas,
    larguraUtil,
    margemMm,
  )
  const espacoRestante = pageHeight - yAtual - margemMm

  if (forcarNovaPagina && yAtual > margemMm) {
    pdf.addPage()
    yAtual = margemMm
  } else if (
    alturaSecaoMm + GAP_SECAO_MM > espacoRestante &&
    yAtual > margemMm
  ) {
    pdf.addPage()
    yAtual = margemMm
  }

  if (alturaSecaoMm <= alturaUtil) {
    pdf.addImage(
      canvasParaDataUrl(canvas),
      FORMATO_IMAGEM,
      xMm,
      yAtual,
      larguraMm,
      alturaSecaoMm,
    )
    return yAtual + alturaSecaoMm + GAP_SECAO_MM
  }

  if (yAtual > margemMm) {
    pdf.addPage()
    yAtual = margemMm
  }

  yAtual = adicionarCanvasAltoAoPdf(
    pdf,
    canvas,
    yAtual,
    larguraUtil,
    margemMm,
  )
  return yAtual + GAP_SECAO_MM
}

function adicionarRodapeAoPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  yAtual: number,
  larguraUtil: number,
  pageHeight: number,
  margemMm: number,
): void {
  const { larguraMm, alturaMm, xMm } = calcularDimensoesImagem(
    canvas,
    larguraUtil,
    margemMm,
  )
  const espacoAposConteudo = pageHeight - yAtual - margemMm
  const espacoNecessario = alturaMm + RODAPE_GAP_MM

  if (espacoAposConteudo >= espacoNecessario) {
    pdf.addImage(
      canvasParaDataUrl(canvas),
      FORMATO_IMAGEM,
      xMm,
      yAtual + RODAPE_GAP_MM,
      larguraMm,
      alturaMm,
    )
    return
  }

  const yRodape = pageHeight - margemMm - alturaMm
  if (yRodape > yAtual + 2) {
    pdf.addImage(
      canvasParaDataUrl(canvas),
      FORMATO_IMAGEM,
      xMm,
      yRodape,
      larguraMm,
      alturaMm,
    )
    return
  }

  pdf.addPage()
  pdf.addImage(
    canvasParaDataUrl(canvas),
    FORMATO_IMAGEM,
    xMm,
    pageHeight - margemMm - alturaMm,
    larguraMm,
    alturaMm,
  )
}

function ehSecaoConteudo(secao: HTMLElement): boolean {
  const id = secao.getAttribute('data-pdf-section') ?? ''
  return id.length > 0 && !SECOES_ESTRUTURAIS.has(id)
}

function secaoTemAltura(secao: HTMLElement): boolean {
  const rect = secao.getBoundingClientRect()
  return secao.scrollHeight > 0 && rect.height > 0
}

/**
 * Captura o elemento visual do relatório e faz download do PDF.
 * Pagina por blocos lógicos marcados com `data-pdf-section`.
 * Se não houver seções de conteúdo, captura o container inteiro.
 */
export async function exportarRelatorioGeralPDF(
  elementRef: HTMLElement,
  nomeArquivo: string,
): Promise<void> {
  const scrollX = window.scrollX
  const scrollY = window.scrollY

  elementRef.classList.add('relatorio-pdf-capture')
  window.scrollTo(0, 0)
  await aguardarRecursos(elementRef)

  const restaurarVisibilidade = forcarVisibilidadeCaptura(elementRef)
  await aguardarRecursos(elementRef)

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const larguraUtil = pageWidth - MARGEM_MM * 2
    const alturaUtil = pageHeight - MARGEM_MM * 2

    const secoes = Array.from(
      elementRef.querySelectorAll<HTMLElement>('[data-pdf-section]'),
    )
    const rodapeEl = secoes.find(
      (s) => s.getAttribute('data-pdf-section') === 'rodape',
    )
    const secoesCaptura = secoes.filter(
      (s) => s.getAttribute('data-pdf-section') !== 'rodape',
    )
    const secoesConteudo = secoesCaptura.filter(ehSecaoConteudo)
    const usarFallbackMonolitico = secoesConteudo.length === 0

    if (usarFallbackMonolitico) {
      console.warn(
        '[PDF] Nenhuma seção de conteúdo encontrada; captura monolítica do container.',
      )
    }

    let yAtual = MARGEM_MM
    let alturaConteudoPx = 0

    if (usarFallbackMonolitico) {
      const alvo =
        elementRef.querySelector<HTMLElement>('[data-pdf-root]') ?? elementRef

      if (!secaoTemAltura(alvo)) {
        throw new ErroPdfSemConteudo()
      }

      const canvas = await capturarElemento(alvo)
      alturaConteudoPx = canvas.height
      yAtual = adicionarCanvasAoPdf(
        pdf,
        canvas,
        yAtual,
        larguraUtil,
        alturaUtil,
        pageHeight,
        MARGEM_MM,
      )
    } else {
      for (const secao of secoesCaptura) {
        if (!secaoTemAltura(secao)) {
          console.warn(
            `[PDF] Seção "${secao.getAttribute('data-pdf-section')}" com altura 0; ignorada.`,
          )
          continue
        }

        const canvas = await capturarElemento(secao)

        if (ehSecaoConteudo(secao)) {
          alturaConteudoPx += canvas.height
        }

        yAtual = adicionarCanvasAoPdf(
          pdf,
          canvas,
          yAtual,
          larguraUtil,
          alturaUtil,
          pageHeight,
          MARGEM_MM,
        )
      }
    }

    if (alturaConteudoPx < ALTURA_MIN_CONTEUDO_PX) {
      throw new ErroPdfSemConteudo()
    }

    if (rodapeEl && secaoTemAltura(rodapeEl)) {
      const canvasRodape = await capturarElemento(rodapeEl)
      adicionarRodapeAoPdf(
        pdf,
        canvasRodape,
        yAtual,
        larguraUtil,
        pageHeight,
        MARGEM_MM,
      )
    }

    const nome =
      nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`
    pdf.save(nome)
  } finally {
    restaurarVisibilidade()
    elementRef.classList.remove('relatorio-pdf-capture')
    window.scrollTo(scrollX, scrollY)
  }
}
