// Grupo de 3 ações de compartilhamento, presente em todos os relatórios:
//   • Copiar texto (clipboard + toast)
//   • Abrir WhatsApp Web (wa.me; fallback automático para clipboard se URL
//     ficar grande demais)
//   • Baixar .txt (UTF-8 com BOM)

import { format } from 'date-fns'
import { SLUG_ARQUIVO_REVENDA } from '@/constants/marca'
import { Copy, Download, FileDown, MessageCircle } from 'lucide-react'
import { Button } from './Button'
import { useToast } from '@/hooks/useToast'
import {
  baixarTexto,
  compartilharWhatsApp,
  copiarTexto,
} from '@/utils/compartilhar'

interface Props {
  texto: string
  /** Slug curto para o nome do arquivo (ex.: "geral", "vendas"). */
  slug: string
  /** Quando informado, exibe o botão "Gerar PDF". */
  onGerarPdf?: () => void | Promise<void>
  gerandoPdf?: boolean
}

export function AcoesCompartilhamento({
  texto,
  slug,
  onGerarPdf,
  gerandoPdf = false,
}: Props) {
  const toast = useToast()

  async function aoCopiar() {
    const ok = await copiarTexto(texto)
    if (ok) {
      toast.success('Copiado para a área de transferência')
    } else {
      toast.error(
        'Não foi possível copiar',
        'Seu navegador bloqueou o acesso ao clipboard.',
      )
    }
  }

  async function aoAbrirWhatsApp() {
    const r = compartilharWhatsApp(texto)
    if (r.ok) {
      toast.success('Abrindo WhatsApp Web', 'Escolha o contato para enviar.')
      return
    }
    if (r.motivo === 'overflow') {
      // Fallback automático: copia para o clipboard e orienta o usuário.
      const copiou = await copiarTexto(texto)
      if (copiou) {
        toast.warning(
          'Texto muito longo para o link wa.me',
          'Copiamos o conteúdo — cole direto na conversa do WhatsApp.',
        )
      } else {
        toast.error(
          'Texto muito longo e clipboard indisponível',
          'Use "Baixar .txt" e anexe no WhatsApp Desktop.',
        )
      }
      return
    }
    if (r.motivo === 'bloqueado') {
      toast.warning(
        'Janela bloqueada pelo navegador',
        'Permita pop-ups para abrir o WhatsApp Web a partir do sistema.',
      )
    }
  }

  function aoBaixar() {
    const hoje = format(new Date(), 'yyyy-MM-dd')
    baixarTexto(`relatorio_${slug}_${SLUG_ARQUIVO_REVENDA}_${hoje}.txt`, texto)
    toast.success(
      'Arquivo gerado',
      `relatorio_${slug}_${SLUG_ARQUIVO_REVENDA}_${hoje}.txt baixado.`,
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Copy size={14} />}
        onClick={aoCopiar}
      >
        Copiar texto
      </Button>
      <Button
        variant="primary"
        size="sm"
        leftIcon={<MessageCircle size={14} />}
        onClick={aoAbrirWhatsApp}
      >
        Abrir WhatsApp Web
      </Button>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<Download size={14} />}
        onClick={aoBaixar}
      >
        Baixar .txt
      </Button>
      {onGerarPdf && (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<FileDown size={14} />}
          onClick={() => void onGerarPdf()}
          disabled={gerandoPdf}
        >
          {gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF'}
        </Button>
      )}
    </div>
  )
}
