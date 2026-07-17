/**
 * Cria o usuário inicial do app no PocketBase via API Admin.
 *
 * Pré-requisitos:
 *   1. PocketBase rodando (scripts/start-pocketbase.ps1)
 *   2. Admin criado no primeiro `pocketbase serve`
 *   3. Collections importadas (pocketbase/pb_schema.json)
 *
 * Uso:
 *   PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret node scripts/seed-pocketbase.js
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

const USUARIOS_INICIAIS = [
  {
    email: 'admin@revenda.local',
    password: 'RevendaAutonoma2024!',
    passwordConfirm: 'RevendaAutonoma2024!',
    name: 'Administrador',
  },
  {
    email: 'adminmaicon@revenda.local',
    password: 'adminmaicon',
    passwordConfirm: 'adminmaicon',
    name: 'Maicon Machado',
  },
  {
    email: 'cristiano@cristiano.com',
    password: 'cristiano',
    passwordConfirm: 'cristiano',
    name: 'Cristiano',
  },
]

async function authAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error(
      'Defina PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD (credenciais do superuser PocketBase).',
    )
    console.error(
      'Exemplo: $env:PB_ADMIN_EMAIL="admin@email.com"; $env:PB_ADMIN_PASSWORD="senha"; node scripts/seed-pocketbase.js',
    )
    process.exit(1)
  }

  return authSuperuser(ADMIN_EMAIL, ADMIN_PASSWORD)
}

function isDuplicateUserError(status, err) {
  if (status === 409) return true
  if (status !== 400) return false
  return err?.data?.email?.code === 'validation_not_unique'
}

async function criarUsuario(token, usersCollectionName, usuario) {
  const res = await fetch(
    `${PB_URL}/api/collections/${usersCollectionName}/records`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        ...usuario,
        emailVisibility: true,
        tenant: usuario.tenant ?? TENANT_PRINCIPAL,
      }),
    },
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (isDuplicateUserError(res.status, err)) {
      console.log(`  ↳ ${usuario.email} já existe — ignorado`)
      return
    }
    const body = JSON.stringify(err)
    throw new Error(`Falha ao criar ${usuario.email} (${res.status}): ${body}`)
  }

  console.log(`  ✓ ${usuario.email} criado`)
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

  console.log('Admin autenticado. Criando usuários do app...')

  for (const usuario of USUARIOS_INICIAIS) {
    await criarUsuario(token, usersCollection.name, usuario)
  }

  console.log('Criando configurações padrão (sem dados de negócio)...')
  await criarConfigPadrao(token)

  console.log('')
  console.log('Concluído! Logins no app:')
  console.log('  admin@revenda.local / RevendaAutonoma2024!')
  console.log('  adminmaicon / adminmaicon')
  console.log('  cristiano@cristiano.com / cristiano')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
