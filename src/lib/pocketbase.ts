import PocketBase from 'pocketbase'

const PB_URL =
  import.meta.env.VITE_POCKETBASE_URL?.trim() || 'http://127.0.0.1:8090'

/** Cliente singleton do PocketBase — auth token fica no localStorage do SDK. */
export const pb = new PocketBase(PB_URL)

// Evita auto-cancelamento de requests duplicadas (comum em React StrictMode).
pb.autoCancellation(false)

export { PB_URL }
