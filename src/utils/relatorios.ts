// Helpers do módulo Relatórios.
//
// Centraliza:
//  • Tipo `Periodo` (modo "mes-ano" ou "range") com helpers para construir os
//    presets do seletor (mês atual, mês anterior, ano atual, últimos 90 dias).
//  • Filtro genérico `filtrarPorPeriodo` reaproveitado por todos os relatórios.
//  • Cálculo de dias em estoque (com ou sem venda).
//  • Resumo financeiro consolidado e indicadores de destaque (mais lucrativo,
//    menos lucrativo, forma mais usada, ticket médio, origem mais frequente,
//    etc.) que alimentam tanto o preview visual quanto o texto WhatsApp.

import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import type {
  Compra,
  Despesa,
  TipoDespesa,
  Veiculo,
  Venda,
} from '@/types'
import { calcularLucroVenda, custoTotalVeiculo, parteSocioVenda } from './calculos'
import { calcularMetricasTempoVeiculo } from './tempoVeiculo'

// -----------------------------------------------------------------------------
// PERÍODO
// -----------------------------------------------------------------------------

export type ModoPeriodo = 'mes-ano' | 'range'

export interface Periodo {
  modo: ModoPeriodo
  /** 1-12 — usado quando modo = "mes-ano". */
  mes: number
  /** ano completo — usado quando modo = "mes-ano". */
  ano: number
  /** ISO yyyy-MM-dd, inclusivo. */
  dataInicio: string
  /** ISO yyyy-MM-dd, inclusivo. */
  dataFim: string
}

const ISO = 'yyyy-MM-dd'

export function periodoMesAno(mes: number, ano: number): Periodo {
  // Construímos as datas a partir do dia 15 para evitar problemas de timezone
  // (qualquer hora do dia 15 está garantidamente no mês alvo).
  const base = new Date(ano, mes - 1, 15)
  return {
    modo: 'mes-ano',
    mes,
    ano,
    dataInicio: format(startOfMonth(base), ISO),
    dataFim: format(endOfMonth(base), ISO),
  }
}

export function periodoRange(dataInicio: string, dataFim: string): Periodo {
  // Normaliza: garante início <= fim. Mantém mes/ano apontando para o início
  // por consistência (útil para botões que voltam para o modo mes-ano).
  let ini = dataInicio
  let fim = dataFim
  if (ini && fim && ini > fim) {
    const tmp = ini
    ini = fim
    fim = tmp
  }
  const base = ini ? parseISO(ini) : new Date()
  return {
    modo: 'range',
    mes: base.getMonth() + 1,
    ano: base.getFullYear(),
    dataInicio: ini,
    dataFim: fim,
  }
}

export function periodoMesAtual(ref: Date = new Date()): Periodo {
  return periodoMesAno(ref.getMonth() + 1, ref.getFullYear())
}

export function periodoMesAnterior(ref: Date = new Date()): Periodo {
  const ant = subMonths(ref, 1)
  return periodoMesAno(ant.getMonth() + 1, ant.getFullYear())
}

export function periodoAnoAtual(ref: Date = new Date()): Periodo {
  return {
    modo: 'range',
    mes: 1,
    ano: ref.getFullYear(),
    dataInicio: format(startOfYear(ref), ISO),
    dataFim: format(endOfYear(ref), ISO),
  }
}

export function periodoUltimos90Dias(ref: Date = new Date()): Periodo {
  const ini = subDays(ref, 89) // inclui hoje => 90 dias totais
  return {
    modo: 'range',
    mes: ini.getMonth() + 1,
    ano: ini.getFullYear(),
    dataInicio: format(ini, ISO),
    dataFim: format(ref, ISO),
  }
}

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/** Rótulo amigável para a UI (ex.: "Junho/2026" ou "01/06 a 30/06/2026"). */
export function labelPeriodo(p: Periodo): string {
  if (p.modo === 'mes-ano') {
    return `${NOMES_MESES[p.mes - 1]}/${p.ano}`
  }
  return `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)}`
}

/** Rótulo curto e literal sempre como "dd/MM/yyyy a dd/MM/yyyy". Usado no
 *  texto do WhatsApp para não ambiguar o intervalo. */
