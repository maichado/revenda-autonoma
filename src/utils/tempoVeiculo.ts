// Métricas de tempo do veículo: compra → preparação → anúncio → venda.

import { differenceInDays, parseISO } from 'date-fns'
import type { Veiculo, Venda } from '@/types'

export interface MetricasTempoVeiculo {
  /** Compra até venda (ou hoje). */
  diasTotal: number
  /** Compra até data do anúncio (ou hoje, se ainda em preparação). */
  diasPreparacao: number
  /** Anúncio até venda (ou hoje); null se nunca anunciado. */
  diasAnunciado: number | null
  dataAnuncio?: string
  /** Sem data_anuncio — usa data_compra como referência. */
  anuncioEstimado: boolean
  emPreparacao: boolean
}

function parseDataSafe(iso: string): Date | null {
  if (!iso) return null
  try {
    return parseISO(iso.slice(0, 10))
  } catch {
    return null
  }
}

function diasEntre(inicio: string, fim: string): number {
  const a = parseDataSafe(inicio)
  const b = parseDataSafe(fim)
  if (!a || !b) return 0
  return Math.max(0, differenceInDays(b, a))
}

export function calcularMetricasTempoVeiculo(
  veiculo: Veiculo,
  venda?: Venda,
  ref: Date = new Date(),
): MetricasTempoVeiculo {
  const hoje = ref.toISOString().slice(0, 10)
  const fimTotal = venda?.data?.slice(0, 10) ?? hoje
  const diasTotal = diasEntre(veiculo.data_compra, fimTotal)
  const emPreparacao = veiculo.status === 'em preparação'
  const dataAnuncio = veiculo.data_anuncio?.slice(0, 10)

  if (emPreparacao && !dataAnuncio) {
    return {
      diasTotal,
      diasPreparacao: diasEntre(veiculo.data_compra, hoje),
      diasAnunciado: null,
      emPreparacao: true,
      anuncioEstimado: false,
    }
  }

  const inicioAnuncio = dataAnuncio ?? veiculo.data_compra
  const anuncioEstimado = !dataAnuncio && !emPreparacao
  const diasPreparacao = dataAnuncio
    ? diasEntre(veiculo.data_compra, dataAnuncio)
    : 0
  const diasAnunciado = diasEntre(inicioAnuncio, fimTotal)

  return {
    diasTotal,
    diasPreparacao,
    diasAnunciado,
    dataAnuncio,
    anuncioEstimado,
    emPreparacao: false,
  }
}

export interface LinhaTempoEstoque {
  veiculo: Veiculo
  metricas: MetricasTempoVeiculo
  venda?: Venda
}

/** Veículos ainda no estoque, ordenados pelos que estão há mais tempo. */
export function linhasTempoEstoqueAtivos(
  veiculos: Veiculo[],
  ref: Date = new Date(),
): LinhaTempoEstoque[] {
  return linhasTempoVeiculos(veiculos, [], ref).filter(
    (l) => l.veiculo.status !== 'vendido',
  )
}

function vendaPorVeiculoMap(vendas: Venda[]): Map<string, Venda> {
  const map = new Map<string, Venda>()
  for (const v of vendas) {
    const atual = map.get(v.veiculo_id)
    if (!atual || v.data > atual.data) map.set(v.veiculo_id, v)
  }
  return map
}

/** Todos os veículos (estoque + vendidos) com métricas de tempo. */
export function linhasTempoVeiculos(
  veiculos: Veiculo[],
  vendas: Venda[],
  ref: Date = new Date(),
): LinhaTempoEstoque[] {
  const vendasMap = vendaPorVeiculoMap(vendas)
  return veiculos
    .map((veiculo) => ({
      veiculo,
      venda: vendasMap.get(veiculo.id),
      metricas: calcularMetricasTempoVeiculo(
        veiculo,
        vendasMap.get(veiculo.id),
        ref,
      ),
    }))
    .sort((a, b) => {
      const aVendido = a.veiculo.status === 'vendido' ? 1 : 0
      const bVendido = b.veiculo.status === 'vendido' ? 1 : 0
      if (aVendido !== bVendido) return aVendido - bVendido
      return b.metricas.diasTotal - a.metricas.diasTotal
    })
}

export function formatarDiasTempo(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n} ${n === 1 ? 'dia' : 'dias'}`
}
