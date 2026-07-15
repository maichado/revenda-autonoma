// Helpers de cálculo centralizados — consumidos por Dashboard e demais módulos.
// Mantemos toda a regra de negócio aqui para facilitar testes e evolução.

import {
  endOfMonth,
  endOfYear,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns'
import type {
  Compra,
  Despesa,
  Movimentacao,
  StatusVeiculo,
  TipoDespesa,
  Veiculo,
  Venda,
} from '@/types'
import { TIPOS_DESPESA } from '@/types'

// -----------------------------------------------------------------------------
// CÁLCULOS POR VEÍCULO
// -----------------------------------------------------------------------------

/** Soma das despesas vinculadas diretamente a um veículo. */
export function despesasDoVeiculo(veiculoId: string, despesas: Despesa[]): number {
  return despesas
    .filter((d) => d.veiculo_id === veiculoId)
    .reduce((acc, d) => acc + d.valor, 0)
}

/** Custo total do veículo: valor de compra + despesas vinculadas. */
export function custoTotalVeiculo(veiculo: Veiculo, despesas: Despesa[]): number {
  return veiculo.valor_compra + despesasDoVeiculo(veiculo.id, despesas)
}

/** Lucro do veículo (somente faz sentido se houver venda registrada). */
export function calcularLucroVeiculo(
  veiculo: Veiculo,
  vendas: Venda[],
  despesas: Despesa[],
): number {
  const venda = vendas.find((v) => v.veiculo_id === veiculo.id)
  if (!venda) return 0
  return venda.valor_venda - custoTotalVeiculo(veiculo, despesas)
}

/**
 * Lucro POR VENDA — usa o valor da própria venda passada (não busca a
 * primeira venda do veículo). Necessário no módulo Vendas, que lista cada
 * venda individualmente (um veículo pode ter sido revendido várias vezes em
 * sistemas mais antigos, e mesmo no fluxo normal queremos calcular o lucro
 * com base no valor exato desta venda).
 *
 *   lucro = valor_venda − valor_compra − soma(despesas vinculadas ao veículo)
 */
export function calcularLucroVenda(
  venda: Venda,
  veiculo: Veiculo | undefined,
  despesas: Despesa[],
): number {
  if (!veiculo) return 0
  return venda.valor_venda - custoTotalVeiculo(veiculo, despesas)
}

/**
 * ROI da venda em pontos percentuais.
 *   ROI = lucro / (valor_compra + despesas) × 100
 */
export function calcularROIVenda(
  venda: Venda,
  veiculo: Veiculo | undefined,
  despesas: Despesa[],
): number {
  if (!veiculo) return 0
  const custo = custoTotalVeiculo(veiculo, despesas)
  if (custo <= 0) return 0
  const lucro = calcularLucroVenda(venda, veiculo, despesas)
  return (lucro / custo) * 100
}

/**
 * Margem ESPERADA (pré-venda) — usada no módulo Estoque.
 *
 *   margem = (valor_venda_pretendido − valor_compra − despesas_vinculadas) / valor_compra × 100
 *
 * Divide pelo valor de compra (não pelo custo total) — conforme spec do módulo.
 */
export function calcularMargemEsperada(
  veiculo: Veiculo,
  despesas: Despesa[],
): number {
  if (veiculo.valor_compra <= 0) return 0
  const somaDespesas = despesasDoVeiculo(veiculo.id, despesas)
  return (
    ((veiculo.valor_venda_pretendido - veiculo.valor_compra - somaDespesas) /
      veiculo.valor_compra) *
    100
  )
}

/**
 * Fração do lucro que pertence ao SÓCIO (parceiro) neste veículo.
 *   - "solo" (100% seu): 0
 *   - "meia" (50/50):     metade
 */
export function fracaoSocio(veiculo: Veiculo | undefined): number {
  return veiculo?.tipo_propriedade === 'meia' ? 0.5 : 0
}

/** Parte do lucro DA VENDA que cabe ao sócio (0 em carros "solo"). */
export function parteSocioVenda(
  venda: Venda,
  veiculo: Veiculo | undefined,
  despesas: Despesa[],
): number {
  if (!veiculo) return 0
  const lucro = calcularLucroVenda(venda, veiculo, despesas)
  return lucro * fracaoSocio(veiculo)
}

/** ROI do veículo: lucro / custo total. Retorna em pontos percentuais. */
export function calcularROI(
  veiculo: Veiculo,
  vendas: Venda[],
  despesas: Despesa[],
): number {
  const custo = custoTotalVeiculo(veiculo, despesas)
  if (custo <= 0) return 0
  const lucro = calcularLucroVeiculo(veiculo, vendas, despesas)
  return (lucro / custo) * 100
}

// -----------------------------------------------------------------------------
// HELPERS DE PERÍODO
// -----------------------------------------------------------------------------

export function dentroDoMes(isoDate: string, ref: Date): boolean {
  try {
    return isWithinInterval(parseISO(isoDate), {
      start: startOfMonth(ref),
      end: endOfMonth(ref),
    })
  } catch {
    return false
  }
}

export function dentroDoAno(isoDate: string, ref: Date): boolean {
  try {
    return isWithinInterval(parseISO(isoDate), {
      start: startOfYear(ref),
      end: endOfYear(ref),
    })
  } catch {
    return false
  }
}

// -----------------------------------------------------------------------------
// AGREGAÇÕES POR MÊS
// -----------------------------------------------------------------------------

export function receitaDoMes(vendas: Venda[], ref: Date): number {
  return vendas
    .filter((v) => dentroDoMes(v.data, ref))
    .reduce((acc, v) => acc + v.valor_venda, 0)
}

/**
 * Custo dos veículos vendidos no mês (valor de compra dos veículos
 * cujas vendas caíram dentro do mês de referência).
 */
export function custoVendidosDoMes(
  vendas: Venda[],
  veiculos: Veiculo[],
  ref: Date,
): number {
  return vendas
    .filter((v) => dentroDoMes(v.data, ref))
    .reduce((acc, v) => {
      const veic = veiculos.find((x) => x.id === v.veiculo_id)
      return acc + (veic?.valor_compra ?? 0)
    }, 0)
}

export function despesasDoMes(despesas: Despesa[], ref: Date): number {
  return despesas
    .filter((d) => dentroDoMes(d.data, ref))
    .reduce((acc, d) => acc + d.valor, 0)
}

/**
 * Lucro líquido do mês = receita − custo de aquisição dos vendidos − despesas do mês.
 * (Definição exigida pela spec do Dashboard.)
 */
export function lucroDoMes(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): number {
  return (
    receitaDoMes(vendas, ref) -
    custoVendidosDoMes(vendas, veiculos, ref) -
    despesasDoMes(despesas, ref)
  )
}

/**
 * Parte do lucro do mês que pertence aos SÓCIOS (soma da metade do lucro de
 * cada carro "a meia" vendido no mês). Carros "solo" não contribuem.
 */
export function parteSociosDoMes(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): number {
  return vendas
    .filter((v) => dentroDoMes(v.data, ref))
    .reduce((acc, v) => {
      const veic = veiculos.find((x) => x.id === v.veiculo_id)
      return acc + parteSocioVenda(v, veic, despesas)
    }, 0)
}

/**
 * Soma das despesas GERAIS do mês (sem veículo vinculado — ex.: aluguel,
 * marketing). São custos do negócio que não pertencem a nenhum carro
 * específico, portanto reduzem o lucro do dono, não a metade do sócio.
 */
export function despesasGeraisDoMes(despesas: Despesa[], ref: Date): number {
  return despesas
    .filter((d) => !d.veiculo_id && dentroDoMes(d.data, ref))
    .reduce((acc, d) => acc + d.valor, 0)
}

/**
 * Lucro REALIZADO do mês = soma do lucro dos carros VENDIDOS no mês
 * (venda − compra − despesas daquele carro) menos as despesas gerais do mês.
 *
 * Diferente de `lucroDoMes`: despesas de carros AINDA EM ESTOQUE não entram
 * (são investimento, não prejuízo), e cada carro usa suas próprias despesas
 * vinculadas independente da data.
 */
export function lucroRealizadoMes(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): number {
  const vendasMes = vendas.filter((v) => dentroDoMes(v.data, ref))
  const realizado = vendasMes.reduce((acc, v) => {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    return acc + calcularLucroVenda(v, veic, despesas)
  }, 0)
  return realizado - despesasGeraisDoMes(despesas, ref)
}

export interface LucroBreakdown {
  /** Lucro realizado do negócio no mês (número "MG"). */
  total: number
  /** Lucro bruto dos carros vendidos, antes das despesas gerais. */
  realizadoVeiculos: number
  /** Despesas gerais do mês (sem veículo). */
  despesasGerais: number
  /** Parte que cabe ao(s) sócio(s) — metade dos carros "a meia" vendidos. */
  socio: number
  /** Sua parte (Maicon) = total − parte do(s) sócio(s). */
  meu: number
  /** Há pelo menos um carro "a meia" vendido no mês (habilita a exibição). */
  temDivisao: boolean
}

/**
 * Lucro do mês separado em "MG" (total realizado), "seu" (Maicon) e
 * "do(s) sócio(s)". A parte do sócio é metade do lucro de cada carro "a meia"
 * vendido; despesas gerais reduzem apenas a sua parte (não a do sócio).
 */
export function lucroDoMesBreakdown(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): LucroBreakdown {
  const vendasMes = vendas.filter((v) => dentroDoMes(v.data, ref))
  let realizadoVeiculos = 0
  let socio = 0
  for (const v of vendasMes) {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    realizadoVeiculos += calcularLucroVenda(v, veic, despesas)
    socio += parteSocioVenda(v, veic, despesas)
  }
  const despesasGerais = despesasGeraisDoMes(despesas, ref)
  const total = realizadoVeiculos - despesasGerais
  return {
    total,
    realizadoVeiculos,
    despesasGerais,
    socio,
    meu: total - socio,
    temDivisao: socio !== 0,
  }
}

export function vendidosNoMes(vendas: Venda[], ref: Date): number {
  return vendas.filter((v) => dentroDoMes(v.data, ref)).length
}

export function ticketMedioDoMes(vendas: Venda[], ref: Date): number {
  const doMes = vendas.filter((v) => dentroDoMes(v.data, ref))
  if (doMes.length === 0) return 0
  return doMes.reduce((acc, v) => acc + v.valor_venda, 0) / doMes.length
}

export function roiMedioDoMes(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): number {
  const doMes = vendas.filter((v) => dentroDoMes(v.data, ref))
  if (doMes.length === 0) return 0
  let soma = 0
  for (const v of doMes) {
    const veic = veiculos.find((x) => x.id === v.veiculo_id)
    if (!veic) continue
    soma += calcularROI(veic, vendas, despesas)
  }
  return soma / doMes.length
}

// -----------------------------------------------------------------------------
// VARIAÇÃO PERCENTUAL VS MÊS ANTERIOR
// -----------------------------------------------------------------------------

/**
 * Variação % entre `atual` e `anterior`.
 * Quando o anterior é 0 retorna 100 se houver valor atual, 0 caso contrário —
 * evita Infinity quebrando a UI.
 */
export function variacaoPercentual(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100
  return ((atual - anterior) / Math.abs(anterior)) * 100
}

export function refMesAnterior(ref: Date): Date {
  return subMonths(ref, 1)
}

// -----------------------------------------------------------------------------
// ESTOQUE
// -----------------------------------------------------------------------------

export function totalEmEstoque(veiculos: Veiculo[]): number {
  return veiculos.filter((v) => v.status !== 'vendido').length
}

export function distribuicaoEstoque(
  veiculos: Veiculo[],
): { status: StatusVeiculo; total: number }[] {
  const base: StatusVeiculo[] = [
    'em preparação',
    'disponível',
    'reservado',
    'vendido',
  ]
  return base.map((s) => ({
    status: s,
    total: veiculos.filter((v) => v.status === s).length,
  }))
}

// -----------------------------------------------------------------------------
// SÉRIES TEMPORAIS PARA OS GRÁFICOS
// -----------------------------------------------------------------------------

export interface PontoMensal {
  /** label curta tipo "Jan", "Fev"... */
  mes: string
  /** chave ISO yyyy-MM */
  chave: string
  receita: number
  custos: number
  lucro: number
}

/**
 * Últimos N meses (inclui o mês de `ref`).
 * Para cada mês: receita das vendas, custo (aquisição vendidos + despesas) e lucro.
 */
export function serieUltimosMeses(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
  n = 6,
): PontoMensal[] {
  const meses: PontoMensal[] = []
  for (let i = n - 1; i >= 0; i--) {
    const ponto = subMonths(ref, i)
    const receita = receitaDoMes(vendas, ponto)
    const lucroRealizado = lucroRealizadoMes(vendas, veiculos, despesas, ponto)
    // Custos "realizados" = tudo que não virou lucro (custo dos vendidos +
    // suas despesas + despesas gerais), mantendo receita − custos = lucro.
    const custos = receita - lucroRealizado
    meses.push({
      mes: ponto
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '')
        .replace(/^./, (c) => c.toUpperCase()),
      chave: `${ponto.getFullYear()}-${String(ponto.getMonth() + 1).padStart(2, '0')}`,
      receita,
      custos,
      lucro: lucroRealizado,
    })
  }
  return meses
}