export function rotuloCurtoPeriodo(p: Periodo): string {
  return `${formatarDataBR(p.dataInicio)} a ${formatarDataBR(p.dataFim)}`
}

/** Lista de anos disponíveis nos dados — usada para popular o select de ano. */
export function anosDisponiveis(
  veiculos: Veiculo[],
  compras: Compra[],
  vendas: Venda[],
  despesas: Despesa[],
): number[] {
  const set = new Set<number>()
  const acrescentar = (iso?: string) => {
    if (!iso) return
    const ano = Number(iso.slice(0, 4))
    if (Number.isFinite(ano) && ano > 1900) set.add(ano)
  }
  for (const v of veiculos) acrescentar(v.data_compra)
  for (const c of compras) acrescentar(c.data)
  for (const v of vendas) acrescentar(v.data)
  for (const d of despesas) acrescentar(d.data)
  set.add(new Date().getFullYear())
  return Array.from(set).sort((a, b) => b - a)
}

// -----------------------------------------------------------------------------
// FILTRAGEM
// -----------------------------------------------------------------------------

/** Filtra uma lista usando uma data ISO retornada por `getDate`. Intervalo
 *  inclusivo nas duas pontas — comparação lexicográfica (yyyy-MM-dd basta). */
export function filtrarPorPeriodo<T>(
  items: T[],
  dataInicio: string,
  dataFim: string,
  getDate: (item: T) => string,
): T[] {
  return items.filter((it) => {
    const d = getDate(it)
    if (!d) return false
    if (dataInicio && d < dataInicio) return false
    if (dataFim && d > dataFim) return false
    return true
  })
}

/** Filtra uma lista pelo veículo vinculado (quando informado). */
export function filtrarPorVeiculo<T>(
  items: T[],
  veiculoId: string | undefined,
  getVeiculoId: (item: T) => string | undefined,
): T[] {
  if (!veiculoId) return items
  return items.filter((it) => getVeiculoId(it) === veiculoId)
}

/**
 * Despesas no relatório:
 * - Escopo geral → filtra pelo período selecionado.
 * - Veículo específico → histórico completo (mesmo critério do módulo Despesas).
 */
export function filtrarDespesasRelatorio(
  despesas: Despesa[],
  periodo: Periodo,
  veiculoId?: string,
): Despesa[] {
  if (veiculoId) {
    return filtrarPorVeiculo(despesas, veiculoId, (d) => d.veiculo_id)
  }
  return filtrarPorPeriodo(
    despesas,
    periodo.dataInicio,
    periodo.dataFim,
    (d) => d.data,
  )
}

/** Rótulo amigável para o select de veículos (placa + marca/modelo). */
export function labelVeiculoSelect(v: Veiculo): string {
  return `${v.placa} — ${v.marca} ${v.modelo}`
}

// -----------------------------------------------------------------------------
// DIAS EM ESTOQUE
// -----------------------------------------------------------------------------

/** Dias entre `data_compra` e `data_venda` (ou hoje, se ainda não vendido). */
export function calcularDiasEmEstoque(
  veiculo: Veiculo,
  venda?: Venda,
  ref: Date = new Date(),
): number {
  return calcularMetricasTempoVeiculo(veiculo, venda, ref).diasTotal
}

// -----------------------------------------------------------------------------
// ESTOQUE ATUAL (independente do período)
// -----------------------------------------------------------------------------

export interface VeiculoEstoqueLinha {
  veiculo: Veiculo
  /** valor_compra + despesas vinculadas. */
  investido: number
}

export interface ValorEstoque {
  qtd: number
  /** Soma do custo investido (compra + despesas) de todos em estoque. */
  custoTotal: number
  /** Soma dos valores de venda pretendidos — referência de receita potencial. */
  valorVendaPretendido: number
  veiculos: VeiculoEstoqueLinha[]
}

/** Consolida veículos em estoque (status !== 'vendido') e o valor investido. */
export function calcularValorEstoque(
  veiculos: Veiculo[],
  despesas: Despesa[],
): ValorEstoque {
  const emEstoque = veiculos.filter((v) => v.status !== 'vendido')
  const linhas: VeiculoEstoqueLinha[] = emEstoque.map((veiculo) => ({
    veiculo,
    investido: custoTotalVeiculo(veiculo, despesas),
  }))
  const custoTotal = linhas.reduce((acc, l) => acc + l.investido, 0)
  const valorVendaPretendido = emEstoque.reduce(
    (acc, v) => acc + v.valor_venda_pretendido,
    0,
  )
  linhas.sort((a, b) => a.veiculo.placa.localeCompare(b.veiculo.placa))
  return {
    qtd: emEstoque.length,
    custoTotal,
    valorVendaPretendido,
    veiculos: linhas,
  }
}

