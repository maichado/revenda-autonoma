// Consulta à Tabela FIPE (API pública parallelum, gratuita e com CORS liberado).
//
// A FIPE não busca por placa — trabalha por Marca → Modelo → Ano. Como o
// usuário digita em texto livre ("VOLKSWAGEN", "GOLF 1.6", 2015), fazemos um
// casamento aproximado (normalizando acentos/caixa e pontuando por palavras em
// comum) para achar o item mais provável e devolver o valor FIPE.

const BASE = 'https://parallelum.com.br/fipe/api/v1/carros'
const TIMEOUT_MS = 9000

export interface FipeResultado {
  /** Valor FIPE em número (ex.: 45492). */
  valor: number
  /** Marca canônica (sem o prefixo "VW - "). */
  marca: string
  /** Modelo canônico da FIPE. */
  modelo: string
  /** Ano-modelo. */
  ano: number
  combustivel: string
  codigoFipe: string
  mesReferencia: string
}

export type FipeBusca =
  | { ok: true; resultado: FipeResultado }
  | { ok: false; motivo: string }

interface ItemFipe {
  codigo: string | number
  nome: string
}

/** Item de lista da FIPE (marca, modelo ou ano) para telas de seleção. */
export interface FipeItem {
  codigo: string
  nome: string
}

/** Remove acentos, caixa e espaços redundantes para comparação. */
function normalizar(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Palavras "úteis" de um texto (ignora conectores curtos). */
function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9.]+/)
    .filter((t) => t.length > 0)
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, signal ? { signal } : undefined)
  if (!res.ok) throw new Error(`FIPE HTTP ${res.status}`)
  return (await res.json()) as T
}

/** Executa um fetch com timeout próprio (para chamadas avulsas de listagem). */
async function comTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fn(controller.signal)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('A consulta à FIPE demorou demais. Tente novamente.')
    }
    throw new Error('Não foi possível consultar a FIPE. Verifique a internet.')
  } finally {
    clearTimeout(timer)
  }
}

const paraItem = (i: ItemFipe): FipeItem => ({
  codigo: String(i.codigo),
  nome: String(i.nome),
})