/** Lucro acumulado mês a mês dentro do ano de `ref`. */
export function lucroAcumuladoAno(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  ref: Date,
): { mes: string; acumulado: number }[] {
  const ano = ref.getFullYear()
  const out: { mes: string; acumulado: number }[] = []
  let acc = 0
  for (let m = 0; m < 12; m++) {
    const ponto = new Date(ano, m, 15)
    if (ponto > ref && m > ref.getMonth()) break
    const lucroMes = lucroRealizadoMes(vendas, veiculos, despesas, ponto)
    acc += lucroMes
    out.push({
      mes: ponto
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '')
        .replace(/^./, (c) => c.toUpperCase()),
      acumulado: acc,
    })
  }
  return out
}

// -----------------------------------------------------------------------------
// AGREGAÇÕES DE DESPESAS (módulo Despesas)
// -----------------------------------------------------------------------------

/**
 * Soma despesas agrupadas por tipo. Retorna sempre o mapa completo com TODOS
 * os tipos canônicos (mesmo os zerados) — facilita renderizar os 7 cards de
 * categoria sem precisar lidar com chaves ausentes na UI.
 */
export function somarDespesasPorTipo(
  despesas: Despesa[],
): Record<TipoDespesa, { total: number; quantidade: number }> {
  const base = {} as Record<TipoDespesa, { total: number; quantidade: number }>
  for (const t of TIPOS_DESPESA) base[t] = { total: 0, quantidade: 0 }

  for (const d of despesas) {
    const slot = base[d.tipo]
    if (!slot) continue // tipo legado/desconhecido — ignora silenciosamente
    slot.total += d.valor
    slot.quantidade += 1
  }
  return base
}