// -----------------------------------------------------------------------------
// RESUMO FINANCEIRO DO PERÍODO
// -----------------------------------------------------------------------------

export interface ResumoFinanceiro {
  receita: number
  custoVeiculos: number
  custoDespesas: number
  custoTotal: number
  lucro: number
  margem: number
  /**
   * Lucro realizado dos veículos VENDIDOS no período (venda − compra −
   * despesas do carro) já descontadas as despesas gerais do período. É o
   * valor "MG" que se divide entre dono e sócio.
   */
  lucroVeiculosVendidos: number
  /** Parte do lucro que cabe ao(s) sócio(s) — metade dos carros "a meia". */
  parteSocios: number
  /** Sua parte (dono) = lucroVeiculosVendidos − parteSocios. */
  lucroMeu: number
  /** Há pelo menos um carro "a meia" vendido no período. */
  temDivisao: boolean
  qtdVendas: number
  qtdCompras: number
  qtdDespesas: number
}

export function calcularResumoFinanceiro(
  vendas: Venda[],
  compras: Compra[],
  despesas: Despesa[],
  veiculos: Veiculo[],
  periodo: Periodo,
): ResumoFinanceiro {
  const vendasPeriodo = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  )
  const comprasPeriodo = filtrarPorPeriodo(
    compras,
    periodo.dataInicio,
    periodo.dataFim,
    (c) => c.data,
  )
  const despesasPeriodo = filtrarPorPeriodo(
    despesas,
    periodo.dataInicio,
    periodo.dataFim,
    (d) => d.data,
  )

  const receita = vendasPeriodo.reduce((acc, v) => acc + v.valor_venda, 0)

  // Custo dos veículos VENDIDOS no período = somatório do valor de compra
  // de cada veículo cuja venda caiu no intervalo. Se o veículo já foi
  // removido, ignora silenciosamente (não é possível atribuir custo).
  const custoVeiculos = vendasPeriodo.reduce((acc, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    return acc + (veic?.valor_compra ?? 0)
  }, 0)

  const custoDespesas = despesasPeriodo.reduce((acc, d) => acc + d.valor, 0)
  const custoTotal = custoVeiculos + custoDespesas

  const lucro = receita - custoTotal
  const margem = receita > 0 ? (lucro / receita) * 100 : 0

  // Divisão dono/sócio — baseada no LUCRO REALIZADO por carro vendido, não no
  // lucro contábil do período (que inclui despesas de carros ainda em estoque).
  const realizadoVeiculos = vendasPeriodo.reduce((acc, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    return acc + calcularLucroVenda(v, veic, despesas)
  }, 0)
  const parteSocios = vendasPeriodo.reduce((acc, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    return acc + parteSocioVenda(v, veic, despesas)
  }, 0)
  const despesasGeraisPeriodo = despesasPeriodo
    .filter((d) => !d.veiculo_id)
    .reduce((acc, d) => acc + d.valor, 0)
  const lucroVeiculosVendidos = realizadoVeiculos - despesasGeraisPeriodo

  return {
    receita,
    custoVeiculos,
    custoDespesas,
    custoTotal,
    lucro,
    margem,
    lucroVeiculosVendidos,
    parteSocios,
    lucroMeu: lucroVeiculosVendidos - parteSocios,
    temDivisao: parteSocios !== 0,
    qtdVendas: vendasPeriodo.length,
    qtdCompras: comprasPeriodo.length,
    qtdDespesas: despesasPeriodo.length,
  }
}

// -----------------------------------------------------------------------------
// INDICADORES DE DESTAQUE
// -----------------------------------------------------------------------------

export interface VeiculoLinhaRelatorio {
  veiculo: Veiculo
  venda?: Venda
  /** Custo de aquisição (não inclui despesas — útil para coluna isolada). */
  compra: number
  despesas: number
  /** Valor da venda no período (0 se não houve). */
  venda_valor: number
  lucro: number
  roi: number
  diasEmEstoque: number
}