/** Lista todas as marcas de carros da FIPE (ordenadas por nome). */
export async function listarMarcas(): Promise<FipeItem[]> {
  const marcas = await comTimeout((s) =>
    getJson<ItemFipe[]>(`${BASE}/marcas`, s),
  )
  return marcas
    .map(paraItem)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Lista os modelos de uma marca. */
export async function listarModelos(codigoMarca: string): Promise<FipeItem[]> {
  const resp = await comTimeout((s) =>
    getJson<{ modelos: ItemFipe[] }>(`${BASE}/marcas/${codigoMarca}/modelos`, s),
  )
  return (resp.modelos ?? [])
    .map(paraItem)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Lista os anos-modelo disponíveis para um modelo. */
export async function listarAnos(
  codigoMarca: string,
  codigoModelo: string,
): Promise<FipeItem[]> {
  const anos = await comTimeout((s) =>
    getJson<ItemFipe[]>(
      `${BASE}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`,
      s,
    ),
  )
  return anos.map(paraItem)
}

/** Busca o valor FIPE a partir dos códigos exatos de marca/modelo/ano. */
export async function buscarValorPorCodigos(
  codigoMarca: string,
  codigoModelo: string,
  codigoAno: string,
): Promise<FipeResultado> {
  const valorResp = await comTimeout((s) =>
    getJson<Record<string, string | number>>(
      `${BASE}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`,
      s,
    ),
  )
  return {
    valor: parseValorFipe(String(valorResp.Valor ?? '')),
    marca: limparMarca(String(valorResp.Marca ?? '')),
    modelo: String(valorResp.Modelo ?? ''),
    ano: Number(valorResp.AnoModelo ?? 0),
    combustivel: String(valorResp.Combustivel ?? ''),
    codigoFipe: String(valorResp.CodigoFipe ?? ''),
    mesReferencia: String(valorResp.MesReferencia ?? ''),
  }
}

/** "R$ 45.492,00" → 45492 */
function parseValorFipe(bruto: string): number {
  const limpo = String(bruto ?? '')
    .replace(/[^\d,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

/** Escolhe a marca cujo nome melhor casa com o texto digitado. */
function acharMarca(marcas: ItemFipe[], marcaDigitada: string): ItemFipe | undefined {
  const alvo = normalizar(marcaDigitada)
  if (!alvo) return undefined

  let melhor: { item: ItemFipe; pontos: number } | undefined
  for (const m of marcas) {
    const nome = normalizar(m.nome)
    let pontos = 0
    if (nome === alvo) pontos = 100
    else if (nome.includes(alvo) || alvo.includes(nome)) pontos = 60
    else {
      // Palavras em comum (ex.: "gm - chevrolet" vs "chevrolet").
      const tksNome = new Set(tokens(m.nome))
      pontos = tokens(marcaDigitada).filter((t) => tksNome.has(t)).length * 10
    }
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) {
      melhor = { item: m, pontos }
    }
  }
  return melhor?.item
}

/** Escolhe o modelo com mais palavras em comum com o texto digitado. */
function acharModelo(
  modelos: ItemFipe[],
  modeloDigitado: string,
): ItemFipe | undefined {
  const tksAlvo = tokens(modeloDigitado)
  if (tksAlvo.length === 0) return undefined

  let melhor: { item: ItemFipe; pontos: number; tamanho: number } | undefined
  for (const m of modelos) {
    const tksNome = tokens(m.nome)
    const setNome = new Set(tksNome)
    const comuns = tksAlvo.filter((t) => setNome.has(t)).length
    if (comuns === 0) continue
    const tamanho = tksNome.length
    // Mais palavras em comum vence; empate → nome mais curto (mais genérico).
    if (
      !melhor ||
      comuns > melhor.pontos ||
      (comuns === melhor.pontos && tamanho < melhor.tamanho)
    ) {
      melhor = { item: m, pontos: comuns, tamanho }
    }
  }
  return melhor?.item
}

/** Escolhe o ano-modelo que começa com o ano digitado. */
function acharAno(anos: ItemFipe[], anoDigitado: number): ItemFipe | undefined {
  const alvo = String(anoDigitado)
  const candidatos = anos.filter(
    (a) => String(a.nome).startsWith(alvo) || String(a.codigo).startsWith(alvo),
  )
  if (candidatos.length === 0) return undefined
  // Preferência de combustível: Flex > Gasolina > primeiro encontrado.
  return (
    candidatos.find((a) => /flex/i.test(a.nome)) ??
    candidatos.find((a) => /gasolina/i.test(a.nome)) ??
    candidatos[0]
  )
}

function limparMarca(nome: string): string {
  // "VW - VolksWagen" → "VolksWagen"; "GM - Chevrolet" → "Chevrolet".
  const partes = String(nome).split(' - ')
  return (partes.length > 1 ? partes[1] : nome).trim()
}

/**
 * Busca a FIPE tentando casar automaticamente marca/modelo/ano digitados.
 * Retorna o valor e os dados canônicos da FIPE, ou um motivo de falha.
 */
export async function buscarFipeAuto(params: {
  marca: string
  modelo: string
  ano: number
}): Promise<FipeBusca> {
  const { marca, modelo, ano } = params
  if (!marca.trim() || !modelo.trim() || !ano) {
    return { ok: false, motivo: 'Preencha marca, modelo e ano.' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const marcas = await getJson<ItemFipe[]>(`${BASE}/marcas`, controller.signal)
    const marcaItem = acharMarca(marcas, marca)
    if (!marcaItem) {
      return { ok: false, motivo: `Marca "${marca}" não encontrada na FIPE.` }
    }

    const modelosResp = await getJson<{ modelos: ItemFipe[] }>(
      `${BASE}/marcas/${marcaItem.codigo}/modelos`,
      controller.signal,
    )
    const modeloItem = acharModelo(modelosResp.modelos ?? [], modelo)
    if (!modeloItem) {
      return {
        ok: false,
        motivo: `Modelo "${modelo}" não encontrado em ${limparMarca(marcaItem.nome)}.`,
      }
    }

    const anos = await getJson<ItemFipe[]>(
      `${BASE}/marcas/${marcaItem.codigo}/modelos/${modeloItem.codigo}/anos`,
      controller.signal,
    )
    const anoItem = acharAno(anos, ano)
    if (!anoItem) {
      return {
        ok: false,
        motivo: `Ano ${ano} não disponível na FIPE para esse modelo.`,
      }
    }

    const valorResp = await getJson<Record<string, string | number>>(
      `${BASE}/marcas/${marcaItem.codigo}/modelos/${modeloItem.codigo}/anos/${anoItem.codigo}`,
      controller.signal,
    )

    return {
      ok: true,
      resultado: {
        valor: parseValorFipe(String(valorResp.Valor ?? '')),
        marca: limparMarca(String(valorResp.Marca ?? marcaItem.nome)),
        modelo: String(valorResp.Modelo ?? modeloItem.nome),
        ano: Number(valorResp.AnoModelo ?? ano),
        combustivel: String(valorResp.Combustivel ?? ''),
        codigoFipe: String(valorResp.CodigoFipe ?? ''),
        mesReferencia: String(valorResp.MesReferencia ?? ''),
      },
    }
  } catch (err) {
    const abortado = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      motivo: abortado
        ? 'A consulta à FIPE demorou demais. Tente novamente.'
        : 'Não foi possível consultar a FIPE agora. Verifique a internet.',
    }
  } finally {
    clearTimeout(timer)
  }
}
