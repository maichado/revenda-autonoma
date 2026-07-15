// Bolha visual estilo WhatsApp para preview do texto que será enviado.
//
// Detalhes visuais:
//   • Light mode: fundo verde-claro #DCF8C6 (cor canônica da mensagem enviada)
//   • Dark mode: fundo verde escuro #005C4B (idem, tema escuro do WhatsApp)
//   • Pequena "cauda" no canto superior direito para visual reconhecível
//   • Preserva quebras de linha do texto (white-space: pre-wrap)
//   • Marcador *texto* vira <strong>, _texto_ vira <em> — o WhatsApp faz isso
//     no app de verdade, então a bolha exibe o resultado equivalente.
//   • Rodapé exibe contador de caracteres com aviso quando passa do limite
//     seguro de URL do wa.me.

import { AlertTriangle, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMgRevenda } from './LogoMgRevenda'
import { LIMITE_TEXTO_AVISO } from '@/utils/compartilhar'

interface Props {
  texto: string
}

// -----------------------------------------------------------------------------
// Renderização "rich" do texto: aplica *negrito* e _itálico_ preservando as
// quebras de linha. Implementação simples baseada em parse linear de tokens.
// -----------------------------------------------------------------------------

function renderizarTextoWhatsApp(texto: string): ReactNode[] {
  const partes: ReactNode[] = []
  const regex = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g
  let lastIndex = 0
  let chave = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      partes.push(texto.slice(lastIndex, match.index))
    }
    const token = match[0]
    const interior = token.slice(1, -1)
    if (token.startsWith('*')) {
      partes.push(
        <strong key={`b-${chave++}`} className="font-semibold">
          {interior}
        </strong>,
      )
    } else if (token.startsWith('_')) {
      partes.push(
        <em key={`i-${chave++}`} className="italic">
          {interior}
        </em>,
      )
    } else {
      partes.push(
        <span key={`s-${chave++}`} className="line-through opacity-80">
          {interior}
        </span>,
      )
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < texto.length) {
    partes.push(texto.slice(lastIndex))
  }
  return partes
}

function horaAgora(): string {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function BolhaWhatsApp({ texto }: Props) {
  const totalChars = texto.length
  const proximoLimite = totalChars > LIMITE_TEXTO_AVISO

  return (
    <div className="flex flex-col gap-2">
      {/* Cabeçalho com contador */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle size={12} className="text-emerald-500" />
          Pré-visualização WhatsApp
        </span>
        <span
          className={[
            'tabular',
            proximoLimite
              ? 'font-semibold text-amber-600 dark:text-amber-400'
              : '',
          ].join(' ')}
          title={
            proximoLimite
              ? 'Texto longo — o link wa.me pode ultrapassar o limite e o navegador pode bloquear a abertura. Use "Copiar texto" ou "Baixar .txt".'
              : `Caracteres totais: ${totalChars}`
          }
        >
          {totalChars} caracteres
          {proximoLimite && ' — link wa.me pode ficar muito longo'}
        </span>
      </div>

      {/* "Janela do chat" — fundo neutro que destaca a bolha */}
      <div className="rounded-2xl border border-border-light bg-emerald-50/40 p-4 md:p-5 dark:border-border-dark dark:bg-emerald-950/20">
        <div className="ml-auto flex justify-end">
          <div className="relative max-w-full rounded-2xl rounded-tr-sm bg-[#DCF8C6] px-4 py-4 text-sm leading-relaxed text-zinc-900 shadow-sm dark:bg-[#005C4B] dark:text-zinc-50 md:px-5 md:py-5">
            <span
              aria-hidden
              className="absolute -right-1.5 top-0 block h-3 w-3 bg-[#DCF8C6] dark:bg-[#005C4B]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
            />
            <div className="mb-3 flex items-center border-b border-black/10 pb-2 dark:border-white/10">
              <LogoMgRevenda height={32} />
            </div>
            <pre
              className="m-0 max-w-full whitespace-pre-wrap break-words text-[13.5px] leading-[1.6]"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {renderizarTextoWhatsApp(texto)}
            </pre>
            <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] opacity-60">
              <span className="tabular">{horaAgora()}</span>
              <span aria-hidden>✓✓</span>
            </div>
          </div>
        </div>
      </div>

      {proximoLimite && (
        <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Texto extenso — prefira "Copiar texto" ou "Baixar .txt" caso o link do
          WhatsApp não abra direito.
        </p>
      )}
    </div>
  )
}
