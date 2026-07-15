/** Ponte entre o store Zustand e a camada PocketBase (evita import circular). */



import {
  handlePbSyncError,
  PbOfflineError,
  PbSyncRequiredError,
} from '@/lib/pbApi'
import { pb } from '@/lib/pocketbase'



let pbSyncAtivo = false

let offlineCallback: (() => void) | null = null



export function setPbSyncEnabled(v: boolean): void {

  pbSyncAtivo = v

}



export function isPbSyncEnabled(): boolean {

  return pbSyncAtivo

}



export function setPbOfflineCallback(cb: (() => void) | null): void {

  offlineCallback = cb

}



export function notifyPbOffline(): void {

  offlineCallback?.()

}



/**

 * Persiste no PocketBase antes de aplicar no store local.

 * Quando sync está desativado (sem login), aplica só localmente.

 */

export async function comPersistencia(
  syncFn: () => Promise<void>,
  applyLocal: () => void | Promise<void>,
): Promise<void> {
  if (!pbSyncAtivo) {
    throw new PbSyncRequiredError()
  }

  if (!pb.authStore.isValid) {
    throw new PbSyncRequiredError(
      'Sessão expirada. Faça login novamente para salvar no servidor.',
    )
  }

  try {
    await syncFn()
    await applyLocal()
  } catch (err) {
    handlePbSyncError(err, notifyPbOffline)
    if (err instanceof TypeError) {
      throw new PbOfflineError()
    }
    throw err
  }
}



/** Fire-and-forget legado — evitar em novos fluxos. */

export function runPbSync(fn: () => Promise<void>): void {

  if (!pbSyncAtivo) return

  fn().catch((err) => handlePbSyncError(err, notifyPbOffline))

}


