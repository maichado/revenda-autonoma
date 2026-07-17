import PocketBase from 'pocketbase'

function resolverPbUrl(): string {
  const viaProxy = import.meta.env.VITE_PB_VIA_PROXY === 'true'
  if (viaProxy && typeof window !== 'undefined') {
    return window.location.origin
  }
  return import.meta.env.VITE_POCKETBASE_URL?.trim() || 'http://127.0.0.1:8090'
}

/** Cliente singleton do PocketBase — auth token fica no localStorage do SDK. */
export const pb = new PocketBase(resolverPbUrl())

// Evita auto-cancelamento de requests duplicadas (comum em React StrictMode).
pb.autoCancellation(false)

/** URL base atual do PocketBase (útil em logs e health check). */
export function pbBaseUrl(): string {
  return pb.baseUrl
}
