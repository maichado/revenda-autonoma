// Layout compartilhado pelos 5 relatórios.
//
// Em desktop (lg+): visual à esquerda, bolha do WhatsApp à direita.
// Em mobile/tablet: toggle "Visual" ↔ "WhatsApp" com uma view por vez.

import { format } from 'date-fns'
import { NOME_REVENDA_PADRAO, SLUG_ARQUIVO_REVENDA } from '@/constants/marca'
import { Eye, MessageCircle } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { AcoesCompartilhamento } from './AcoesCompartilhamento'
import { BolhaWhatsApp } from './BolhaWhatsApp'
import { RelatorioCabecalho } from './RelatorioCabecalho'
import { useToast } from '@/hooks/useToast'
import { exportarRelatorioGeralPDF, ErroPdfSemConteudo } from '@/utils/exportarPDF'

interface Props {
  titulo: string
  descricao?: string
  periodoLabel?: string
  visual: ReactNode
  texto: string
  slug: string
  /** Exibe botão "Gerar PDF" e captura a área visual do relatório. */
  habilitarPdf?: boolean
  /** Nome da revenda no rodapé do PDF (padrão: MG Revenda). */
  nomeRevenda?: string
}

type VisaoMobile = 'visual' | 'whatsapp'

export function RelatorioLayout({
  titulo,
  descricao,
  periodoLabel,
  visual,
  texto,
  slug,
  habilitarPdf = false,
  nomeRevenda = NOME_REVENDA_PADRAO,
}: Props) {
  const [visao, setVisao] = useState<VisaoMobile>('visual')
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const pdfAreaRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  async function aoGerarPdf() {
    const area = pdfAreaRef.current
    if (!area) return

    const visaoAnterior = visao
    if (visao !== 'visual') {
      setVisao('visual')
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
    }

    const rodape = area.querySelector<HTMLElement>('.relatorio-pdf-rodape')
    const agora = format(new Date(), 'dd/MM/yyyy HH:mm')
    if (rodape) {
      rodape.textContent = `${nomeRevenda} — gerado em ${agora}`
    }

    setGerandoPdf(true)
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await exportarRelatorioGeralPDF(
        area,
        `relatorio_${slug}_${SLUG_ARQUIVO_REVENDA}_${hoje}.pdf`,
      )
      toast.success('PDF gerado', `relatorio_${slug}_${SLUG_ARQUIVO_REVENDA}_${hoje}.pdf`)
    } catch (err) {
      if (err instanceof ErroPdfSemConteudo) {
        toast.error(
          'Não foi possível capturar o conteúdo do relatório',
          'Verifique se o relatório está visível e tente novamente.',
        )
      } else {
        toast.error(
          'Não foi possível gerar o PDF',
          'Tente novamente. Se o problema persistir, use "Baixar .txt".',
        )
      }
    } finally {
      setGerandoPdf(false)
      if (visaoAnterior !== 'visual') {
        setVisao(visaoAnterior)
      }
    }
  }

  return (
    <section className="space-y-4">
      <div className="no-print flex justify-end">
        <AcoesCompartilhamento
          texto={texto}
          slug={slug}
          onGerarPdf={habilitarPdf ? aoGerarPdf : undefined}
          gerandoPdf={gerandoPdf}
        />
      </div>

      <div
        role="tablist"
        aria-label="Visão do relatório"
        className="no-print inline-flex overflow-hidden rounded-lg border border-border-light bg-surface-light lg:hidden dark:border-border-dark dark:bg-surface-dark"
      >
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'visual'}
          onClick={() => setVisao('visual')}
          className={[
            'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
            visao === 'visual'
              ? 'bg-primary/15 text-primary'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
          ].join(' ')}
        >
          <Eye size={14} /> Visual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={visao === 'whatsapp'}
          onClick={() => setVisao('whatsapp')}
          className={[
            'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
            visao === 'whatsapp'
              ? 'bg-primary/15 text-primary'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
          ].join(' ')}
        >
          <MessageCircle size={14} /> WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div
          className={[
            visao !== 'visual' ? 'hidden lg:block' : '',
          ].join(' ')}
        >
          <div
            ref={pdfAreaRef}
            data-pdf-root
            className="relatorio-pdf-area relatorio-container mx-auto w-full max-w-4xl space-y-6 rounded-2xl border border-border-light bg-surface-light p-6 shadow-card md:p-8 dark:border-border-dark dark:bg-surface-dark dark:shadow-card-dark"
          >
            <RelatorioCabecalho
              titulo={titulo}
              periodoLabel={periodoLabel}
              subtitulo={descricao}
            />
            <div className="space-y-6">{visual}</div>
            <footer
              data-pdf-section="rodape"
              className="relatorio-pdf-rodape mt-6 border-t border-zinc-200 pt-6 text-center text-[10px] leading-relaxed text-zinc-400 dark:border-white/10 dark:text-zinc-500"
              aria-hidden="true"
            >
              {nomeRevenda}
            </footer>
          </div>
        </div>
        <div
          className={[
            'no-print lg:sticky lg:top-20 lg:self-start',
            visao !== 'whatsapp' ? 'hidden lg:block' : '',
          ].join(' ')}
        >
          <BolhaWhatsApp texto={texto} />
        </div>
      </div>
    </section>
  )
}