/** Linhas detalhadas (uma por veículo relevante ao período) que alimentam
 *  tanto a tabela do preview visual quanto a listagem do texto WhatsApp. */
export function calcularLinhasVeiculos(
  veiculos: Veiculo[],
  vendas: Venda[],
  despesas: Despesa[],
  periodo: Periodo,
): VeiculoLinhaRelatorio[] {
  // Veículos relevantes ao período = vendidos no período + comprados no período.
  const vendasPeriodo = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  )
  const idsVendidos = new Set(vendasPeriodo.map((v) => v.veiculo_id))
  const idsComprados = new Set(
    veiculos
      .filter(
        (v) =>
          v.data_compra >= periodo.dataInicio && v.data_compra <= periodo.dataFim,
      )
      .map((v) => v.id),
  )
  const idsRelevantes = new Set([...idsVendidos, ...idsComprados])

  const linhas: VeiculoLinhaRelatorio[] = []
  for (const veic of veiculos) {
    if (!idsRelevantes.has(veic.id)) continue
    const venda = vendasPeriodo.find((v) => v.veiculo_id === veic.id)

    const despesasVinc = despesas
      .filter((d) => d.veiculo_id === veic.id)
      .reduce((acc, d) => acc + d.valor, 0)

    const custo = custoTotalVeiculo(veic, despesas)
    const valorVenda = venda?.valor_venda ?? 0
    const lucro = venda ? valorVenda - custo : 0
    const roi = venda && custo > 0 ? (lucro / custo) * 100 : 0

    linhas.push({
      veiculo: veic,
      venda,
      compra: veic.valor_compra,
      despesas: despesasVinc,
      venda_valor: valorVenda,
      lucro,
      roi,
      diasEmEstoque: calcularDiasEmEstoque(veic, venda),
    })
  }

  // Ordem padrão: data da venda (mais recente primeiro), depois data de
  // compra. Mantemos estável para que o relatório seja determinístico.
  return linhas.sort((a, b) => {
    const da = a.venda?.data ?? a.veiculo.data_compra
    const db = b.venda?.data ?? b.veiculo.data_compra
    if (da === db) return 0
    return da < db ? 1 : -1
  })
}

export interface IndicadoresDestaque {
  veiculoMaisLucrativo?: VeiculoLinhaRelatorio
  veiculoMenosLucrativo?: VeiculoLinhaRelatorio
  mediaDiasEstoque: number
  formaPagamentoTop?: { forma: string; qtd: number; percentual: number }
  formaRecebimentoTop?: { forma: string; qtd: number; percentual: number }
  ticketMedioVenda: number
  origemTop?: { origem: string; qtd: number; percentual: number }
}