/** Soma das despesas marcadas como pagas. */
export function somarDespesasPagas(despesas: Despesa[]): number {
  return despesas.filter((d) => d.pago).reduce((acc, d) => acc + d.valor, 0)
}

/** Total e quantidade de despesas em aberto (não pagas). */
export function somarDespesasEmAberto(despesas: Despesa[]): {
  total: number
  quantidade: number
} {
  const abertas = despesas.filter((d) => !d.pago)
  return {
    total: abertas.reduce((acc, d) => acc + d.valor, 0),
    quantidade: abertas.length,
  }
}

// -----------------------------------------------------------------------------
// CALCULADORA DE DIVISÃO 50/50 (módulo Despesas)
// -----------------------------------------------------------------------------

export interface DivisaoSocioLinha {
  participante: string
  /** Quanto este sócio pagou em despesas — deve ser resarcido. */
  despesasPagas: number
  /** Metade do valor que sobrou após reembolsar todas as despesas. */
  metadeLucro: number
  /** reembolso + metadeLucro */
  valorAReceber: number
}

export interface ResultadoDivisaoMeiaCarro {
  valorTotal: number
  totalDespesas: number
  /** valorTotal − totalDespesas */
  valorRestante: number
  despesasNaoAtribuidas: number
  linhas: DivisaoSocioLinha[]
  somaLiquido: number
}

