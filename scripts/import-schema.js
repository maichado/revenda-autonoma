/**
 * Importa pocketbase/pb_schema.json via API admin (superuser).
 *
 * Uso:
 *   PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=secret node scripts/import-schema.js
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  PB_URL,
  authHeaders,
  authSuperuser,
  checkPbHealth,
  listCollections,
  missingCollections,
  needsSchemaImport,
} from './lib/pb-admin.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'pocketbase', 'pb_schema.json')

async function importSchema(token) {
  const collections = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))

  const res = await fetch(`${PB_URL}/api/collections/import`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ collections, deleteMissing: false }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Falha ao importar schema (${res.status}): ${body}`)
  }
}

async function main() {
  const email = process.env.PB_ADMIN_EMAIL
  const password = process.env.PB_ADMIN_PASSWORD

  if (!email || !password) {
    console.error(
      'Defina PB_ADMIN_EMAIL e PB_ADMIN_PASSWORD (credenciais do superuser PocketBase).',
    )
    console.error(
      'Exemplo: $env:PB_ADMIN_EMAIL="admin@email.com"; $env:PB_ADMIN_PASSWORD="senha"; node scripts/import-schema.js',
    )
    process.exit(1)
  }

  console.log(`Conectando em ${PB_URL}...`)

  if (!(await checkPbHealth())) {
    throw new Error(
      'PocketBase não está rodando. Inicie com: .\\scripts\\start-pocketbase.ps1',
    )
  }

  const token = await authSuperuser(email, password)
  const collections = await listCollections(token)
  const force = process.env.FORCE_SCHEMA_IMPORT === '1'
  const importCheck = needsSchemaImport(collections)

  if (!force && !importCheck.needed) {
    console.log('Schema já está completo — importação não necessária.')
    console.log('Para forçar: FORCE_SCHEMA_IMPORT=1 node scripts/import-schema.js')
    return
  }

  if (force && !importCheck.needed) {
    console.log('Forçando reimportação do schema (campos novos / status atualizados)...')
  } else {
    console.log(`Schema incompleto: ${importCheck.reason}`)
  }
  console.log(`Importando ${SCHEMA_PATH}...`)
  await importSchema(token)

  const after = await listCollections(token)
  const stillMissing = missingCollections(after.map((c) => c.name))
  if (stillMissing.length > 0) {
    throw new Error(
      `Importação concluída, mas ainda faltam: ${stillMissing.join(', ')}`,
    )
  }

  const afterCheck = needsSchemaImport(after)
  if (afterCheck.needed) {
    throw new Error(
      `Importação concluída, mas o schema ainda está incompleto: ${afterCheck.reason}`,
    )
  }

  console.log('Schema importado com sucesso!')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
