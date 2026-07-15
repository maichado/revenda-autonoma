/** Nome e slug padrão do produto (antes de personalizar em Configurações). */
export const NOME_REVENDA_PADRAO = 'RVD Autônoma'
export const SLUG_ARQUIVO_REVENDA = 'rvd-autonoma'
export const APP_SLUG = SLUG_ARQUIVO_REVENDA

const NOMES_LEGADOS = new Set([
  'GM Revenda',
  'MG Revenda',
  'Gm Revenda',
  'Revenda Autônoma',
  'revenda autonoma',
])

function normalizarChaveNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function ehNomeLegado(nome: string): boolean {
  const chave = normalizarChaveNome(nome)
  if (!chave) return true
  if (NOMES_LEGADOS.has(nome.trim())) return true
  return (
    chave === 'gm revenda' ||
    chave === 'mg revenda' ||
    chave === 'revenda autonoma' ||
    chave === 'revenda autônoma'
  )
}

/** Normaliza nomes legados salvos em backups/PocketBase. */
export function normalizarNomeRevenda(nome: string | undefined | null): string {
  const limpo = String(nome ?? '').trim()
  if (!limpo || ehNomeLegado(limpo)) return NOME_REVENDA_PADRAO
  return limpo
}

/** Primeira palavra do nome (ex.: abreviação no header). */
export function abreviarNomeRevenda(nome: string | undefined | null): string {
  const base = (nome?.trim() || NOME_REVENDA_PADRAO).trim()
  return base.split(/\s+/)[0] || NOME_REVENDA_PADRAO
}
