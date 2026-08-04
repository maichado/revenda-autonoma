/**
 * Garante configuração padrão no PocketBase (sem criar usuários do app).
 *
 * Contas de login do aplicativo: use a aba "Criar conta" em http://localhost:5173
 * (ou crie usuários no painel Admin — sem senhas neste repositório).
 *
 * Pré-requisitos:
 *   1. PocketBase rodando (scripts/start-pocketbase.ps1)
 *   2. Superuser criado no primeiro `pocketbase serve`
 *   3. Collections importadas (pocketbase/pb_schema.json)
 *   4. PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD no ambiente (.env.pb.local)
 *
 * Uso:
 *   . .\scripts\load-pb-secrets.ps1
 *   node scripts/seed-pocketbase.js
 */

import {
  PB_URL,
  USERS_COLLECTION,
  authHeaders,
  authSuperuser,
  checkPbHealth,
  findAuthUsersCollection,
  listCollections,
  needsSchemaImport,
} from './lib/pb-admin.js'

const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD
const TENANT_PRINCIPAL = 'rvd-autonoma-principal'

async function authAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Defina PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD (superuser PocketBase em .env.pb.local).',
    )
    console.error(
      'Exemplo: . .\\scripts\\load-pb-secrets.ps1 ; node scripts/seed-pocketbase.js',
    )
    process.exit(1)
  }

  return authSuperuser(ADMIN_EMAIL, ADMIN_PASSWORD)
}

async function criarConfigPadrao(token) {
  const res = await fetch(
    `${PB_URL}/api/collections/configuracoes/records`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        id: 'config-default',
        slug: TENANT_PRINCIPAL,
        tenant: TENANT_PRINCIPAL,
        nome_revenda: 'RVD Autônoma',
        socios: ['Sócio principal', 'Sócio parceiro'],
        meta_lucro_mensal: 20000,
        capital_inicial_pessoal: 38000,
      }),
    },
  )

  if (res.status === 400 || res.status === 409) {
    console.log('  ↳ configuracoes default já existe — ignorado')
    return
  }

  if (!res.ok) {
    const body = await res.text()
    console.warn(`  ! Config padrão não criada: ${body}`)
    return
  }

  console.log('  ✓ configuracoes default criada')
}

async function main() {
  console.log(`Conectando em ${PB_URL}...`)

  if (!(await checkPbHealth())) {
    throw new Error(
      'PocketBase não está rodando. Inicie com: .\\scripts\\start-pocketbase.ps1',
    )
  }

  const token = await authAdmin()
  const collections = await listCollections(token)
  const importCheck = needsSchemaImport(collections)

  if (importCheck.needed) {
    throw new Error(
      `${importCheck.reason}. Rode primeiro: .\\scripts\\import-schema.ps1`,
    )
  }

  const usersCollection = findAuthUsersCollection(collections)
  if (!usersCollection) {
    throw new Error(
      `Collection auth \`${USERS_COLLECTION}\` não encontrada. Rode: .\\scripts\\import-schema.ps1`,
    )
  }

  console.log('Admin autenticado. Criando configurações padrão (sem usuários do app)...')
  await criarConfigPadrao(token)

  console.log('')
  console.log('Concluído!')
  console.log('  Conta do app: abra http://localhost:5173 → aba "Criar conta".')
  console.log('  Superuser PB: painel http://127.0.0.1:8090/_/ (credenciais em .env.pb.local).')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
