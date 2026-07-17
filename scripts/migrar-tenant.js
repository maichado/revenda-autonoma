/**
 * Atribui tenant aos usuários e registros legados (dados compartilhados da equipe).
 * Rode após importar o schema com o campo `tenant`.
 *
 *   .\\scripts\\load-pb-secrets.ps1  (ou defina PB_ADMIN_*)
 *   node scripts/migrar-tenant.js
 */

import {
  PB_URL,
  authHeaders,
  authSuperuser,
  checkPbHealth,
  listCollections,
} from './lib/pb-admin.js'

const TENANT_PRINCIPAL = 'rvd-autonoma-principal'

const COLLECTIONS_COM_TENANT = [
  'veiculos',
  'compras',
  'vendas',
  'despesas',
  'configuracoes',
  'simulacoes',
  'bp_carros',
  'bp_lancamentos',
]

async function listarTodos(token, collection) {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?page=${page}&perPage=200`,
      { headers: authHeaders(token) },
    )
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Listar ${collection} (${res.status}): ${body}`)
    }
    const data = await res.json()
    items.push(...(data.items || []))
    if (page >= (data.totalPages || 1)) break
    page++
  }
  return items
}

async function patchRecord(token, collection, id, body) {
  const res = await fetch(
    `${PB_URL}/api/collections/${collection}/records/${id}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Patch ${collection}/${id} (${res.status}): ${err}`)
  }
}

async function main() {
  if (!(await checkPbHealth())) {
    throw new Error('PocketBase offline.')
  }

  const email = process.env.PB_ADMIN_EMAIL
  const password = process.env.PB_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('Defina PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD.')
  }

  const token = await authSuperuser(email, password)
  const collections = await listCollections(token)
  const names = new Set(collections.map((c) => c.name))

  console.log(`Tenant principal (equipe): ${TENANT_PRINCIPAL}\n`)

  const users = await listarTodos(token, 'users')
  let usersOk = 0
  for (const u of users) {
    if (u.tenant?.trim()) continue
    await patchRecord(token, 'users', u.id, { tenant: TENANT_PRINCIPAL })
    console.log(`  ✓ user ${u.email} → tenant principal`)
    usersOk++
  }
  if (usersOk === 0) console.log('  ↳ usuários já tinham tenant')

  for (const col of COLLECTIONS_COM_TENANT) {
    if (!names.has(col)) {
      console.log(`  ↳ ${col} — collection ausente, ignorada`)
      continue
    }
    const items = await listarTodos(token, col)
    let n = 0
    for (const item of items) {
      if (item.tenant?.trim()) continue
      const patch = { tenant: TENANT_PRINCIPAL }
      if (col === 'configuracoes' && !item.slug?.trim()) {
        patch.slug = TENANT_PRINCIPAL
      }
      await patchRecord(token, col, item.id, patch)
      n++
    }
    console.log(`  ✓ ${col}: ${n} registro(s) migrado(s)`)
  }

  console.log('\nMigração concluída.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
