import { pb } from '@/lib/pocketbase'
import { TENANT_PRINCIPAL } from '@/constants/tenant'

/**
 * Tenant da sessão. Contas legadas (campo vazio) usam o tenant compartilhado da equipe.
 */
export function tenantAtual(): string {
  const record = pb.authStore.record as { tenant?: string } | null
  const tenant = record?.tenant?.trim()
  if (tenant) return tenant
  return TENANT_PRINCIPAL
}

export function filtroTenant(): string {
  const tenant = tenantAtual().replace(/'/g, "\\'")
  return `tenant = '${tenant}'`
}

/** Filtros para achar config legada (tenant vazio ou slug default). */
export function filtrosConfiguracoes(): string[] {
  const tenant = tenantAtual()
  const esc = tenant.replace(/'/g, "\\'")
  const filtros = [`tenant = '${esc}'`]
  if (tenant === TENANT_PRINCIPAL) {
    filtros.push(`tenant = ''`, `slug = 'default'`)
  }
  return filtros
}

export function withTenant<T extends Record<string, unknown>>(
  body: T,
): T & { tenant: string } {
  return { ...body, tenant: tenantAtual() }
}
