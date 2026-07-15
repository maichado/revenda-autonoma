// Regras do módulo Banco Pessoal — visão pessoal do dono (Maicon).

//

// Pool pessoal (capital + reinvestimento):

//   • Começa com capital inicial (ex.: R$ 38.000)

//   • Compra de carro consome sua parte (solo 100%, meia 50%) do pool

//   • Venda devolve sua parte do valor de venda ao pool → reinvestimento

//   • O que passar do pool vira dinheiro pessoal extra (a devolver)

//   • Despesas com `pago_por` = dono também entram em "a devolver"



import type {

  CarroBancoPessoal,

  Despesa,

  LancamentoBancoPessoal,

  MovimentacaoPool,

  StatusCarroPessoal,

  StatusVeiculo,

  TipoPropriedade,

  Veiculo,

  Venda,

} from '@/types'

import { despesasDoVeiculo } from '@/utils/calculos'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import { despesasCaixaRevenda } from '@/utils/despesaOrigem'
import { primeiroNomeSocio, socioPrincipal } from '@/utils/socios'

/** Parâmetros extras para debitar despesas do caixa da loja na simulação. */
export interface OpcoesSimulacaoCaixa {
  despesas?: Despesa[]
  nomeRevenda?: string
  socios?: string[]
}

function opcoesCaixaResolvidas(opcoes?: OpcoesSimulacaoCaixa) {
  return {
    despesas: opcoes?.despesas ?? [],
    nomeRevenda: opcoes?.nomeRevenda?.trim() || NOME_REVENDA_PADRAO,
    socios: opcoes?.socios ?? [],
  }
}



/** Capital pessoal padrão do dono quando não configurado no servidor. */

export const CAPITAL_INICIAL_PADRAO = 38000



/** Fração do carro que é do dono: 1 (solo) ou 0.5 (a meia). */

export function fracaoMaicon(tipo: TipoPropriedade | undefined): number {

  return tipo === 'meia' ? 0.5 : 1

}



/** Total investido no carro (negócio) = compra + despesas. */

export function totalInvestido(carro: CarroBancoPessoal): number {

  return (Number(carro.valor_compra) || 0) + (Number(carro.custo_reforma) || 0)

}



/** Sua parte do investimento = total × fração (meia = metade). */

export function minhaParteInvestida(carro: CarroBancoPessoal): number {

  return totalInvestido(carro) * carro.fracao_maicon

}

export interface DetalheMinhaParteCarro {
  valorCompra: number
  custoReforma: number
  totalNegocio: number
  fracao: number
  minhaParte: number
  rotuloFracao: string
}

/** Explicação do valor "Minha parte" na tabela do Banco Pessoal. */
export function detalheMinhaParteCarro(
  carro: CarroBancoPessoal,
): DetalheMinhaParteCarro {
  const valorCompra = Number(carro.valor_compra) || 0
  const custoReforma = Number(carro.custo_reforma) || 0
  const totalNegocio = valorCompra + custoReforma
  const fracao = carro.fracao_maicon
  const minhaParte = totalNegocio * fracao

  return {
    valorCompra,
    custoReforma,
    totalNegocio,
    fracao,
    minhaParte,
    rotuloFracao: fracao === 1 ? '100% seu' : '50% seu',
  }
}

export interface DetalheVendaCarro {
  valorTotal: number | null
  minhaParte: number | null
  fracao: number
  vendido: boolean
}

/** Valor da venda (total e sua parte) para a coluna Venda do Banco Pessoal. */
export function detalheVendaCarro(carro: CarroBancoPessoal): DetalheVendaCarro {
  const bruto = carro.valor_venda
  const valorTotal =
    bruto != null && Number.isFinite(Number(bruto)) && Number(bruto) > 0
      ? Number(bruto)
      : null
  const fracao = carro.fracao_maicon
  const vendido = valorTotal != null
  const minhaParte = vendido ? valorTotal * fracao : null

  return { valorTotal, minhaParte, fracao, vendido }
}