function normalizarNomeSocio(nome: string): string {
  return nome.trim().toLowerCase()
}

/** Soma despesas de um veículo agrupadas por quem pagou (chave normalizada). */
export function despesasDoVeiculoPorPessoa(
  veiculoId: string,
  despesas: Despesa[],
): Map<string, { nomeExibicao: string; total: number }> {
  const mapa = new Map<string, { nomeExibicao: string; total: number }>()
  for (const d of despesas) {
    if (d.veiculo_id !== veiculoId) continue
    const bruto = d.pago_por?.trim() || 'Sem identificação'
    const chave = normalizarNomeSocio(bruto)
    const atual = mapa.get(chave)
    if (atual) {
      atual.total += d.valor
    } else {
      mapa.set(chave, { nomeExibicao: bruto, total: d.valor })
    }
  }
  return mapa
}

/**
 * Divisão 50/50 após reembolso de despesas:
 *   1. Do valor recebido na venda, resgata-se o que cada sócio pagou em despesas
 *   2. O que sobrar é dividido igualmente (50/50)
 *   3. Cada sócio recebe: reembolso das despesas + metade do que sobrou
 */
export function calcularDivisaoMeiaCarro(
  valorTotal: number,
  veiculoId: string,
  despesas: Despesa[],
  participantes: [string, string],
): ResultadoDivisaoMeiaCarro {
  const mapaDespesas = despesasDoVeiculoPorPessoa(veiculoId, despesas)
  const despesasVeiculo = despesas.filter((d) => d.veiculo_id === veiculoId)
  const totalDespesas = despesasVeiculo.reduce((acc, d) => acc + d.valor, 0)
  const valorRestante = valorTotal - totalDespesas
  const metadeLucro = valorRestante / 2

  const linhas: DivisaoSocioLinha[] = participantes.map((nome) => {
    const chave = normalizarNomeSocio(nome)
    const reembolso = mapaDespesas.get(chave)?.total ?? 0
    return {
      participante: nome.trim() || '—',
      despesasPagas: reembolso,
      metadeLucro,
      valorAReceber: reembolso + metadeLucro,
    }
  })

  const atribuidas = linhas.reduce((acc, l) => acc + l.despesasPagas, 0)
  const somaLiquido = linhas.reduce((acc, l) => acc + l.valorAReceber, 0)

  return {
    valorTotal,
    totalDespesas,
    valorRestante,
    despesasNaoAtribuidas: Math.max(0, totalDespesas - atribuidas),
    linhas,
    somaLiquido,
  }
}

