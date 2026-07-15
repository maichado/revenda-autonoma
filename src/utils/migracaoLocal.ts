import { CONFIGURACOES_PADRAO } from '@/constants/configuracoesPadrao'
import { STORAGE_KEY } from '@/store/useStore'
import type { EstadoImportavel } from '@/store/useStore'
import type { Despesa, Veiculo } from '@/types'

export const MIGRACAO_KEY = 'gm-revenda-migrado-pb'

export function lerLocalStorageAntigo(): EstadoImportavel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: Partial<EstadoImportavel>
      veiculos?: Veiculo[]
    }
    const estado = (parsed.state ?? parsed) as Partial<EstadoImportavel>
    if (!estado.veiculos || !Array.isArray(estado.veiculos)) return null
    return {
      veiculos: estado.veiculos,
      compras: estado.compras ?? [],
      vendas: estado.vendas ?? [],
      despesas: (estado.despesas ?? []).map((d: Despesa) => ({
        ...d,
        pago_por: d.pago_por ?? '',
      })),
      configuracoes: estado.configuracoes ?? { ...CONFIGURACOES_PADRAO },
    }
  } catch {
    return null
  }
}

export function temDadosMigracao(estado: EstadoImportavel): boolean {
  return (
    estado.veiculos.length > 0 ||
    estado.compras.length > 0 ||
    estado.vendas.length > 0 ||
    estado.despesas.length > 0
  )
}

export function podeMigrarLocalStorage(): boolean {
  if (localStorage.getItem(MIGRACAO_KEY) === '1') return false
  const estado = lerLocalStorageAntigo()
  return estado != null && temDadosMigracao(estado)
}