export function lucroCarro(carro: CarroBancoPessoal): number | null {

  if (carro.status !== 'vendido' || carro.valor_venda == null) return null

  return (Number(carro.valor_venda) || 0) - totalInvestido(carro)

}



/** Lucro líquido só da sua parte (considera fração no investimento). */

export function lucroMeuCarro(carro: CarroBancoPessoal): number | null {

  const lucro = lucroCarro(carro)

  if (lucro == null) return null

  return lucro * carro.fracao_maicon

}



export interface StatusCarroMeta {

  label: string

  badge: string

}



export const STATUS_CARRO_META: Record<StatusCarroPessoal, StatusCarroMeta> = {

  em_estoque: {

    label: 'Em estoque',

    badge:

      'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30',

  },

  reservado: {

    label: 'Reservado',

    badge:

      'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30',

  },

  vendido: {

    label: 'Vendido',

    badge:

      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30',

  },

}



export interface ExtrapessoalCompra {

  veiculo_id: string

  nome: string

  placa: string

  data: string

  valor: number

  reembolsado: boolean

}



export interface FundingCompra {

  veiculo_id: string

  /** Sua parte paga com caixa da revenda (100% da loja × sua fração). */
  do_revenda: number

  do_capital_inicial: number

  do_reinvestimento: number

  do_bolso: number

}

/** Pool pessoal (capital + reinvestimento) usado na compra. */
export function investimentoFunding(f: FundingCompra): number {
  return f.do_capital_inicial + f.do_reinvestimento
}

export function veiculoTemFundingManual(v: Veiculo): boolean {
  return v.compra_funding_manual === true
}

export function splitFundingMeiaSocio(
  total: number,
  meiaSocio?: boolean,
): { meu: number; socio: number; total: number } {
  const valor = Math.max(0, Number(total) || 0)
  if (!meiaSocio) return { meu: valor, socio: 0, total: valor }
  const meu = valor / 2
  return { meu, socio: meu, total: valor }
}

/** Quanto do investimento informado sai do pool do dono (metade se 50/50 com sócio). */
export function investimentoPoolNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_investimento) || 0,
    v.compra_funding_investimento_meia_socio,
  ).meu
}

/** Parte do investimento informado que é do sócio. */
export function investimentoSocioNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_investimento) || 0,
    v.compra_funding_investimento_meia_socio,
  ).socio
}

export function revendaMeuNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_revenda) || 0,
    v.compra_funding_revenda_meia_socio,
  ).meu
}

export function revendaSocioNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_revenda) || 0,
    v.compra_funding_revenda_meia_socio,
  ).socio
}

export function pessoalMeuNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_pessoal) || 0,
    v.compra_funding_pessoal_meia_socio,
  ).meu
}

export function pessoalSocioNaCompra(v: Veiculo): number {
  return splitFundingMeiaSocio(
    Number(v.compra_funding_pessoal) || 0,
    v.compra_funding_pessoal_meia_socio,
  ).socio
}

/** Valores sugeridos para o formulário (revenda = 100% da loja). */
export function sugerirFundingCompraFormulario(
  veiculo: Veiculo,
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
): { revenda: number; investimento: number; pessoal: number } {
  const f = previewFundingCompra(
    veiculo,
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  )
  return {
    revenda: f.do_revenda,
    investimento: investimentoFunding(f),
    pessoal: f.do_bolso,
  }
}

function aplicarInvestimentoPool(
  valor: number,
  saldoCapitalInicial: number,
  saldoReinvestimento: number,
): {
  doCapital: number
  doReinvest: number
  saldoCapitalInicial: number
  saldoReinvestimento: number
} {
  const doCapital = Math.min(valor, saldoCapitalInicial)
  const restante = valor - doCapital
  const doReinvest = Math.min(restante, saldoReinvestimento)
  return {
    doCapital,
    doReinvest,
    saldoCapitalInicial: saldoCapitalInicial - doCapital,
    saldoReinvestimento: saldoReinvestimento - doReinvest,
  }
}



export interface SimulacaoPoolPessoal {

  extrapessoal: ExtrapessoalCompra[]

  fundingPorVeiculo: Map<string, FundingCompra>