function topContagem(
  itens: string[],
): { chave: string; qtd: number; percentual: number } | undefined {
  if (itens.length === 0) return undefined
  const map = new Map<string, number>()
  for (const it of itens) {
    const k = (it || '—').trim() || '—'
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  let melhor: { chave: string; qtd: number } | undefined
  for (const [chave, qtd] of map) {
    if (!melhor || qtd > melhor.qtd) melhor = { chave, qtd }
  }
  if (!melhor) return undefined
  return {
    chave: melhor.chave,
    qtd: melhor.qtd,
    percentual: (melhor.qtd / itens.length) * 100,
  }
}

export function calcularIndicadoresDestaque(
  linhas: VeiculoLinhaRelatorio[],
  vendas: Venda[],
  compras: Compra[],
  periodo: Periodo,
): IndicadoresDestaque {
  const vendasPeriodo = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  )
  const comprasPeriodo = filtrarPorPeriodo(
    compras,
    periodo.dataInicio,
    periodo.dataFim,
    (c) => c.data,
  )

  const vendidasComLucro = linhas.filter((l) => !!l.venda)

  let veiculoMaisLucrativo: VeiculoLinhaRelatorio | undefined
  let veiculoMenosLucrativo: VeiculoLinhaRelatorio | undefined
  for (const l of vendidasComLucro) {
    if (!veiculoMaisLucrativo || l.lucro > veiculoMaisLucrativo.lucro)
      veiculoMaisLucrativo = l
    if (!veiculoMenosLucrativo || l.lucro < veiculoMenosLucrativo.lucro)
      veiculoMenosLucrativo = l
  }

  const mediaDiasEstoque =
    vendidasComLucro.length > 0
      ? vendidasComLucro.reduce((acc, l) => acc + l.diasEmEstoque, 0) /
        vendidasComLucro.length
      : 0

  const topFP = topContagem(comprasPeriodo.map((c) => c.forma_pagamento))
  const formaPagamentoTop = topFP
    ? { forma: topFP.chave, qtd: topFP.qtd, percentual: topFP.percentual }
    : undefined

  const topFR = topContagem(vendasPeriodo.map((v) => v.forma_recebimento))
  const formaRecebimentoTop = topFR
    ? { forma: topFR.chave, qtd: topFR.qtd, percentual: topFR.percentual }
    : undefined

  const topOr = topContagem(comprasPeriodo.map((c) => c.origem))
  const origemTop = topOr
    ? { origem: topOr.chave, qtd: topOr.qtd, percentual: topOr.percentual }
    : undefined

  const ticketMedioVenda =
    vendasPeriodo.length > 0
      ? vendasPeriodo.reduce((acc, v) => acc + v.valor_venda, 0) /
        vendasPeriodo.length
      : 0

  return {
    veiculoMaisLucrativo,
    veiculoMenosLucrativo,
    mediaDiasEstoque,
    formaPagamentoTop,
    formaRecebimentoTop,
    ticketMedioVenda,
    origemTop,
  }
}

// -----------------------------------------------------------------------------
// AGREGADOS DE DESPESAS (compartilhado — relatórios e validação de totais)
// -----------------------------------------------------------------------------

export interface ResumoDespesas {
  total: number
  pago: number
  aberto: number
  qtd: number
}

/** Soma total, pago e em aberto — mesma base para KPIs, gráfico e rodapé. */
export function resumirDespesas(despesas: Despesa[]): ResumoDespesas {
  let total = 0
  let pago = 0
  for (const d of despesas) {
    const v = Number(d.valor) || 0
    total += v
    if (d.pago) pago += v
  }
  return { total, pago, aberto: total - pago, qtd: despesas.length }
}

export function agruparDespesasPorTipoResumo(
  despesas: Despesa[],
): { tipo: string; total: number; qtd: number }[] {
  const map = new Map<string, { total: number; qtd: number }>()
  for (const d of despesas) {
    const k = d.tipo || 'outros'
    const slot = map.get(k) ?? { total: 0, qtd: 0 }
    slot.total += Number(d.valor) || 0
    slot.qtd += 1
    map.set(k, slot)
  }
  return Array.from(map.entries())
    .map(([tipo, { total, qtd }]) => ({ tipo, total, qtd }))
    .sort((a, b) => b.total - a.total)
}

export function agruparDespesasPorTipoDetalhe(
  despesas: Despesa[],
): DespesaPorTipoVeiculo[] {
  const map = new Map<string, DespesaPorTipoVeiculo>()
  for (const d of despesas) {
    const k = d.tipo || 'outros'
    const slot = map.get(k) ?? { tipo: k, total: 0, items: [] }
    slot.total += Number(d.valor) || 0
    slot.items.push(d)
    map.set(k, slot)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// -----------------------------------------------------------------------------
// AGREGADOS DE DESPESAS POR TIPO NO PERÍODO
// -----------------------------------------------------------------------------

export function somarDespesasPorTipoPeriodo(
  despesas: Despesa[],
  periodo: Periodo,
): { tipo: TipoDespesa | string; total: number; qtd: number }[] {
  const despesasPeriodo = filtrarPorPeriodo(
    despesas,
    periodo.dataInicio,
    periodo.dataFim,
    (d) => d.data,
  )
  return agruparDespesasPorTipoResumo(despesasPeriodo)
}

// -----------------------------------------------------------------------------
// FORMATADORES BR (curtinhos — usados no texto WhatsApp)
// -----------------------------------------------------------------------------

export function formatarMoedaBR(valor: number): string {
  if (!Number.isFinite(valor)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(valor)
}

export function formatarDataBR(iso: string): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd/MM/yyyy')
  } catch {
    return iso
  }
}

export function formatarDataCurtaBR(iso: string): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd/MM')
  } catch {
    return iso
  }
}

