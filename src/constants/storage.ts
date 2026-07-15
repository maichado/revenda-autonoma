import { APP_SLUG } from '@/constants/marca'

export const STORAGE_KEY = `${APP_SLUG}-state`
export const PREFS_STORAGE_KEY = `${APP_SLUG}-prefs`
export const MIGRACAO_KEY = `${APP_SLUG}-migrado-pb`
export const BACKUP_FLAG_KEY = `${APP_SLUG}-backup-aplicado`

const STATE_KEYS_LEGADAS = [
  'gm-revenda-state',
  'revenda-autonoma-state',
  STORAGE_KEY,
] as const

const PREFS_KEYS_LEGADAS = [
  'gm-revenda-prefs',
  'revenda-autonoma-prefs',
  PREFS_STORAGE_KEY,
] as const

const MIGRACAO_KEYS_LEGADAS = [
  'gm-revenda-migrado-pb',
  'revenda-autonoma-migrado-pb',
  MIGRACAO_KEY,
] as const

const BACKUP_FLAG_KEYS_LEGADAS = [
  'gm-revenda-backup-aplicado',
  'revenda-autonoma-backup-aplicado',
  BACKUP_FLAG_KEY,
] as const

function lerPrimeiraChave(keys: readonly string[]): string | null {
  for (const key of keys) {
    try {
      const v = localStorage.getItem(key)
      if (v != null) return v
    } catch {
      // ignora
    }
  }
  return null
}

/** Copia preferências e flags legadas para as chaves atuais (uma vez por navegador). */
export function migrarChavesStorageLegadas(): void {
  try {
    if (!localStorage.getItem(PREFS_STORAGE_KEY)) {
      for (const key of PREFS_KEYS_LEGADAS) {
        if (key === PREFS_STORAGE_KEY) continue
        const v = localStorage.getItem(key)
        if (v) {
          localStorage.setItem(PREFS_STORAGE_KEY, v)
          break
        }
      }
    }

    if (!localStorage.getItem(MIGRACAO_KEY)) {
      for (const key of MIGRACAO_KEYS_LEGADAS) {
        if (key === MIGRACAO_KEY) continue
        const v = localStorage.getItem(key)
        if (v) {
          localStorage.setItem(MIGRACAO_KEY, v)
          break
        }
      }
    }
  } catch {
    // ignora
  }
}

export function lerEstadoLocalLegado(): string | null {
  return lerPrimeiraChave(STATE_KEYS_LEGADAS)
}

export function consumirFlagBackupLegada(): boolean {
  try {
    for (const key of BACKUP_FLAG_KEYS_LEGADAS) {
      const v = sessionStorage.getItem(key)
      if (v) {
        sessionStorage.removeItem(key)
        return true
      }
    }
  } catch {
    // ignora
  }
  return false
}