  movimentacoes: MovimentacaoPool[]

  saldoFinal: number

  saldoCapitalInicial: number

  saldoReinvestimento: number

  totalReinvestido: number

  /** Caixa livre da revenda após simulação. */
  saldoRevendaFinal: number

}



type EventoPool =

  | {

      tipo: 'compra'

      data: string

      veiculo: Veiculo

      ordem: number

    }

  | {

      tipo: 'venda'

      data: string

      veiculo: Veiculo

      venda: Venda

      ordem: number

    }

  | {

      tipo: 'despesa_revenda'

      data: string

      despesa: Despesa

      ordem: number

    }



function nomeVeiculo(v: Veiculo): string {

  const rotulo = `${v.marca} ${v.modelo}`.trim()

  return rotulo || v.placa

}



function mapaVendasPorVeiculo(vendas: Venda[]): Map<string, Venda> {

  const map = new Map<string, Venda>()

  for (const venda of vendas) {

    if (!map.has(venda.veiculo_id)) map.set(venda.veiculo_id, venda)

  }

  return map

}



function montarEventosPool(

  veiculos: Veiculo[],

  vendas: Venda[],

  despesasRevenda: Despesa[] = [],

): EventoPool[] {

  const vendasMap = mapaVendasPorVeiculo(vendas)

  const eventos: EventoPool[] = []

  let ordem = 0



  for (const v of veiculos) {

    eventos.push({ tipo: 'compra', data: v.data_compra, veiculo: v, ordem: ordem++ })

    const venda = vendasMap.get(v.id)

    if (venda) {

      eventos.push({

        tipo: 'venda',

        data: venda.data,

        veiculo: v,

        venda,

        ordem: ordem++,

      })

    }

  }



  for (const d of despesasRevenda) {

    eventos.push({

      tipo: 'despesa_revenda',

      data: d.data,

      despesa: d,

      ordem: ordem++,

    })

  }



  // Mesmo dia: venda → compra → despesa da loja.

  eventos.sort((a, b) => {

    const cmp = a.data.localeCompare(b.data)

    if (cmp !== 0) return cmp

    const prio = (e: EventoPool) => {

      if (e.tipo === 'venda') return 0

      if (e.tipo === 'compra') return 1

      return 2

    }

    const pa = prio(a)

    const pb = prio(b)

    if (pa !== pb) return pa - pb

    return a.ordem - b.ordem

  })



  return eventos

}



/**

 * Simula o pool pessoal em ordem cronológica: capital inicial, compras que

 * consomem, vendas que reinvestem, e o que passou do pool (bolso).

 */