/** Sugere dois nomes para a divisão a partir dos sócios e de quem pagou despesas. */
export function sugerirParticipantesDivisao(
  socios: string[],
  despesasVeiculo: Despesa[],
): [string, string] {
  const nomes = new Map<string, string>()
  for (const s of socios) {
    const t = s.trim()
    if (t) nomes.set(normalizarNomeSocio(t), t)
  }
  for (const d of despesasVeiculo) {
    const t = d.pago_por?.trim()
    if (t) nomes.set(normalizarNomeSocio(t), t)
  }
  const lista = Array.from(nomes.values())
  return [lista[0] ?? 'Sócio 1', lista[1] ?? 'Sócio 2']
}

// -----------------------------------------------------------------------------
// SIMULADOR DE NEGÓCIO (módulo Calculadora)
// -----------------------------------------------------------------------------

export interface ResultadoSimulacaoNegocio {
  lucroBruto: number
  lucroLiquido: number
  margemPercentual: number
  roiPercentual: number
  /** FIPE − compra (positivo = compra abaixo da FIPE). */
  diffCompraFipe: number
  /** Venda − FIPE. */
  diffVendaFipe: number
  /** Venda − compra. */
  diffVendaCompra: number
  custoTotal: number
}

export function calcularSimulacaoNegocio(
  precoCompra: number,
  valorFipe: number,
  precoVenda: number,
  despesasEstimadas = 0,
): ResultadoSimulacaoNegocio {
  const custoTotal = precoCompra + despesasEstimadas
  const lucroBruto = precoVenda - precoCompra
  const lucroLiquido = precoVenda - custoTotal
  const margemPercentual =
    precoCompra > 0 ? (lucroBruto / precoCompra) * 100 : 0
  const roiPercentual = custoTotal > 0 ? (lucroLiquido / custoTotal) * 100 : 0

  return {
    lucroBruto,
    lucroLiquido,
    margemPercentual,
    roiPercentual,
    diffCompraFipe: valorFipe - precoCompra,
    diffVendaFipe: precoVenda - valorFipe,
    diffVendaCompra: precoVenda - precoCompra,
    custoTotal,
  }
}

