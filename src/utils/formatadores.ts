// Funções de formatação reutilizáveis (moeda, percentuais, datas).

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatarMoeda(valor: number): string {
  if (!isFinite(valor)) return 'R$ 0,00'
  return brl.format(valor)
}

export function formatarMoedaCompacta(valor: number): string {
  if (!isFinite(valor)) return 'R$ 0'
  return brlCompact.format(valor)
}

export function formatarPercentual(valor: number, casas = 1): string {
  if (!isFinite(valor)) return '0%'
  return `${valor.toFixed(casas)}%`
}

export function formatarData(iso: string, pattern = "dd 'de' MMM, yyyy"): string {
  try {
    return format(parseISO(iso), pattern, { locale: ptBR })
  } catch {
    return iso
  }
}

export function formatarDataCurta(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

export function formatarNumero(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor)
}