export function simularPoolPessoal(

  veiculos: Veiculo[],

  vendas: Venda[],

  capitalInicial: number,

  opcoesCaixa?: OpcoesSimulacaoCaixa,

): SimulacaoPoolPessoal {

  const caixaCfg = opcoesCaixaResolvidas(opcoesCaixa)

  const despesasRevenda = despesasCaixaRevenda(

    caixaCfg.despesas,

    caixaCfg.nomeRevenda,

    caixaCfg.socios,

  )

  let saldoCapitalInicial = Math.max(capitalInicial, 0)

  let saldoReinvestimento = 0

  let saldoRevenda = 0

  let totalReinvestido = 0



  const extrapessoal: ExtrapessoalCompra[] = []

  const fundingPorVeiculo = new Map<string, FundingCompra>()

  const movimentacoes: MovimentacaoPool[] = []



  const saldoTotal = () => saldoCapitalInicial + saldoReinvestimento



  if (capitalInicial > 0) {

    movimentacoes.push({

      id: 'pool-inicio',

      data: '',

      tipo: 'capital_inicial',

      valor: capitalInicial,

      saldo_apos: capitalInicial,

      detalhe: 'Capital pessoal inicial no negócio',

    })

  }



  for (const ev of montarEventosPool(veiculos, vendas, despesasRevenda)) {

    if (ev.tipo === 'despesa_revenda') {

      const valor = Number(ev.despesa.valor) || 0

      if (valor > 0) saldoRevenda -= valor

      continue

    }

    if (ev.tipo === 'venda') {

      const valorVenda = Number(ev.venda.valor_venda) || 0

      const fracao = fracaoMaicon(ev.veiculo.tipo_propriedade)

      const credito = fracao * valorVenda

      if (valorVenda > 0) saldoRevenda += valorVenda

      if (credito <= 0) continue



      saldoReinvestimento += credito

      totalReinvestido += credito



      movimentacoes.push({

        id: `venda-${ev.venda.id}`,

        data: ev.data,

        tipo: 'venda',

        veiculo_id: ev.veiculo.id,

        carro_nome: nomeVeiculo(ev.veiculo),

        valor: credito,

        saldo_apos: saldoTotal(),

        detalhe: `Venda ${nomeVeiculo(ev.veiculo)} — sua parte (${fracao === 1 ? '100%' : '50%'}) volta ao pool`,

      })

      continue

    }



    const v = ev.veiculo

    const fracao = fracaoMaicon(v.tipo_propriedade)

    const valorCompra = Number(v.valor_compra) || 0

    if (valorCompra <= 0) continue



    let doRevendaTotal: number

    let doInvestimento: number

    let doBolso: number

    let doCapital: number

    let doReinvest: number



    if (veiculoTemFundingManual(v)) {

      doRevendaTotal = Math.max(0, Number(v.compra_funding_revenda) || 0)

      doInvestimento = Math.max(0, Number(v.compra_funding_investimento) || 0)

      doBolso = pessoalMeuNaCompra(v)

      saldoRevenda -= doRevendaTotal

      const investimentoPool = investimentoPoolNaCompra(v)

      const pool = aplicarInvestimentoPool(

        investimentoPool,

        saldoCapitalInicial,

        saldoReinvestimento,

      )

      doCapital = pool.doCapital

      doReinvest = pool.doReinvest

      saldoCapitalInicial = pool.saldoCapitalInicial

      saldoReinvestimento = pool.saldoReinvestimento

    } else {

      doRevendaTotal = Math.min(valorCompra, saldoRevenda)

      saldoRevenda -= doRevendaTotal



      const minhaParteCompra = fracao * valorCompra

      const doRevendaMaicon = valorCompra > 0 ? doRevendaTotal * fracao : 0

      const debitoPool = Math.max(0, minhaParteCompra - doRevendaMaicon)



      doCapital = Math.min(debitoPool, saldoCapitalInicial)

      const restante = debitoPool - doCapital

      doReinvest = Math.min(restante, saldoReinvestimento)

      doBolso = restante - doReinvest

      doInvestimento = doCapital + doReinvest



      saldoCapitalInicial -= doCapital

      saldoReinvestimento -= doReinvest

    }



    fundingPorVeiculo.set(v.id, {

      veiculo_id: v.id,

      do_revenda: doRevendaTotal,

      do_capital_inicial: doCapital,

      do_reinvestimento: doReinvest,

      do_bolso: doBolso,

    })



    if (doBolso > 0) {

      extrapessoal.push({

        veiculo_id: v.id,

        nome: nomeVeiculo(v),

        placa: v.placa,

        data: v.data_compra,

        valor: doBolso,

        reembolsado: Boolean(v.compra_pessoal_reembolsada),

      })

    }



    const partes: string[] = []

    if (doRevendaTotal > 0) {
      const revSplit = splitFundingMeiaSocio(
        doRevendaTotal,
        veiculoTemFundingManual(v) ? v.compra_funding_revenda_meia_socio : false,
      )
      if (revSplit.socio > 0) {
        partes.push(
          `${formatarMoedaCurta(revSplit.total)} revenda (${formatarMoedaCurta(revSplit.meu)} seu + ${formatarMoedaCurta(revSplit.socio)} sócio)`,
        )
      } else {
        partes.push(`${formatarMoedaCurta(doRevendaTotal)} da revenda`)
      }
    }

    if (doInvestimento > 0) {

      const socioInv = investimentoSocioNaCompra(v)

      if (socioInv > 0) {

        partes.push(

          `${formatarMoedaCurta(doInvestimento)} investimento (${formatarMoedaCurta(investimentoPoolNaCompra(v))} seu + ${formatarMoedaCurta(socioInv)} sócio)`,

        )

      } else {

        partes.push(`${formatarMoedaCurta(doInvestimento)} investimento`)

      }

    }

    if (doBolso > 0 || (veiculoTemFundingManual(v) && (Number(v.compra_funding_pessoal) || 0) > 0)) {
      const pesTotal = veiculoTemFundingManual(v)
        ? Number(v.compra_funding_pessoal) || 0
        : doBolso
      const pesSplit = splitFundingMeiaSocio(
        pesTotal,
        veiculoTemFundingManual(v) ? v.compra_funding_pessoal_meia_socio : false,
      )
      if (pesSplit.socio > 0) {
        partes.push(
          `${formatarMoedaCurta(pesSplit.total)} pessoal (${formatarMoedaCurta(pesSplit.meu)} seu + ${formatarMoedaCurta(pesSplit.socio)} sócio)`,
        )
      } else if (doBolso > 0) {
        partes.push(`${formatarMoedaCurta(doBolso)} pessoal (bolso)`)
      }
    }



    movimentacoes.push({

      id: `compra-${v.id}`,

      data: v.data_compra,

      tipo: 'compra',

      veiculo_id: v.id,

      carro_nome: nomeVeiculo(v),

      valor: -(doRevendaTotal + doInvestimento + doBolso),

      saldo_apos: saldoTotal(),

      detalhe: `Compra ${nomeVeiculo(v)} — ${partes.join(', ') || 'sem origem identificada'}`,

    })

  }



  return {

    extrapessoal,

    fundingPorVeiculo,

    movimentacoes,

    saldoFinal: saldoTotal(),

    saldoCapitalInicial,

    saldoReinvestimento,

    totalReinvestido,

    saldoRevendaFinal: saldoRevenda,

  }

}



