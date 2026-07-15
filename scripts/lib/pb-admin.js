/**
 * Helpers compartilhados para scripts que usam a API admin do PocketBase 0.23+.
 */

export const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'

export const USERS_COLLECTION = 'users'

export const REQUIRED_COLLECTIONS = [
  USERS_COLLECTION,
  'veiculos',
  'compras',
  'vendas',
  'despesas',
  'configuracoes',
  'simulacoes',
]

/** Campo customizado usado para detectar schema incompleto (import antigo com `schema`). */
const SCHEMA_PROBE_COLLECTION = 'veiculos'
const SCHEMA_PROBE_FIELD = 'placa'
const VEICULOS_PROPRIEDADE_PROBE_FIELD = 'tipo_propriedade'
const DESPESAS_PROBE_COLLECTION = 'despesas'
const DESPESAS_PROBE_FIELD = 'pago_por'
const DESPESAS_REEMBOLSO_PROBE_FIELD = 'reembolsado'
const VEICULOS_COMPRA_PESSOAL_PROBE_FIELD = 'compra_pessoal_reembolsada'
const VEICULOS_DEVOLUCAO_VENDA_PROBE_FIELD = 'investimento_pessoal_devolvido'
const VEICULOS_FUNDING_MANUAL_PROBE_FIELD = 'compra_funding_manual'
const VEICULOS_FUNDING_SOCIO_PROBE_FIELD = 'compra_funding_pessoal_meia_socio'
const VEICULOS_DATA_ANUNCIO_PROBE_FIELD = 'data_anuncio'
const CONFIGURACOES_COLLECTION = 'configuracoes'
const CONFIGURACOES_CAPITAL_PROBE_FIELD = 'capital_inicial_pessoal'
const AUTODATE_PROBE_FIELD = 'created'

export async function checkPbHealth() {
  const res = await fetch(`${PB_URL}/api/health`)
  return res.ok
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: token,
  }
}

export async function authSuperuser(email, password) {
  const res = await fetch(
    `${PB_URL}/api/collections/_superusers/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    },
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao autenticar superuser (${res.status}): ${body}`)
  }

  const data = await res.json()
  return data.token
}

export async function listCollections(token) {
  const res = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao listar collections (${res.status}): ${body}`)
  }

  const data = await res.json()
  return Array.isArray(data) ? data : data.items || []
}

export async function listCollectionNames(token) {
  const items = await listCollections(token)
  return items.map((c) => c.name)
}

export function missingCollections(existingNames) {
  return REQUIRED_COLLECTIONS.filter((n) => !existingNames.includes(n))
}

export function collectionFieldNames(collection) {
  return (collection?.fields || []).map((f) => f.name)
}

export function findAuthUsersCollection(collections) {
  return collections.find(
    (c) => c.name === USERS_COLLECTION && c.type === 'auth',
  )
}

/**
 * Detecta se o schema precisa ser (re)importado:
 * - collection `users` ausente
 * - collections do app sem campos customizados (import com formato `schema` antigo)
 */
export function needsSchemaImport(collections) {
  const byName = new Map(collections.map((c) => [c.name, c]))
  const missing = missingCollections([...byName.keys()])

  if (missing.length > 0) {
    return {
      needed: true,
      reason: `collections faltando: ${missing.join(', ')}`,
    }
  }

  const users = findAuthUsersCollection(collections)
  if (!users) {
    return {
      needed: true,
      reason: 'collection auth `users` ausente (login do app não funcionará)',
    }
  }

  const probe = byName.get(SCHEMA_PROBE_COLLECTION)
  const fieldNames = collectionFieldNames(probe)
  if (!fieldNames.includes(SCHEMA_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collections existem mas campos estão incompletos (reimporte o pb_schema.json no formato PocketBase 0.23+)',
    }
  }

  if (!fieldNames.includes(AUTODATE_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collections sem campos created/updated — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_PROPRIEDADE_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campo tipo_propriedade — reimporte pocketbase/pb_schema.json',
    }
  }

  const despesas = byName.get(DESPESAS_PROBE_COLLECTION)
  const despesaFields = collectionFieldNames(despesas)
  if (!despesaFields.includes(DESPESAS_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection despesas sem campo pago_por — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!despesaFields.includes(DESPESAS_REEMBOLSO_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection despesas sem campo reembolsado — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_COMPRA_PESSOAL_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campo compra_pessoal_reembolsada — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_DEVOLUCAO_VENDA_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campo investimento_pessoal_devolvido — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_FUNDING_MANUAL_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campos compra_funding_* — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_FUNDING_SOCIO_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campos compra_funding_*_meia_socio — reimporte pocketbase/pb_schema.json',
    }
  }

  if (!fieldNames.includes(VEICULOS_DATA_ANUNCIO_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection veiculos sem campo data_anuncio — reimporte pocketbase/pb_schema.json',
    }
  }

  const config = byName.get(CONFIGURACOES_COLLECTION)
  const configFields = collectionFieldNames(config)
  if (!configFields.includes(CONFIGURACOES_CAPITAL_PROBE_FIELD)) {
    return {
      needed: true,
      reason:
        'collection configuracoes sem campo capital_inicial_pessoal — reimporte pocketbase/pb_schema.json',
    }
  }

  return { needed: false }
}
