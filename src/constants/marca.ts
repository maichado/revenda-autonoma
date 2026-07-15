/** Nome e slug padrão do produto (antes de personalizar em Configurações). */
export const NOME_REVENDA_PADRAO = 'Revenda Autônoma'
export const SLUG_ARQUIVO_REVENDA = 'revenda-autonoma'

const NOMES_LEGADOS = new Set(['GM Revenda', 'MG Revenda', 'Gm Revenda'])

/** Normaliza nomes legados salvos em backups/PocketBase. */
export function normalizarNomeRevenda(nome: string | undefined | null): string {
  const limpo = String(nome ?? '').trim()
  if (!limpo || NOMES_LEGADOS.has(limpo)) return NOME_REVENDA_PADRAO
  return limpo
}

/** Primeira palavra do nome (ex.: abreviação no header). */
export function abreviarNomeRevenda(nome: string | undefined | null): string {
  const base = (nome?.trim() || NOME_REVENDA_PADRAO).trim()
  return base.split(/\s+/)[0] || NOME_REVENDA_PADRAO
}