/**
 * Caixa livre da loja (100% — seu + sócios): vendas entram, compras e despesas
 * pagas pelo caixa da revenda consomem o saldo.
 */
export function simularCaixaRevenda(
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial = 0,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
): number {
  return simularPoolPessoal(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  ).saldoRevendaFinal
}



/** Classificação da compra de um veículo (revenda / investimento / pessoal). */
export function fundingCompraVeiculo(
  veiculoId: string,
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
): FundingCompra | undefined {
  return simularPoolPessoal(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  ).fundingPorVeiculo.get(veiculoId)
}



/** Simula funding incluindo um veículo novo ou editado (preview no cadastro). */
export function previewFundingCompra(
  veiculo: Veiculo,
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
): FundingCompra {
  const lista = veiculos.filter((v) => v.id !== veiculo.id).concat(veiculo)
  const funding = simularPoolPessoal(
    lista,
    vendas,
    capitalInicial,
    opcoesCaixa,
  ).fundingPorVeiculo.get(veiculo.id)
  return (
    funding ?? {
      veiculo_id: veiculo.id,
      do_revenda: 0,
      do_capital_inicial: 0,
      do_reinvestimento: 0,
      do_bolso: 0,
    }
  )
}



function formatarMoedaCurta(valor: number): string {

  return valor.toLocaleString('pt-BR', {

    style: 'currency',

    currency: 'BRL',

    maximumFractionDigits: 0,

  })

}



/** @deprecated Use simularPoolPessoal — mantido como alias interno. */

export function calcularExtrapessoalCompras(

  veiculos: Veiculo[],

  capitalInicial: number,

  vendas: Venda[] = [],

): ExtrapessoalCompra[] {

  return simularPoolPessoal(veiculos, vendas, capitalInicial).extrapessoal

}



export interface ResumoBancoPessoal {

  capitalInicial: number

  minhaParteEstoque: number

  /** Saldo livre no pool (capital inicial restante + reinvestimentos). */

  capitalDisponivel: number

  saldoCapitalInicial: number

  saldoReinvestimento: number

  totalReinvestido: number

  extrapessoalComprasTotal: number

  investidoEmEstoque: number

