/**
 * Zera reembolsado / compra_pessoal_reembolsada / investimento_pessoal_devolvido
 * em todos os registros — quando nada foi devolvido de fato.
 *
 * Uso (PocketBase rodando + .env.pb.local):
 *   node scripts/reset-banco-pessoal-devolucoes.js
 */

import {
  PB_URL,
  authHeaders,
  authSuperuser,
  checkPbHealth,
} from './lib/pb-admin.js'

const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD

async function listAll(token, collection) {
  const items = []
  let page = 1
  while (true) {
    const res = await fetch(
      `${PB_URL}/api/collections/${collection}/records?perPage=200&page=${page}`,
      { headers: authHeaders(token) },
    )
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    items.push(...(data.items || []))
    if (page >= (data.totalPages || 1)) break
    page += 1
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
  if (!res.ok) throw new Error(await res.text())
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Defina PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD (.env.pb.local)')
    process.exit(1)
  }
  if (!(await checkPbHealth())) {
    console.error(`PocketBase não responde em ${PB_URL}`)
    process.exit(1)
  }

  const token = await authSuperuser(ADMIN_EMAIL, ADMIN_PASSWORD)
  let nDesp = 0
  let nVeic = 0

  for (const d of await listAll(token, 'despesas')) {
    if (d.reembolsado) {
      await patchRecord(token, 'despesas', d.id, { reembolsado: false })
      nDesp += 1
    }
  }

  for (const v of await listAll(token, 'veiculos')) {
    if (v.compra_pessoal_reembolsada || v.investimento_pessoal_devolvido) {
      await patchRecord(token, 'veiculos', v.id, {
        compra_pessoal_reembolsada: false,
        investimento_pessoal_devolvido: false,
      })
      nVeic += 1
    }
  }

  console.log(`✓ Despesas resetadas: ${nDesp}`)
  console.log(`✓ Veículos resetados: ${nVeic}`)
  console.log('Recarregue o app (F5) para ver os pendentes.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
