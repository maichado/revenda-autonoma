/**
 * Simula criação de veículo CXA6J23 no PocketBase para diagnosticar falha de import.
 * Uso: node scripts/test-import-veiculo.mjs
 */
import { authSuperuser, PB_URL, authHeaders } from './lib/pb-admin.js'

const EMAIL = process.env.PB_APP_EMAIL || 'maicon@gmrevenda.local'
const PASSWORD = process.env.PB_APP_PASSWORD || 'GmRevenda2024!'

// ~2.5MB base64 payload (excede maxSize 2000000 do campo fotos)
const FOTO_GRANDE = 'data:image/jpeg;base64,' + 'A'.repeat(2_500_000)

const veiculoBase = {
  placa: 'CXA6J23',
  marca: 'Chevrolet',
  modelo: 'Onix',
  ano: 2019,
  cor: 'Prata',
  quilometragem: 45000,
  data_compra: '2025-03-15',
  valor_compra: 42000,
  valor_fipe: 48000,
  valor_venda_pretendido: 52000,
  status: 'disponível',
  observacoes: 'Teste import',
  despesas_vinculadas: [],
}

async function authAppUser() {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Auth app user failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.token
}

async function tryCreate(token, label, body) {
  const res = await fetch(`${PB_URL}/api/collections/veiculos/records`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  console.log(`\n=== ${label} (${res.status}) ===`)
  console.log(JSON.stringify(json, null, 2))
  return { status: res.status, json }
}

async function main() {
  console.log(`PB: ${PB_URL}`)
  const token = await authAppUser()
  console.log(`Autenticado como ${EMAIL}`)

  await tryCreate(token, 'Com fotos grandes (backup típico)', {
    ...veiculoBase,
    fotos: [FOTO_GRANDE],
  })

  await tryCreate(token, 'Sem fotos (import corrigido)', {
    ...veiculoBase,
    placa: 'CXA6J24',
    fotos: [],
  })

  await tryCreate(token, 'Status sem acento', {
    ...veiculoBase,
    placa: 'CXA6J25',
    status: 'disponivel',
    fotos: [],
  })

  await tryCreate(token, 'Data ISO longa', {
    ...veiculoBase,
    placa: 'CXA6J26',
    data_compra: '2025-03-15T00:00:00.000Z',
    fotos: [],
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