  investidoTotal: number

  totalADevolver: number

  totalDevolvido: number

  lucroRealizadoMeu: number

  qtdCarros: number
  qtdVendidos: number
  /** Caixa livre no pool pessoal (= capitalDisponivel). */
  caixaPool: number
  /** Caixa livre da loja — 100% (seu + sócios). */
  caixaRevenda: number
  /** Caixa + sua parte em estoque — patrimônio pessoal no negócio. */
  patrimonioTotal: number
  /** Patrimônio acima do capital inicial (crescimento dos giros). */
  crescimentoPatrimonio: number
  /** Quanto do capital inicial de R$ 38 mil ainda está líquido no pool. */
  capitalInicialLivre: number
}



export function resumoBancoPessoal(

  carros: CarroBancoPessoal[],

  lancamentos: LancamentoBancoPessoal[],

  capitalInicial: number,

  veiculos: Veiculo[],

  vendas: Venda[],

  opcoesCaixa?: OpcoesSimulacaoCaixa,

): ResumoBancoPessoal {

  const sim = simularPoolPessoal(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  )



  const r: ResumoBancoPessoal = {

    capitalInicial,

    minhaParteEstoque: 0,

    capitalDisponivel: sim.saldoFinal,

    saldoCapitalInicial: sim.saldoCapitalInicial,

    saldoReinvestimento: sim.saldoReinvestimento,

    totalReinvestido: sim.totalReinvestido,

    extrapessoalComprasTotal: 0,

    investidoEmEstoque: 0,

    investidoTotal: 0,

    totalADevolver: 0,

    totalDevolvido: 0,

    lucroRealizadoMeu: 0,

    qtdCarros: carros.length,
    qtdVendidos: 0,
    caixaPool: 0,
    caixaRevenda: sim.saldoRevendaFinal,
    patrimonioTotal: 0,
    crescimentoPatrimonio: 0,
    capitalInicialLivre: sim.saldoCapitalInicial,
  }



  for (const carro of carros) {

    const total = totalInvestido(carro)

    const minha = minhaParteInvestida(carro)

    r.investidoTotal += total

    if (carro.status !== 'vendido') {

      r.investidoEmEstoque += total

      r.minhaParteEstoque += minha

    } else {

      r.qtdVendidos += 1

      const lucroMeu = lucroMeuCarro(carro)

      if (lucroMeu != null) r.lucroRealizadoMeu += lucroMeu

    }

  }



  for (const e of sim.extrapessoal) {

    r.extrapessoalComprasTotal += e.valor

  }



  for (const l of lancamentos) {

    const valor = Number(l.valor) || 0

    if (l.status === 'a_devolver') r.totalADevolver += valor

    else r.totalDevolvido += valor
  }

  r.caixaPool = r.capitalDisponivel
  r.patrimonioTotal = r.capitalDisponivel + r.minhaParteEstoque
  r.crescimentoPatrimonio = r.patrimonioTotal - r.capitalInicial
  r.capitalInicialLivre = sim.saldoCapitalInicial

  return r
}



// ---------------------------------------------------------------------------

// Sincronização automática

// ---------------------------------------------------------------------------



function normalizarNome(n: string): string {

  return n

    .trim()

    .toLowerCase()

    .normalize('NFD')

    .replace(/\p{M}/gu, '')

}



export function primeiroNomeDono(socios: string[]): string {

  const dono = socioPrincipal(socios)

  if (!dono) return 'Você'

  return primeiroNomeSocio(dono) || dono

}



export function nomeDonoCompleto(socios: string[]): string {

  return socioPrincipal(socios) || 'Dono'

}



export function ehPagoPorDono(pagoPor: string, dono: string): boolean {

  const p = normalizarNome(pagoPor)

  const d = normalizarNome(dono)

  if (!p || !d) return false

  if (p === d) return true

  const priDono = d.split(/\s+/)[0]

  const priPago = p.split(/\s+/)[0]

  if (priDono && priDono === priPago) return true

  if (p.includes(d) || d.includes(p)) return true

  return false

}