export function formatarPercentualBR(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return '0%'
  return `${valor.toFixed(casas).replace('.', ',')}%`
}

// -----------------------------------------------------------------------------
// FATIAS DE RECEITA POR FORMA DE RECEBIMENTO
// -----------------------------------------------------------------------------
//
// Usado pelo gráfico donut "Receita por forma de recebimento" da página
// visual de Relatórios. Mantemos separado de calcularIndicadoresDestaque
// porque o gráfico precisa de TODAS as fatias (não só a moda).

export interface FatiaForma {
  forma: string
  receita: number
  /** % da receita total (0–100). */
  percentual: number
}

export function receitaPorFormaRecebimento(
  vendas: Venda[],
  periodo: Periodo,
): FatiaForma[] {
  const vendasPeriodo = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  )
  const map = new Map<string, number>()
  for (const v of vendasPeriodo) {
    const k = (v.forma_recebimento || 'outros').toString()
    map.set(k, (map.get(k) ?? 0) + v.valor_venda)
  }
  const total = Array.from(map.values()).reduce((s, n) => s + n, 0)
  return Array.from(map.entries())
    .map(([forma, receita]) => ({
      forma,
      receita,
      percentual: total > 0 ? (receita / total) * 100 : 0,
    }))
    .sort((a, b) => b.receita - a.receita)
}

// -----------------------------------------------------------------------------
// ATALHO DE "ÚLTIMOS N DIAS" (generaliza periodoUltimos90Dias)
// -----------------------------------------------------------------------------

export function periodoUltimosDias(
  dias: number,
  ref: Date = new Date(),
): Periodo {
  const ini = subDays(ref, Math.max(0, dias - 1))
  return {
    modo: 'range',
    mes: ini.getMonth() + 1,
    ano: ini.getFullYear(),
    dataInicio: format(ini, ISO),
    dataFim: format(ref, ISO),
  }
}

// -----------------------------------------------------------------------------
// RELATÓRIO INDIVIDUAL DE VEÍCULO
// -----------------------------------------------------------------------------

export interface DespesaPorTipoVeiculo {
  tipo: string
  total: number
  items: Despesa[]
}

export interface DadosVeiculoIndividual {
  veiculo: Veiculo
  compra?: Compra
  venda?: Venda
  despesas: Despesa[]
  despesasPorTipo: DespesaPorTipoVeiculo[]
  totalDespesas: number
  custoTotal: number
  receita: number
  lucro: number
  roi: number
  diasEmEstoque: number
}

/** Consolida compra, despesas, venda, lucro e ROI de um veículo específico. */
export function calcularDadosVeiculoIndividual(
  veiculoId: string,
  veiculos: Veiculo[],
  compras: Compra[],
  vendas: Venda[],
  despesas: Despesa[],
): DadosVeiculoIndividual | undefined {
  const veiculo = veiculos.find((v) => v.id === veiculoId)
  if (!veiculo) return undefined

  const compra =
    [...compras]
      .filter((c) => c.veiculo_id === veiculoId)
      .sort((a, b) => (a.data < b.data ? 1 : -1))[0] ?? undefined

  const venda =
    [...vendas]
      .filter((v) => v.veiculo_id === veiculoId)
      .sort((a, b) => (a.data < b.data ? 1 : -1))[0] ?? undefined

  const despesasVeic = despesas
    .filter((d) => d.veiculo_id === veiculoId)
    .sort((a, b) => (a.data < b.data ? 1 : -1))

  const despesasPorTipo = agruparDespesasPorTipoDetalhe(despesasVeic)
  const { total: totalDespesas } = resumirDespesas(despesasVeic)
  const custoTotal = veiculo.valor_compra + totalDespesas
  const receita = venda?.valor_venda ?? 0
  const lucro = venda ? receita - custoTotal : 0
  const roi = venda && custoTotal > 0 ? (lucro / custoTotal) * 100 : 0

  return {
    veiculo,
    compra,
    venda,
    despesas: despesasVeic,
    despesasPorTipo,
    totalDespesas,
    custoTotal,
    receita,
    lucro,
    roi,
    diasEmEstoque: calcularDiasEmEstoque(veiculo, venda),
  }
}
