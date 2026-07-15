/** IDs compatíveis com PocketBase (15 caracteres a-z0-9). */

import type { EstadoImportavel } from '@/store/useStore'

const PB_ID_RE = /^[a-z0-9]{15}$/
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function isPbId(id: string): boolean {
  return PB_ID_RE.test(id)
}

/** Gera um id de 15 caracteres aceito pelo PocketBase em creates customizados. */
export function novoIdPb(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(15))
    let id = ''
    for (let i = 0; i < 15; i++) {
      id += CHARS[bytes[i]! % CHARS.length]
    }
    return id
  }
  let id = ''
  for (let i = 0; i < 15; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return id
}

/** Remove `id` do body quando não é válido para o PocketBase (ex.: UUID legado). */
export function preparePbCreateBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const id = body.id
  if (typeof id === 'string' && isPbId(id)) return body
  const { id: _omit, ...rest } = body
  return rest
}

/** Importação em bloco: sempre deixa o PocketBase gerar ids novos (evita colisão). */
export function preparePbImportCreateBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const { id: _omit, ...rest } = body
  return rest
}

/**
 * Garante ids PB-compatíveis e referências cruzadas coerentes antes de
 * enviar um backup legado (UUID, seed `veic-001`, etc.) ao PocketBase.
 */
export function remapEstadoIdsParaPb(estado: EstadoImportavel): EstadoImportavel {
  const idMap = new Map<string, string>()

  const registrarId = (antigo: string): string => {
    const existente = idMap.get(antigo)
    if (existente) return existente
    const novo = isPbId(antigo) ? antigo : novoIdPb()
    idMap.set(antigo, novo)
    return novo
  }

  for (const v of estado.veiculos) registrarId(v.id)
  for (const c of estado.compras) registrarId(c.id)
  for (const v of estado.vendas) registrarId(v.id)
  for (const d of estado.despesas) registrarId(d.id)
  for (const v of estado.veiculos) {
    for (const dId of v.despesas_vinculadas ?? []) registrarId(dId)
  }
  for (const c of estado.compras) registrarId(c.veiculo_id)
  for (const v of estado.vendas) registrarId(v.veiculo_id)
  for (const d of estado.despesas) {
    if (d.veiculo_id) registrarId(d.veiculo_id)
  }

  const mapRef = (antigo: string): string => idMap.get(antigo) ?? antigo

  return {
    veiculos: estado.veiculos.map((v) => ({
      ...v,
      id: mapRef(v.id),
      despesas_vinculadas: (v.despesas_vinculadas ?? []).map(mapRef),
    })),
    compras: estado.compras.map((c) => ({
      ...c,
      id: mapRef(c.id),
      veiculo_id: mapRef(c.veiculo_id),
    })),
    vendas: estado.vendas.map((v) => ({
      ...v,
      id: mapRef(v.id),
      veiculo_id: mapRef(v.veiculo_id),
    })),
    despesas: estado.despesas.map((d) => ({
      ...d,
      id: mapRef(d.id),
      veiculo_id: d.veiculo_id ? mapRef(d.veiculo_id) : undefined,
      pago_por: d.pago_por ?? '',
    })),
    configuracoes: estado.configuracoes,
  }
}