function statusVeiculoParaPessoal(status: StatusVeiculo): StatusCarroPessoal {

  if (status === 'disponível' || status === 'em preparação') return 'em_estoque'

  if (status === 'reservado') return 'reservado'

  return 'vendido'

}



export function carrosFromSistema(

  veiculos: Veiculo[],

  despesas: Despesa[],

  vendas: Venda[],

  capitalInicial: number,

  opcoesCaixa?: Omit<OpcoesSimulacaoCaixa, 'despesas'>,

): CarroBancoPessoal[] {

  const sim = simularPoolPessoal(veiculos, vendas, capitalInicial, {
    despesas,
    ...opcoesCaixa,
  })

  const extrapPorVeic = new Map(

    sim.extrapessoal.map((e) => [e.veiculo_id, e.valor]),

  )



  return veiculos.map((v) => {

    const venda = vendas.find((x) => x.veiculo_id === v.id)

    const fracao = fracaoMaicon(v.tipo_propriedade)

    const custoReforma = despesasDoVeiculo(v.id, despesas)

    const funding = sim.fundingPorVeiculo.get(v.id)

    const carro: CarroBancoPessoal = {

      id: v.id,

      veiculo_id: v.id,

      nome: nomeVeiculo(v),

      placa: v.placa,

      status: statusVeiculoParaPessoal(v.status),

      valor_compra: v.valor_compra,

      custo_reforma: custoReforma,

      valor_venda: venda?.valor_venda,

      tipo_propriedade: v.tipo_propriedade,

      socio_parceiro: v.socio_parceiro,

      fracao_maicon: fracao,

      minha_parte: 0,

      extrapessoal_compra: funding?.do_bolso ?? extrapPorVeic.get(v.id) ?? 0,

      do_revenda: veiculoTemFundingManual(v)
        ? revendaMeuNaCompra(v)
        : (funding?.do_revenda ?? 0),

      do_investimento: investimentoFunding(
        funding ?? {
          veiculo_id: v.id,
          do_revenda: 0,
          do_capital_inicial: 0,
          do_reinvestimento: 0,
          do_bolso: 0,
        },
      ),

      do_investimento_socio: veiculoTemFundingManual(v)
        ? investimentoSocioNaCompra(v)
        : 0,

      do_revenda_socio: veiculoTemFundingManual(v)
        ? revendaSocioNaCompra(v)
        : 0,

      do_pessoal_socio: veiculoTemFundingManual(v)
        ? pessoalSocioNaCompra(v)
        : 0,

      do_capital_inicial: funding?.do_capital_inicial ?? 0,

      do_reinvestimento: funding?.do_reinvestimento ?? 0,

    }

    carro.minha_parte = minhaParteInvestida(carro)

    return carro

  })

}



export function lancamentosFromSistema(

  despesas: Despesa[],

  veiculos: Veiculo[],

  dono: string,

  capitalInicial: number,

  vendas: Venda[] = [],

): LancamentoBancoPessoal[] {

  const nomesVeic = new Map(veiculos.map((v) => [v.id, nomeVeiculo(v)]))

  const lista: LancamentoBancoPessoal[] = []



  for (const d of despesas) {

    if (!ehPagoPorDono(d.pago_por, dono)) continue

    lista.push({

      id: d.id,

      origem: 'despesa',

      despesa_id: d.id,

      carro_id: d.veiculo_id,

      carro_nome: d.veiculo_id

        ? (nomesVeic.get(d.veiculo_id) ?? '—')

        : 'Despesa geral',

      descricao: d.descricao,

      valor: d.valor,

      data: d.data,

      status: d.reembolsado ? 'devolvido' : 'a_devolver',

      tipo: d.tipo,

    })

  }



  for (const e of simularPoolPessoal(veiculos, vendas, capitalInicial).extrapessoal) {
    lista.push({
      id: `compra-extra-${e.veiculo_id}`,
      origem: 'compra_extra',
      veiculo_id: e.veiculo_id,
      carro_id: e.veiculo_id,
      carro_nome: e.nome,
      descricao: `Compra acima do caixa (${e.placa})`,
      valor: e.valor,
      data: e.data,
      status: e.reembolsado ? 'devolvido' : 'a_devolver',
    })
  }

  return lista
}