// -----------------------------------------------------------------------------
// AGREGAÇÕES DE COMPRAS
// -----------------------------------------------------------------------------

/** Soma o valor pago de uma lista de compras (já filtrada se for o caso). */
export function somarCompras(compras: Compra[]): number {
  return compras.reduce((acc, c) => acc + c.valor_pago, 0)
}

/** Ticket médio das compras informadas. Retorna 0 se a lista estiver vazia. */
export function ticketMedioCompras(compras: Compra[]): number {
  if (compras.length === 0) return 0
  return somarCompras(compras) / compras.length
}

// -----------------------------------------------------------------------------
// ÚLTIMAS MOVIMENTAÇÕES (vendas + compras + despesas)
// -----------------------------------------------------------------------------

export function ultimasMovimentacoes(
  vendas: Venda[],
  compras: Compra[],
  despesas: Despesa[],
  veiculos: Veiculo[],
  limite = 5,
): Movimentacao[] {
  const descreverVeiculo = (id: string) => {
    const v = veiculos.find((x) => x.id === id)
    if (!v) return 'Veículo'
    return `${v.marca} ${v.modelo} (${v.placa})`
  }

  const vendasMov: Movimentacao[] = vendas.map((v) => ({
    id: `venda-${v.id}`,
    tipo: 'venda',
    descricao: `Venda — ${descreverVeiculo(v.veiculo_id)}`,
    data: v.data,
    valor: v.valor_venda,
    sinal: 'entrada',
  }))

  const comprasMov: Movimentacao[] = compras.map((c) => ({
    id: `compra-${c.id}`,
    tipo: 'compra',
    descricao: `Compra — ${descreverVeiculo(c.veiculo_id)}`,
    data: c.data,
    valor: c.valor_pago,
    sinal: 'saida',
  }))

  const despesasMov: Movimentacao[] = despesas.map((d) => ({
    id: `despesa-${d.id}`,
    tipo: 'despesa',
    descricao: d.pago_por
      ? `Despesa — ${d.descricao} (pago por ${d.pago_por})`
      : `Despesa — ${d.descricao}`,
    data: d.data,
    valor: d.valor,
    sinal: 'saida',
  }))

  return [...vendasMov, ...comprasMov, ...despesasMov]
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, limite)
}
