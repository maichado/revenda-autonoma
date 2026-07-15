// Utilitários de compartilhamento do módulo Relatórios.
//
// Cobre os 3 caminhos exigidos pela spec:
//   • Copiar para clipboard (com fallback para `execCommand`)
//   • Abrir wa.me em nova aba (com detecção de overflow do limite de URL)
//   • Baixar arquivo .txt (UTF-8 + BOM, para Excel/Notepad BR abrirem ok)

/**
 * Acima deste tamanho de TEXTO mostramos aviso na UI — o limite do wa.me
 * fica em ~2048 chars de URL, e o encoding URL costuma inflar ~1.5–2x.
 * 1500 caracteres "crus" é uma margem segura para a maioria dos casos.
 */
export const LIMITE_TEXTO_AVISO = 1500

/** Limite real do tamanho de URL aceito pelo wa.me em diversos clientes. */
const LIMITE_URL_WA = 2000

// -----------------------------------------------------------------------------
// Clipboard
// -----------------------------------------------------------------------------

export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(texto)
      return true
    }
  } catch {
    // Cai no fallback abaixo.
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = texto
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// -----------------------------------------------------------------------------
// WhatsApp Web (wa.me)
// -----------------------------------------------------------------------------

export interface ResultadoCompartilhar {
  ok: boolean
  motivo?: 'overflow' | 'bloqueado'
  tamanhoUrl: number
}

/**
 * Abre `https://wa.me/?text=<texto>` em uma nova aba. Quando a URL ficaria
 * acima do limite seguro, retorna `{ ok: false, motivo: 'overflow' }` para
 * que a página possa cair em "Copiar texto" + toast informativo.
 */
export function compartilharWhatsApp(texto: string): ResultadoCompartilhar {
  const encoded = encodeURIComponent(texto)
  const url = `https://wa.me/?text=${encoded}`
  const tamanhoUrl = url.length
  if (tamanhoUrl > LIMITE_URL_WA) {
    return { ok: false, motivo: 'overflow', tamanhoUrl }
  }
  const win =
    typeof window !== 'undefined'
      ? window.open(url, '_blank', 'noopener,noreferrer')
      : null
  if (!win) {
    return { ok: false, motivo: 'bloqueado', tamanhoUrl }
  }
  return { ok: true, tamanhoUrl }
}

// -----------------------------------------------------------------------------
// Download .txt
// -----------------------------------------------------------------------------

export function baixarTexto(nomeArquivo: string, texto: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + texto], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