export interface RecuperacaoVendaCarro {
  veiculo_id: string
  venda_id?: string
  nome: string
  placa: string
  data_venda: string
  valor_venda: number
  minha_parte: number
  extrapessoal: number
  despesas_pessoais: number
  valor_pessoal_pendente: number
  despesa_ids: string[]
  confirmado: boolean
}

/** Despesas pessoais pendentes de um veículo. */
export function despesasPessoaisPendentesVeiculo(
  veiculoId: string,
  despesas: Despesa[],
  dono: string,
): { ids: string[]; total: number } {
  const ids: string[] = []
  let total = 0
  for (const d of despesas) {
    if (d.veiculo_id !== veiculoId) continue
    if (!ehPagoPorDono(d.pago_por, dono)) continue
    if (d.reembolsado) continue
    ids.push(d.id)
    total += Number(d.valor) || 0
  }
  return { ids, total }
}

/** Carros vendidos aguardando ou com confirmação de devolução do pessoal. */
export function recuperacoesVendaCarros(
  carros: CarroBancoPessoal[],
  veiculos: Veiculo[],
  despesas: Despesa[],
  vendas: Venda[],
  dono: string,
): RecuperacaoVendaCarro[] {
  const vendasMap = mapaVendasPorVeiculo(vendas)
  const lista: RecuperacaoVendaCarro[] = []

  for (const carro of carros) {
    if (carro.status !== 'vendido') continue
    const v = veiculos.find((x) => x.id === carro.veiculo_id)
    if (!v) continue
    const venda = vendasMap.get(carro.veiculo_id)
    const { ids, total: despesasPessoais } = despesasPessoaisPendentesVeiculo(
      carro.veiculo_id,
      despesas,
      dono,
    )
    const extrapessoal =
      carro.extrapessoal_compra > 0 && !v.compra_pessoal_reembolsada
        ? carro.extrapessoal_compra
        : 0
    lista.push({
      veiculo_id: carro.veiculo_id,
      venda_id: venda?.id,
      nome: carro.nome,
      placa: carro.placa,
      data_venda: venda?.data ?? '',
      valor_venda: venda?.valor_venda ?? carro.valor_venda ?? 0,
      minha_parte: carro.minha_parte,
      extrapessoal,
      despesas_pessoais: despesasPessoais,
      valor_pessoal_pendente: extrapessoal + despesasPessoais,
      despesa_ids: ids,
      confirmado: Boolean(v.investimento_pessoal_devolvido),
    })
  }

  return lista.sort((a, b) => b.data_venda.localeCompare(a.data_venda))
}

/** Patches para marcar pessoal recuperado na venda de um veículo. */
export function patchesDevolucaoPessoalVeiculo(
  veiculoId: string,
  veiculos: Veiculo[],
  despesas: Despesa[],
  carros: CarroBancoPessoal[],
  dono: string,
): {
  veiculo: Partial<Veiculo>
  despesas: { id: string; patch: Partial<Despesa> }[]
} {
  const v = veiculos.find((x) => x.id === veiculoId)
  const carro = carros.find((x) => x.veiculo_id === veiculoId)
  const { ids } = despesasPessoaisPendentesVeiculo(veiculoId, despesas, dono)
  const veiculo: Partial<Veiculo> = {
    investimento_pessoal_devolvido: true,
  }
  if (carro && carro.extrapessoal_compra > 0) {
    veiculo.compra_pessoal_reembolsada = true
  }
  if (v?.compra_pessoal_reembolsada) {
    veiculo.compra_pessoal_reembolsada = true
  }
  return {
    veiculo,
    despesas: ids.map((id) => ({ id, patch: { reembolsado: true } })),
  }
}

export function movimentacoesPoolFromSistema(

  veiculos: Veiculo[],

  vendas: Venda[],

  capitalInicial: number,

): MovimentacaoPool[] {

  return simularPoolPessoal(veiculos, vendas, capitalInicial).movimentacoes

}


