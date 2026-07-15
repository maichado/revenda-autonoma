/** Nome e slug padrão da revenda (exibição e arquivos exportados). */
export const NOME_REVENDA_PADRAO = 'MG Revenda'
export const SLUG_ARQUIVO_REVENDA = 'mgrevenda'

/** Converte o nome legado "GM Revenda" salvo em backups/PocketBase. */
export function normalizarNomeRevenda(nome: string | undefined | null): string {
  const limpo = String(nome ?? '').trim()
  if (!limpo || limpo === 'GM Revenda') return NOME_REVENDA_PADRAO
  return limpo
}
