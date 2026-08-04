// Regras do módulo Banco Pessoal — visão pessoal do dono (Maicon).
//
// Dois caixas operacionais + controle de bolso:
//   1. Caixa investimento (só Maicon) — capital inicial + reinvestimento das vendas
//   2. Caixa revenda (Maicon + sócio) — compras a meia e despesas da loja
//   3. A devolver — bolso usado na compra; ao marcar devolvido, SAI do caixa investimento
//
// Caixa investimento (só Maicon):
//   • Capital inicial + vendas de carros 100% seus (ex.: Golf)
//   • NÃO recebe venda a meia — esse giro fica no caixa revenda
//
// Caixa revenda (Maicon + sócio):
//   • Venda a meia → entra inteira → recompra o próximo carro a meia
//   • Ciclo: vendeu Palio → comprou Gol (reenvestimento da revenda)



import type {

  CarroBancoPessoal,

  Despesa,

  LancamentoBancoPessoal,

  MovimentacaoPool,

  MovimentacaoCaixaRevenda,

  StatusCarroPessoal,

  StatusVeiculo,

  TipoPropriedade,

  Veiculo,

  Venda,

} from '@/types'

import {
  classificarOrigemLucroVeiculo,
  despesasDoVeiculo,
} from '@/utils/calculos'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import { despesasCaixaRevenda, resolverOrigemDespesa } from '@/utils/despesaOrigem'
import {
  normalizarListaSocios,
  primeiroNomeSocio,
  socioPrincipal,
} from '@/utils/socios'

/** Devolução ao bolso pessoal — debita o caixa investimento. */
export interface DevolucaoPool {
  id: string
  valor: number
  detalhe: string
  data?: string
}

/** Parâmetros extras para debitar despesas do caixa da loja na simulação. */
export interface OpcoesSimulacaoCaixa {
  despesas?: Despesa[]
  nomeRevenda?: string
  socios?: string[]
  /** Valores já devolvidos ao bolso — reduzem o caixa investimento disponível. */
  devolucoes?: DevolucaoPool[]
}

function opcoesCaixaResolvidas(opcoes?: OpcoesSimulacaoCaixa) {
  return {
    despesas: opcoes?.despesas ?? [],
    nomeRevenda: opcoes?.nomeRevenda?.trim() || NOME_REVENDA_PADRAO,
    socios: opcoes?.socios ?? [],
    devolucoes: opcoes?.devolucoes ?? [],
  }
}

/**
 * Data em que a devolução debita o caixa investimento.
 * Se o lançamento é de um carro já vendido, usa a data da venda (ou a mais
 * tarde entre compra e venda) — assim "devolver após vender o Golf" cai
 * depois que os R$ 50 mil entraram, e não na data antiga da compra.
 */
export function dataEfetivaDevolucao(
  lancamento: Pick<LancamentoBancoPessoal, 'data' | 'veiculo_id' | 'carro_id'>,
  vendas: Venda[] = [],
): string {
  const base = lancamento.data || ''
  const veiculoId = lancamento.veiculo_id || lancamento.carro_id
  if (!veiculoId) return base
  const venda = vendas.find((v) => v.veiculo_id === veiculoId)
  const dataVenda = venda?.data || ''
  if (!dataVenda) return base
  if (!base) return dataVenda
  return dataVenda.localeCompare(base) > 0 ? dataVenda : base
}

export function devolucoesPoolFromLancamentos(
  lancamentos: LancamentoBancoPessoal[],
  vendas: Venda[] = [],
): DevolucaoPool[] {
  return lancamentos
    .filter((l) => l.status === 'devolvido')
    .map((l) => ({
      id: `devolucao-${l.id}`,
      valor: Number(l.valor) || 0,
      detalhe: `Devolução ao bolso — ${l.descricao}`,
      data: dataEfetivaDevolucao(l, vendas) || undefined,
    }))
    .filter((d) => d.valor > 0)
    .sort((a, b) => (a.data ?? '9999-12-31').localeCompare(b.data ?? '9999-12-31'))
}



/** Arredonda para centavos (evita 34.399,87 por float). */
export function dinheiro(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}



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

/** Revenda total na compra e split dono / sócio. */
export function splitRevendaCarro(
  carro: CarroBancoPessoal,
  veiculo?: Veiculo,
): { total: number; meu: number; socio: number } {
  if (veiculo?.compra_funding_manual) {
    const total = Math.max(0, Number(veiculo.compra_funding_revenda) || 0)
    return {
      total,
      meu: revendaMeuNaCompra(veiculo),
      socio: revendaSocioNaCompra(veiculo),
    }
  }
  const totalRevenda = Math.max(0, Number(carro.do_revenda) || 0)
  const socioManual = Math.max(0, Number(carro.do_revenda_socio) || 0)
  if (socioManual > 0) {
    return {
      total: totalRevenda + socioManual,
      meu: totalRevenda,
      socio: socioManual,
    }
  }
  if (carro.tipo_propriedade === 'meia' && totalRevenda > 0) {
    const meu = totalRevenda * carro.fracao_maicon
    return { total: totalRevenda, meu, socio: totalRevenda - meu }
  }
  return { total: totalRevenda, meu: totalRevenda, socio: 0 }
}

export interface CarroCaixaRevenda {
  veiculo_id: string
  nome: string
  placa: string
  status: StatusCarroPessoal
  revendaTotal: number
  revendaMeu: number
  revendaSocio: number
  lucroMeu: number | null
  lucroSocio: number | null
  valorVenda: number | null
}

export interface ResumoCaixaRevendaCard {
  saldoTotal: number
  parteDono: number
  parteSocio: number
  nomeDono: string
  nomeSocio: string
  lucroVendidosMeu: number
  lucroVendidosSocio: number
  carros: CarroCaixaRevenda[]
  /** Lista completa (modal). */
  todosCarros: CarroCaixaRevenda[]
  modoCompacto: boolean
  qtdCarros: number
}

/** Acima deste limite o card mostra só sócio 1 / sócio 2 (sem listar carros). */
export const LIMITE_CARROS_MINI_RELATORIO = 4

export function resumoCaixaRevendaCard(
  carros: CarroBancoPessoal[],
  veiculos: Veiculo[],
  saldoRevenda: number,
  socios: string[],
): ResumoCaixaRevendaCard {
  const [nomeDonoCompleto, nomeSocioCompleto] = normalizarListaSocios(socios)
  const veicMap = new Map(veiculos.map((v) => [v.id, v]))
  const lista: CarroCaixaRevenda[] = []
  let lucroVendidosMeu = 0
  let lucroVendidosSocio = 0

  for (const carro of carros) {
    const veiculo = veicMap.get(carro.veiculo_id)
    const poolNaCompra =
      (Number(carro.do_investimento) || 0) +
      (Number(carro.extrapessoal_compra) || 0)
    const origem =
      veiculo?.tipo_propriedade === 'meia'
        ? 'compartilhada'
        : poolNaCompra > 0
          ? 'pessoal'
          : classificarOrigemLucroVeiculo(veiculo)
    const split = splitRevendaCarro(carro, veiculo)
    const vinculadoRevenda =
      split.total > 0 || origem === 'compartilhada'
    if (!vinculadoRevenda) continue

    const lucroTotal = lucroCarro(carro)
    const lucroMeu =
      lucroTotal != null ? lucroTotal * carro.fracao_maicon : null
    const lucroSocio =
      lucroTotal != null ? lucroTotal * (1 - carro.fracao_maicon) : null

    if (lucroMeu != null) lucroVendidosMeu += lucroMeu
    if (lucroSocio != null) lucroVendidosSocio += lucroSocio

    lista.push({
      veiculo_id: carro.veiculo_id,
      nome: carro.nome,
      placa: carro.placa,
      status: carro.status,
      revendaTotal: split.total,
      revendaMeu: split.meu,
      revendaSocio: split.socio,
      lucroMeu,
      lucroSocio,
      valorVenda: carro.valor_venda ?? null,
    })
  }

  lista.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'vendido' ? 1 : -1
    }
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  const qtdCarros = lista.length
  const modoCompacto = qtdCarros > LIMITE_CARROS_MINI_RELATORIO

  return {
    saldoTotal: saldoRevenda,
    parteDono: saldoRevenda / 2,
    parteSocio: saldoRevenda / 2,
    nomeDono: primeiroNomeSocio(nomeDonoCompleto) || nomeDonoCompleto,
    nomeSocio: primeiroNomeSocio(nomeSocioCompleto) || nomeSocioCompleto,
    lucroVendidosMeu,
    lucroVendidosSocio,
    carros: modoCompacto ? [] : lista,
    todosCarros: lista,
    modoCompacto,
    qtdCarros,
  }
}

/** Onde está o dinheiro da revenda hoje (caixa líquido + aplicado em carros). */
export interface VisaoPatrimonioRevenda {
  emCaixa: number
  emCarros: number
  /** Despesas (caixa revenda) dos carros ainda em estoque. */
  totalDespesas: number
  totalNoGiro: number
  carrosEstoque: CarroCaixaRevenda[]
}

/** Soma despesas pagas pelo caixa revenda, só de carros em estoque no giro. */
export function despesasRevendaEmCarrosEstoque(
  carros: CarroCaixaRevenda[],
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
): number {
  const idsEstoque = new Set(
    carros.filter((c) => c.status !== 'vendido').map((c) => c.veiculo_id),
  )
  if (idsEstoque.size === 0) return 0

  return despesas.reduce((s, d) => {
    if (!d.veiculo_id || !idsEstoque.has(d.veiculo_id)) return s
    if (resolverOrigemDespesa(d.pago_por, nomeRevenda, socios) !== 'revenda') {
      return s
    }
    return s + Math.max(0, Number(d.valor) || 0)
  }, 0)
}

/** Soma despesas do caixa revenda de um carro em estoque. */
export function despesasRevendaDoCarro(
  veiculoId: string,
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
): number {
  return despesas.reduce((s, d) => {
    if (d.veiculo_id !== veiculoId) return s
    if (resolverOrigemDespesa(d.pago_por, nomeRevenda, socios) !== 'revenda') {
      return s
    }
    return s + Math.max(0, Number(d.valor) || 0)
  }, 0)
}

export type TipoEtapaGiro = 'venda' | 'compra' | 'despesas' | 'caixa_atual'

export interface EtapaGiroRevenda {
  id: string
  tipo: TipoEtapaGiro
  nome: string
  valor: number
  veiculo_id?: string
  /** Compra ainda em estoque — valor virou carro. */
  virouCarro?: boolean
}

/** Um ciclo visual: vendeu → comprou → sobrou. */
export interface FluxoGiroRevenda {
  id: string
  data: string
  etapas: EtapaGiroRevenda[]
}

export function montarVisaoPatrimonioRevenda(
  saldoCaixa: number,
  carros: CarroCaixaRevenda[],
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
): VisaoPatrimonioRevenda {
  const carrosEstoque = carros.filter(
    (c) => c.status !== 'vendido' && c.revendaTotal > 0,
  )
  const emCarros = carrosEstoque.reduce((s, c) => s + c.revendaTotal, 0)
  const totalDespesas = despesasRevendaEmCarrosEstoque(
    carros,
    despesas,
    nomeRevenda,
    socios,
  )
  return {
    emCaixa: saldoCaixa,
    emCarros,
    totalDespesas,
    totalNoGiro: saldoCaixa + emCarros + totalDespesas,
    carrosEstoque,
  }
}

/** Monta fluxos visuais — estado atual bate com o painel de cima. */
export function montarFluxosGiroRevenda(
  movimentacoes: MovimentacaoCaixaRevenda[],
  carros: CarroCaixaRevenda[],
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
  saldoCaixaAtual: number,
): FluxoGiroRevenda[] {
  const estoquePorId = new Map(
    carros
      .filter((c) => c.status !== 'vendido')
      .map((c) => [c.veiculo_id, c]),
  )

  const fluxos: FluxoGiroRevenda[] = []
  let pendente: FluxoGiroRevenda | null = null

  for (const m of movimentacoes) {
    if (m.tipo === 'venda') {
      if (pendente?.etapas.length) fluxos.push(pendente)
      pendente = {
        id: m.id,
        data: m.data,
        etapas: [
          {
            id: `${m.id}-venda`,
            tipo: 'venda',
            nome: m.carro_nome ?? 'Carro',
            valor: m.valor,
            veiculo_id: m.veiculo_id,
          },
        ],
      }
      continue
    }

    if (m.tipo === 'compra') {
      const valor = Math.abs(m.valor)
      const nome = m.carro_nome ?? 'Carro'
      const emEstoque = Boolean(
        m.veiculo_id && estoquePorId.has(m.veiculo_id),
      )

      const fluxo: FluxoGiroRevenda = pendente ?? {
        id: m.id,
        data: m.data,
        etapas: [],
      }

      fluxo.etapas.push({
        id: `${m.id}-compra`,
        tipo: 'compra',
        nome,
        valor,
        veiculo_id: m.veiculo_id,
        virouCarro: emEstoque,
      })

      fluxos.push(fluxo)
      pendente = null
      continue
    }

    // Despesas entram no fluxo do carro em estoque + painel geral.
  }

  if (pendente?.etapas.length) {
    fluxos.push(pendente)
  }

  const ultimo = fluxos.at(-1)
  if (ultimo) {
    const compra = [...ultimo.etapas].reverse().find((e) => e.tipo === 'compra')
    if (compra?.veiculo_id && compra.virouCarro) {
      const desp = despesasRevendaDoCarro(
        compra.veiculo_id,
        despesas,
        nomeRevenda,
        socios,
      )
      if (desp > 0) {
        ultimo.etapas.push({
          id: `${ultimo.id}-despesas`,
          tipo: 'despesas',
          nome: compra.nome,
          valor: desp,
          veiculo_id: compra.veiculo_id,
        })
      }
    }
    ultimo.etapas.push({
      id: `${ultimo.id}-caixa-atual`,
      tipo: 'caixa_atual',
      nome: 'Em caixa hoje',
      valor: saldoCaixaAtual,
    })
  }

  return fluxos
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

/**
 * A meia: valor informado em "investimento" SEM marcar 50/50 sócio
 * = aporte seu (capital/reinvestimento) que entra no caixa revenda antes da compra.
 */
export function aporteInvestimentoParaRevenda(v: Veiculo): number {
  if (v.tipo_propriedade !== 'meia' || !veiculoTemFundingManual(v)) return 0
  const inv = Math.max(0, Number(v.compra_funding_investimento) || 0)
  if (inv <= 0) return 0
  if (v.compra_funding_investimento_meia_socio) return 0
  return inv
}

/** Investimento que debita o pool sem virar aporte na revenda (ex.: metade com sócio no campo). */
export function investimentoPoolDiretoNaCompra(v: Veiculo): number {
  if (aporteInvestimentoParaRevenda(v) > 0) return 0
  return investimentoPoolNaCompra(v)
}

/**
 * Metade do sócio como aporte novo na loja (não consome o caixa que já tinha).
 *
 * Dois cadastros válidos:
 * 1) Limpo: investimento = metade (seu aporte), revenda = 0 → sócio completa a outra metade
 * 2) Legado: revenda = 100% da compra (meia) + investimento = seu aporte
 */
export function aporteSocioExternoRevenda(
  v: Veiculo,
  valorCompra: number,
): number {
  if (v.tipo_propriedade !== 'meia' || !veiculoTemFundingManual(v)) return 0
  const aporte = aporteInvestimentoParaRevenda(v)
  if (aporte <= 0) return 0
  const revTotal = Math.max(0, Number(v.compra_funding_revenda) || 0)
  const metade = dinheiro(valorCompra / 2)

  if (revTotal + 0.01 >= valorCompra && v.compra_funding_revenda_meia_socio) {
    return revendaSocioNaCompra(v)
  }

  if (revTotal <= 0 && Math.abs(aporte - metade) < 0.5) {
    return metade
  }

  return 0
}

/** Valores sugeridos para o formulário — respeita saldos e tipo do carro. */
export interface SugestaoFundingCompra {
  revenda: number
  investimento: number
  pessoal: number
  revendaMeiaSocio: boolean
  investimentoMeiaSocio: boolean
  pessoalMeiaSocio: boolean
}

/** Soma despesas do dono ainda não reembolsadas (reservam o caixa investimento). */
export function totalDespesasPessoaisPendentes(
  despesas: Despesa[],
  socios: string[] = [],
): number {
  const dono = nomeDonoCompleto(socios)
  let total = 0
  for (const d of despesas) {
    if (d.reembolsado) continue
    if (!ehPagoPorDono(d.pago_por, dono)) continue
    total += Number(d.valor) || 0
  }
  return dinheiro(total)
}

/** Saldos livres antes de registrar a compra de um veículo (integração Banco Pessoal). */
export function saldosCaixasDisponiveis(
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
  excluirVeiculoId?: string,
): { caixaRevenda: number; caixaInvestimento: number } {
  const lista = excluirVeiculoId
    ? veiculos.filter((v) => v.id !== excluirVeiculoId)
    : veiculos
  const sim = simularPoolPessoal(lista, vendas, capitalInicial, opcoesCaixa)
  const extrato = dinheiro(sim.saldoFinal)
  const reservado = dinheiro(
    Math.min(
      extrato,
      totalDespesasPessoaisPendentes(
        opcoesCaixa?.despesas ?? [],
        opcoesCaixa?.socios ?? [],
      ),
    ),
  )
  return {
    caixaRevenda: sim.saldoRevendaFinal,
    caixaInvestimento: dinheiro(extrato - reservado),
  }
}

export function sugerirFundingCompraFormulario(
  veiculo: Veiculo,
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  opcoesCaixa?: OpcoesSimulacaoCaixa,
): SugestaoFundingCompra {
  const valorCompra = Number(veiculo.valor_compra) || 0
  const isMeia = veiculo.tipo_propriedade === 'meia'
  const vazio: SugestaoFundingCompra = {
    revenda: 0,
    investimento: 0,
    pessoal: 0,
    revendaMeiaSocio: false,
    investimentoMeiaSocio: false,
    pessoalMeiaSocio: false,
  }
  if (valorCompra <= 0) return vazio

  const { caixaRevenda, caixaInvestimento } = saldosCaixasDisponiveis(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
    veiculo.id,
  )

  let restante = valorCompra
  let revenda = 0
  let investimento = 0

  if (isMeia) {
    // A meia: revenda paga o carro inteiro (caixa compartilhado); pool só cobre sua metade menos o que a revenda já cobriu da sua parte
    if (caixaRevenda > 0) {
      revenda = Math.min(valorCompra, caixaRevenda)
    }
    const minhaParte = valorCompra / 2
    const doRevendaMaicon = revenda / 2
    const needPool = Math.max(0, minhaParte - doRevendaMaicon)
    if (needPool > 0 && caixaInvestimento > 0) {
      investimento = Math.min(needPool, caixaInvestimento)
    }
    restante = Math.max(0, needPool - investimento)
  } else {
    // Solo: investimento primeiro, revenda se sobrar necessidade, depois bolso
    if (caixaInvestimento > 0) {
      investimento = Math.min(restante, caixaInvestimento)
      restante -= investimento
    }
    if (restante > 0 && caixaRevenda > 0) {
      revenda = Math.min(restante, caixaRevenda)
      restante -= revenda
    }
  }

  const pessoal = Math.max(0, restante)

  return {
    revenda,
    investimento,
    pessoal,
    revendaMeiaSocio: isMeia && revenda > 0,
    investimentoMeiaSocio: isMeia && investimento > 0,
    pessoalMeiaSocio: isMeia && pessoal > 0,
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
  const pedido = dinheiro(valor)
  let cap = dinheiro(saldoCapitalInicial)
  let rein = dinheiro(saldoReinvestimento)
  const doCapital = Math.min(pedido, cap)
  const restante = dinheiro(pedido - doCapital)
  const doReinvest = Math.min(restante, rein)
  cap = dinheiro(cap - doCapital)
  rein = dinheiro(rein - doReinvest)
  return {
    doCapital: dinheiro(doCapital),
    doReinvest: dinheiro(doReinvest),
    saldoCapitalInicial: cap,
    saldoReinvestimento: rein,
  }
}

/** Funding automático (sem campos manuais) — mesma ordem que sugerirFundingCompraFormulario. */
function fundingAutomaticoCompra(
  valorCompra: number,
  tipoPropriedade: Veiculo['tipo_propriedade'],
  saldoRevenda: number,
  saldoCapitalInicial: number,
  saldoReinvestimento: number,
): {
  doRevendaTotal: number
  doCapital: number
  doReinvest: number
  doBolso: number
  doInvestimento: number
  saldoRevenda: number
  saldoCapitalInicial: number
  saldoReinvestimento: number
} {
  const fracao = fracaoMaicon(tipoPropriedade)
  const isMeia = tipoPropriedade === 'meia'
  let doRevendaTotal = 0
  let doCapital = 0
  let doReinvest = 0
  let doBolso = 0
  let rev = saldoRevenda
  let cap = saldoCapitalInicial
  let rein = saldoReinvestimento

  if (isMeia) {
    doRevendaTotal = Math.min(valorCompra, rev)
    rev -= doRevendaTotal
    const minhaParteCompra = fracao * valorCompra
    const doRevendaMaicon = valorCompra > 0 ? doRevendaTotal * fracao : 0
    const debitoPool = Math.max(0, minhaParteCompra - doRevendaMaicon)
    doCapital = Math.min(debitoPool, cap)
    const restante = debitoPool - doCapital
    doReinvest = Math.min(restante, rein)
    doBolso = restante - doReinvest
    cap -= doCapital
    rein -= doReinvest
  } else {
    let restante = valorCompra
    doCapital = Math.min(restante, cap)
    restante -= doCapital
    cap -= doCapital
    doReinvest = Math.min(restante, rein)
    restante -= doReinvest
    rein -= doReinvest
    doRevendaTotal = Math.min(restante, rev)
    restante -= doRevendaTotal
    rev -= doRevendaTotal
    doBolso = restante
  }

  return {
    doRevendaTotal,
    doCapital,
    doReinvest,
    doBolso,
    doInvestimento: doCapital + doReinvest,
    saldoRevenda: rev,
    saldoCapitalInicial: cap,
    saldoReinvestimento: rein,
  }
}

/** Devolução ao bolso — consome reinvestimento primeiro, depois capital inicial. */
function debitarCaixaInvestimento(
  valor: number,
  saldoCapitalInicial: number,
  saldoReinvestimento: number,
): {
  saldoCapitalInicial: number
  saldoReinvestimento: number
  debitado: number
} {
  const pedido = dinheiro(valor)
  const rein = dinheiro(saldoReinvestimento)
  const cap = dinheiro(saldoCapitalInicial)
  const doReinvest = Math.min(Math.max(pedido, 0), rein)
  const restante = dinheiro(Math.max(pedido, 0) - doReinvest)
  const doCapital = Math.min(restante, cap)
  return {
    saldoReinvestimento: dinheiro(rein - doReinvest),
    saldoCapitalInicial: dinheiro(cap - doCapital),
    debitado: dinheiro(doReinvest + doCapital),
  }
}

/** Onde entra o valor de uma venda — caixas separados, sem misturar. */
export function distribuirVendaPool(
  veiculo: Veiculo,
  valorVenda: number,
  funding?: FundingCompra,
): { creditoPool: number; creditoRevenda: number; detalhe: string } {
  const origem = classificarOrigemLucroVeiculo(veiculo, funding)
  const nome = nomeVeiculo(veiculo)

  if (origem === 'compartilhada') {
    return {
      creditoPool: 0,
      creditoRevenda: valorVenda,
      detalhe: `Venda ${nome} — ${formatarMoedaCurta(valorVenda)} no caixa revenda (giro a meia: vendeu → recompra)`,
    }
  }

  if (origem === 'pessoal') {
    return {
      creditoPool: valorVenda,
      creditoRevenda: 0,
      detalhe: `Venda ${nome} — ${formatarMoedaCurta(valorVenda)} no caixa investimento (100% seu)`,
    }
  }

  return {
    creditoPool: 0,
    creditoRevenda: valorVenda,
    detalhe: `Venda ${nome} — ${formatarMoedaCurta(valorVenda)} no caixa revenda`,
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

  /** Caixa investimento antes de devolver ao bolso. */
  saldoInvestimentoBruto: number

  totalDevolvidoAoBolso: number

  /** Extrato do caixa revenda (vendas a meia → recompras). */
  movimentacoesRevenda: MovimentacaoCaixaRevenda[]

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

  | {

      tipo: 'devolucao'

      data: string

      devolucao: DevolucaoPool

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

  devolucoes: DevolucaoPool[] = [],

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

  for (const dev of devolucoes) {
    eventos.push({
      tipo: 'devolucao',
      data: dev.data ?? '',
      devolucao: dev,
      ordem: ordem++,
    })
  }



  // Mesmo dia: venda → devolução ao bolso → compra → despesa da loja.

  eventos.sort((a, b) => {

    const cmp = a.data.localeCompare(b.data)

    if (cmp !== 0) return cmp

    const prio = (e: EventoPool) => {

      if (e.tipo === 'venda') return 0

      if (e.tipo === 'devolucao') return 1

      if (e.tipo === 'compra') return 2

      return 3

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

  const movimentacoesRevenda: MovimentacaoCaixaRevenda[] = []

  const saldoTotal = () => saldoCapitalInicial + saldoReinvestimento

  const registrarRevenda = (
    mov: Omit<MovimentacaoCaixaRevenda, 'saldo_apos'>,
  ) => {
    movimentacoesRevenda.push({ ...mov, saldo_apos: saldoRevenda })
  }



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



  let totalDevolvidoAoBolso = 0

  /** Devoluções que não cabiam no caixa na data — debitam no próximo crédito. */
  const devolucoesEmFila: Array<{
    id: string
    detalhe: string
    restante: number
  }> = []

  const tentarDevolucao = (
    id: string,
    data: string,
    valor: number,
    detalhe: string,
  ) => {
    const pedido = Math.max(0, valor)
    if (pedido <= 0) return
    const debito = debitarCaixaInvestimento(
      pedido,
      saldoCapitalInicial,
      saldoReinvestimento,
    )
    saldoCapitalInicial = debito.saldoCapitalInicial
    saldoReinvestimento = debito.saldoReinvestimento
    totalDevolvidoAoBolso += debito.debitado
    if (debito.debitado > 0) {
      movimentacoes.push({
        id,
        data,
        tipo: 'devolucao',
        valor: -debito.debitado,
        saldo_apos: saldoTotal(),
        detalhe:
          debito.debitado < pedido
            ? `${detalhe} (parcial — resto quando houver saldo)`
            : detalhe,
      })
    }
    const falta = pedido - debito.debitado
    if (falta > 0.009) {
      devolucoesEmFila.push({ id: `${id}-resto`, detalhe, restante: falta })
    }
  }

  const drenarFilaDevolucoes = (data: string) => {
    if (saldoTotal() <= 0 || devolucoesEmFila.length === 0) return
    const fila = [...devolucoesEmFila]
    devolucoesEmFila.length = 0
    for (const item of fila) {
      tentarDevolucao(item.id, data, item.restante, item.detalhe)
    }
  }

  for (const ev of montarEventosPool(
    veiculos,
    vendas,
    despesasRevenda,
    caixaCfg.devolucoes,
  )) {

    if (ev.tipo === 'devolucao') {
      tentarDevolucao(
        ev.devolucao.id,
        ev.data,
        Number(ev.devolucao.valor) || 0,
        ev.devolucao.detalhe,
      )
      continue
    }

    if (ev.tipo === 'despesa_revenda') {

      const valor = Number(ev.despesa.valor) || 0

      if (valor > 0) {
        saldoRevenda -= valor
        registrarRevenda({
          id: `despesa-rev-${ev.despesa.id}`,
          data: ev.data,
          tipo: 'despesa',
          valor: -valor,
          detalhe: ev.despesa.descricao || 'Despesa paga pelo caixa da loja',
        })
      }

      continue

    }

    if (ev.tipo === 'venda') {

      const valorVenda = Number(ev.venda.valor_venda) || 0

      if (valorVenda <= 0) continue

      const { creditoPool, creditoRevenda, detalhe } = distribuirVendaPool(
        ev.veiculo,
        valorVenda,
        fundingPorVeiculo.get(ev.veiculo.id),
      )

      if (creditoRevenda > 0) {
        saldoRevenda += creditoRevenda
        registrarRevenda({
          id: `venda-rev-${ev.venda.id}`,
          data: ev.data,
          tipo: 'venda',
          veiculo_id: ev.veiculo.id,
          carro_nome: nomeVeiculo(ev.veiculo),
          valor: creditoRevenda,
          detalhe,
        })
      }

      if (creditoPool > 0) {
        saldoReinvestimento += creditoPool
        totalReinvestido += creditoPool

        movimentacoes.push({

          id: `venda-${ev.venda.id}`,

          data: ev.data,

          tipo: 'venda',

          veiculo_id: ev.veiculo.id,

          carro_nome: nomeVeiculo(ev.veiculo),

          valor: creditoPool,

          saldo_apos: saldoTotal(),

          detalhe,

        })

        // Devoluções que faltaram quando o caixa estava zerado
        drenarFilaDevolucoes(ev.data)
      }

      continue

    }



    const v = ev.veiculo

    const valorCompra = Number(v.valor_compra) || 0

    if (valorCompra <= 0) continue



    let doRevendaTotal: number

    let doInvestimento: number

    let doBolso: number

    let doCapital: number

    let doReinvest: number

    let aporteNaCompra = 0



    if (veiculoTemFundingManual(v)) {

      doRevendaTotal = Math.max(0, Number(v.compra_funding_revenda) || 0)

      doBolso = pessoalMeuNaCompra(v)

      const aporteRevenda = aporteInvestimentoParaRevenda(v)
      aporteNaCompra = aporteRevenda
      const investimentoPool =
        aporteRevenda > 0
          ? aporteRevenda
          : investimentoPoolDiretoNaCompra(v)

      if (aporteRevenda > 0) {
        const poolAporte = aplicarInvestimentoPool(
          aporteRevenda,
          saldoCapitalInicial,
          saldoReinvestimento,
        )
        doCapital = poolAporte.doCapital
        doReinvest = poolAporte.doReinvest
        saldoCapitalInicial = poolAporte.saldoCapitalInicial
        saldoReinvestimento = poolAporte.saldoReinvestimento
        const faltaAporte = dinheiro(
          Math.max(0, aporteRevenda - doCapital - doReinvest),
        )
        if (faltaAporte >= 0.5) {
          doBolso = dinheiro(doBolso + faltaAporte)
        }
        doInvestimento = dinheiro(doCapital + doReinvest)
        saldoRevenda += aporteRevenda
        registrarRevenda({
          id: `aporte-rev-${v.id}`,
          data: v.data_compra,
          tipo: 'aporte',
          veiculo_id: v.id,
          carro_nome: nomeVeiculo(v),
          valor: aporteRevenda,
          detalhe: `Aporte seu — ${formatarMoedaCurta(aporteRevenda)} do caixa investimento → caixa revenda (giro a meia)`,
        })
        movimentacoes.push({
          id: `aporte-rev-pool-${v.id}`,
          data: v.data_compra,
          tipo: 'aporte_revenda',
          veiculo_id: v.id,
          carro_nome: nomeVeiculo(v),
          valor: -doInvestimento,
          saldo_apos: saldoTotal(),
          detalhe: `Aporte na revenda — ${formatarMoedaCurta(doInvestimento)} saiu do seu caixa investimento`,
        })
      } else {
        const pool = aplicarInvestimentoPool(
          investimentoPool,
          saldoCapitalInicial,
          saldoReinvestimento,
        )
        doCapital = pool.doCapital
        doReinvest = pool.doReinvest
        const faltaInvestimento = dinheiro(
          Math.max(0, investimentoPool - doCapital - doReinvest),
        )
        if (faltaInvestimento >= 0.5) {
          doBolso = dinheiro(doBolso + faltaInvestimento)
        }
        doInvestimento = dinheiro(doCapital + doReinvest)
        saldoCapitalInicial = pool.saldoCapitalInicial
        saldoReinvestimento = pool.saldoReinvestimento
      }

      const aporteSocio = aporteSocioExternoRevenda(v, valorCompra)
      if (aporteSocio > 0) {
        saldoRevenda += aporteSocio
        registrarRevenda({
          id: `aporte-socio-rev-${v.id}`,
          data: v.data_compra,
          tipo: 'aporte',
          veiculo_id: v.id,
          carro_nome: nomeVeiculo(v),
          valor: aporteSocio,
          detalhe: `Aporte novo na empresa — ${formatarMoedaCurta(aporteSocio)} (parte do sócio na compra do ${nomeVeiculo(v)})`,
        })
      }

      // Aportes 50/50 cobriram a compra e o campo revenda ficou 0 → compra sai desse caixa novo
      if (
        doRevendaTotal <= 0 &&
        aporteNaCompra > 0 &&
        aporteSocio > 0 &&
        dinheiro(aporteNaCompra + aporteSocio) + 0.01 >= valorCompra
      ) {
        doRevendaTotal = valorCompra
      }

      saldoRevenda -= doRevendaTotal

    } else {

      const auto = fundingAutomaticoCompra(
        valorCompra,
        v.tipo_propriedade,
        saldoRevenda,
        saldoCapitalInicial,
        saldoReinvestimento,
      )
      doRevendaTotal = auto.doRevendaTotal
      doCapital = auto.doCapital
      doReinvest = auto.doReinvest
      doBolso = auto.doBolso
      doInvestimento = auto.doInvestimento
      saldoRevenda = auto.saldoRevenda
      saldoCapitalInicial = auto.saldoCapitalInicial
      saldoReinvestimento = auto.saldoReinvestimento

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

      if (aporteNaCompra > 0) {
        const aporteSocio = aporteSocioExternoRevenda(v, valorCompra)
        const aporteTotal = dinheiro(aporteNaCompra + aporteSocio)
        partes.push(
          `${formatarMoedaCurta(aporteTotal)} aporte novo na empresa (${formatarMoedaCurta(aporteNaCompra)} seu investimento${aporteSocio > 0 ? ` + ${formatarMoedaCurta(aporteSocio)} sócio` : ''})`,
        )
      } else if (socioInv > 0) {

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



    const debitoPoolExtrato =
      aporteNaCompra > 0 ? 0 : doCapital + doReinvest

    if (doRevendaTotal > 0) {
      const aporteNovoCompra =
        aporteNaCompra > 0 &&
        aporteSocioExternoRevenda(v, valorCompra) > 0
      registrarRevenda({
        id: `compra-rev-${v.id}`,
        data: v.data_compra,
        tipo: 'compra',
        veiculo_id: v.id,
        carro_nome: nomeVeiculo(v),
        valor: -doRevendaTotal,
        detalhe: aporteNovoCompra
          ? `Compra ${nomeVeiculo(v)} — ${formatarMoedaCurta(doRevendaTotal)} (aporte novo de ${formatarMoedaCurta(valorCompra)} na empresa; em caixa mantém o saldo anterior)`
          : `Compra ${nomeVeiculo(v)} — ${formatarMoedaCurta(doRevendaTotal)} do caixa revenda (reenvestimento)`,
      })
    }

    if (debitoPoolExtrato > 0) {
      movimentacoes.push({

        id: `compra-${v.id}`,

        data: v.data_compra,

        tipo: 'compra',

        veiculo_id: v.id,

        carro_nome: nomeVeiculo(v),

        valor: -debitoPoolExtrato,

        saldo_apos: saldoTotal(),

        detalhe: `Compra ${nomeVeiculo(v)} — ${partes.filter((p) => !p.includes('revenda')).join(', ') || partes.join(', ') || 'caixa investimento'}`,

      })
    }

    if (doBolso > 0) {
      movimentacoes.push({
        id: `compra-bolso-${v.id}`,
        data: v.data_compra,
        tipo: 'compra',
        veiculo_id: v.id,
        carro_nome: nomeVeiculo(v),
        valor: 0,
        saldo_apos: saldoTotal(),
        detalhe: `${formatarMoedaCurta(doBolso)} do bolso (a devolver — não debita o caixa até marcar devolvido)`,
      })
    }

  }

  // Qualquer resto de devolução que ainda não coube
  drenarFilaDevolucoes('')

  const saldoInvestimentoBruto = saldoTotal() + totalDevolvidoAoBolso

  return {

    extrapessoal,

    fundingPorVeiculo,

    movimentacoes,

    saldoFinal: saldoTotal(),

    saldoCapitalInicial,

    saldoReinvestimento,

    totalReinvestido,

    saldoRevendaFinal: saldoRevenda,

    saldoInvestimentoBruto,

    totalDevolvidoAoBolso,

    movimentacoesRevenda,

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

  /**
   * Disponível para comprar: saldo do extrato menos despesas pessoais ainda
   * pendentes em "A devolver" (ex.: gasolina) — essas reservam o pool até marcar.
   */
  caixaInvestimento: number

  /** Saldo técnico no extrato (antes de reservar pendências). */
  caixaInvestimentoExtrato: number

  /** Parte do extrato comprometida com despesas a devolver. */
  caixaInvestimentoReservado: number

  /** Extrato + já devolvido ao bolso (não é “quanto devolveu”). */
  caixaInvestimentoBruto: number

  /** @deprecated Use caixaInvestimento */
  capitalDisponivel: number

  saldoCapitalInicial: number

  saldoReinvestimento: number

  totalReinvestido: number

  extrapessoalComprasTotal: number

  investidoEmEstoque: number

  investidoTotal: number

  totalADevolver: number

  totalDevolvido: number

  /** Valor efetivamente debitado do caixa investimento (pode ser menor se faltou saldo). */
  totalDevolvidoDebitado: number

  lucroRealizadoMeu: number

  qtdCarros: number
  qtdVendidos: number
  /** @deprecated Use caixaInvestimento */
  caixaPool: number
  /** Caixa revenda compartilhado — 100% loja (seu + sócios). */
  caixaRevenda: number
  /** Sua metade do caixa revenda (50%). */
  minhaParteRevenda: number
  /** Sua parte no valor FIPE dos carros ainda não vendidos. */
  valorFipeEstoqueMeu: number
  /** Caixa investimento + 50% revenda + FIPE estoque (sua parte). */
  patrimonioTotal: number
  /** Patrimônio acima do capital inicial (crescimento dos giros). */
  crescimentoPatrimonio: number
  /** Quanto do capital inicial de R$ 38 mil ainda está líquido no pool. */
  capitalInicialLivre: number
}

export interface CarroPatrimonioFipe {
  veiculo_id: string
  nome: string
  placa: string
  valorFipe: number
  minhaParte: number
  fracao: number
}

/** FIPE dos carros em estoque — só os que ainda não foram vendidos. */
export function patrimonioFipeEstoque(
  veiculos: Veiculo[],
  vendas: Venda[] = [],
): { totalMeu: number; carros: CarroPatrimonioFipe[] } {
  const vendidos = new Set(vendas.map((v) => v.veiculo_id))
  const carros: CarroPatrimonioFipe[] = []
  let totalMeu = 0

  for (const v of veiculos) {
    if (vendidos.has(v.id) || v.status === 'vendido') continue
    const fipe = Number(v.valor_fipe) || 0
    if (fipe <= 0) continue
    const fracao = fracaoMaicon(v.tipo_propriedade)
    const minhaParte = fipe * fracao
    totalMeu += minhaParte
    carros.push({
      veiculo_id: v.id,
      nome: nomeVeiculo(v),
      placa: v.placa,
      valorFipe: fipe,
      minhaParte,
      fracao,
    })
  }

  carros.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return { totalMeu, carros }
}

export interface ResumoPatrimonioCard {
  total: number
  caixaInvestimento: number
  minhaParteRevenda: number
  valorFipeEstoqueMeu: number
  caixaRevendaTotal: number
  saldoCapitalInicial: number
  saldoReinvestimento: number
  capitalInicial: number
  crescimento: number
  nomeDono: string
  carrosFipe: CarroPatrimonioFipe[]
  todosCarrosFipe: CarroPatrimonioFipe[]
  modoCompactoFipe: boolean
  qtdCarrosFipe: number
  /** Itens que compõem o patrimônio. */
  composicao: Array<{
    id: string
    rotulo: string
    valor: number
    detalhe: string
  }>
}

export function resumoPatrimonioCard(
  r: Pick<
    ResumoBancoPessoal,
    | 'patrimonioTotal'
    | 'caixaInvestimento'
    | 'minhaParteRevenda'
    | 'valorFipeEstoqueMeu'
    | 'caixaRevenda'
    | 'saldoCapitalInicial'
    | 'saldoReinvestimento'
    | 'crescimentoPatrimonio'
    | 'capitalInicial'
  >,
  socios: string[],
  veiculos: Veiculo[],
  vendas: Venda[] = [],
): ResumoPatrimonioCard {
  const nomeDono =
    primeiroNomeSocio(normalizarListaSocios(socios)[0]) ||
    normalizarListaSocios(socios)[0]

  const fipe = patrimonioFipeEstoque(veiculos, vendas)
  const valorFipe = r.valorFipeEstoqueMeu

  const composicao: ResumoPatrimonioCard['composicao'] = [
    {
      id: 'investimento',
      rotulo: 'Caixa investimento',
      valor: r.caixaInvestimento,
      detalhe:
        r.saldoCapitalInicial > 0 || r.saldoReinvestimento > 0
          ? `Capital ${formatarMoedaCurta(r.saldoCapitalInicial)} + vendas ${formatarMoedaCurta(r.saldoReinvestimento)}`
          : 'Capital + vendas seus (100%)',
    },
    {
      id: 'revenda-metade',
      rotulo: '50% caixa revenda',
      valor: r.minhaParteRevenda,
      detalhe: `Sua metade de ${formatarMoedaCurta(r.caixaRevenda)} no giro a meia`,
    },
  ]

  if (valorFipe > 0) {
    composicao.push({
      id: 'fipe-estoque',
      rotulo: 'Carros em estoque (FIPE)',
      valor: valorFipe,
      detalhe: `${fipe.carros.length} ${fipe.carros.length === 1 ? 'carro' : 'carros'} não vendidos · sua parte`,
    })
  }

  const qtdCarrosFipe = fipe.carros.length
  const modoCompactoFipe = qtdCarrosFipe > LIMITE_CARROS_MINI_RELATORIO

  return {
    total: r.patrimonioTotal,
    caixaInvestimento: r.caixaInvestimento,
    minhaParteRevenda: r.minhaParteRevenda,
    valorFipeEstoqueMeu: valorFipe,
    caixaRevendaTotal: r.caixaRevenda,
    saldoCapitalInicial: r.saldoCapitalInicial,
    saldoReinvestimento: r.saldoReinvestimento,
    capitalInicial: r.capitalInicial,
    crescimento: r.crescimentoPatrimonio,
    nomeDono,
    carrosFipe: modoCompactoFipe ? [] : fipe.carros,
    todosCarrosFipe: fipe.carros,
    modoCompactoFipe,
    qtdCarrosFipe,
    composicao,
  }
}



export function resumoBancoPessoal(

  carros: CarroBancoPessoal[],

  lancamentos: LancamentoBancoPessoal[],

  capitalInicial: number,

  veiculos: Veiculo[],

  vendas: Venda[],

  opcoesCaixa?: OpcoesSimulacaoCaixa,

  simPreCalculada?: SimulacaoPoolPessoal,

): ResumoBancoPessoal {

  const sim =
    simPreCalculada ??
    simularPoolPessoal(
      veiculos,
      vendas,
      capitalInicial,
      opcoesCaixa,
    )



  const r: ResumoBancoPessoal = {

    capitalInicial,

    minhaParteEstoque: 0,

    caixaInvestimento: sim.saldoFinal,

    caixaInvestimentoExtrato: sim.saldoFinal,

    caixaInvestimentoReservado: 0,

    caixaInvestimentoBruto: sim.saldoInvestimentoBruto,

    capitalDisponivel: sim.saldoFinal,

    saldoCapitalInicial: sim.saldoCapitalInicial,

    saldoReinvestimento: sim.saldoReinvestimento,

    totalReinvestido: sim.totalReinvestido,

    extrapessoalComprasTotal: 0,

    investidoEmEstoque: 0,

    investidoTotal: 0,

    totalADevolver: 0,

    totalDevolvido: 0,

    totalDevolvidoDebitado: sim.totalDevolvidoAoBolso,

    lucroRealizadoMeu: 0,

    qtdCarros: carros.length,
    qtdVendidos: 0,
    caixaPool: 0,
    caixaRevenda: sim.saldoRevendaFinal,
    minhaParteRevenda: 0,
    valorFipeEstoqueMeu: 0,
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



  let despesasPendentes = 0
  for (const l of lancamentos) {
    const valor = Number(l.valor) || 0
    if (l.status === 'a_devolver') {
      r.totalADevolver += valor
      if (l.origem === 'despesa') despesasPendentes += valor
    } else {
      r.totalDevolvido += valor
    }
  }

  const extratoLivre = dinheiro(sim.saldoFinal)
  const reservado = dinheiro(Math.min(extratoLivre, despesasPendentes))
  const disponivel = dinheiro(extratoLivre - reservado)

  r.caixaInvestimentoExtrato = extratoLivre
  r.caixaInvestimentoReservado = reservado
  r.caixaInvestimento = disponivel
  r.caixaPool = disponivel
  r.capitalDisponivel = disponivel
  r.minhaParteRevenda = r.caixaRevenda / 2
  r.valorFipeEstoqueMeu = patrimonioFipeEstoque(veiculos, vendas).totalMeu
  r.patrimonioTotal =
    disponivel + r.minhaParteRevenda + r.valorFipeEstoqueMeu
  r.crescimentoPatrimonio = r.patrimonioTotal - r.capitalInicial
  r.capitalInicialLivre = sim.saldoCapitalInicial

  return r
}

export interface ItemInvestimentoEstoque {
  veiculo_id: string
  nome: string
  placa: string
  do_investimento: number
}

/** Separa disponível vs estoque vs reservas de despesas pendentes. */
export interface VisaoCaixaInvestimentoCard {
  /** Pode usar para comprar (extrato − reservas). */
  disponivel: number
  /** Saldo técnico no extrato. */
  livre: number
  /** Comprometido com despesas a devolver. */
  reservado: number
  itensEstoque: ItemInvestimentoEstoque[]
  totalNoEstoque: number
  devolvidoMarcado: number
  devolvidoDebitadoCaixa: number
  alertasPendentes: string[]
}

export function visaoCaixaInvestimentoCard(
  resumo: ResumoBancoPessoal,
  carros: CarroBancoPessoal[],
  lancamentos: LancamentoBancoPessoal[],
): VisaoCaixaInvestimentoCard {
  const itensEstoque = carros
    .filter(
      (c) =>
        c.status !== 'vendido' && dinheiro(Number(c.do_investimento) || 0) > 0,
    )
    .map((c) => ({
      veiculo_id: c.veiculo_id,
      nome: c.nome,
      placa: c.placa,
      do_investimento: dinheiro(Number(c.do_investimento) || 0),
    }))
    .sort((a, b) => b.do_investimento - a.do_investimento)

  const totalNoEstoque = dinheiro(
    itensEstoque.reduce((s, i) => s + i.do_investimento, 0),
  )

  const livre = dinheiro(resumo.caixaInvestimentoExtrato)
  const reservado = dinheiro(resumo.caixaInvestimentoReservado)
  const disponivel = dinheiro(resumo.caixaInvestimento)
  const devolvidoMarcado = dinheiro(resumo.totalDevolvido)
  const devolvidoDebitadoCaixa = dinheiro(resumo.totalDevolvidoDebitado)

  const despesasPendentes = lancamentos.filter(
    (l) => l.status === 'a_devolver' && l.origem === 'despesa',
  )

  const alertasPendentes: string[] = []

  if (devolvidoDebitadoCaixa > 0) {
    alertasPendentes.push(
      `${formatarMoedaCurta(devolvidoDebitadoCaixa)} já devolvido ao bolso e debitado — fora disso ficam só pendências ainda não marcadas.`,
    )
  }

  if (reservado > 0) {
    alertasPendentes.push(
      `${formatarMoedaCurta(reservado)} no extrato está reservado a despesas em A devolver (não conta como disponível para comprar).`,
    )
  }

  for (const d of despesasPendentes) {
    const valor = dinheiro(Number(d.valor) || 0)
    if (valor <= 0) continue
    const desc = d.descricao.trim()
    const ehGasolinaAcordo = desc.toLowerCase().includes('gasolina acordo')
    const explicaResiduo =
      livre > 0 && livre < 500 && Math.abs(valor - livre) < 2
    if (ehGasolinaAcordo || explicaResiduo) {
      alertasPendentes.push(
        `${formatarMoedaCurta(valor)} · ${desc} — pendente; não entra nos ${formatarMoedaCurta(devolvidoDebitadoCaixa)} já devolvidos.`,
      )
    }
  }

  if (disponivel <= 0 && totalNoEstoque > 0) {
    alertasPendentes.push(
      `Disponível para comprar: R$ 0. Investimento alocado nos carros: ${formatarMoedaCurta(totalNoEstoque)}.`,
    )
  }

  return {
    disponivel,
    livre,
    reservado,
    itensEstoque,
    totalNoEstoque,
    devolvidoMarcado,
    devolvidoDebitadoCaixa,
    alertasPendentes,
  }
}

// ---------------------------------------------------------------------------

// Sincronização automática

// ---------------------------------------------------------------------------

export interface EstadoBancoPessoal {
  lancamentos: LancamentoBancoPessoal[]
  opcoesCaixa: OpcoesSimulacaoCaixa
  sim: SimulacaoPoolPessoal
  carros: CarroBancoPessoal[]
  resumo: ResumoBancoPessoal
}

/** Uma simulação única — garante que resumo, extrato e carros usem os mesmos números. */
export function montarEstadoBancoPessoal(
  despesas: Despesa[],
  veiculos: Veiculo[],
  vendas: Venda[],
  capitalInicial: number,
  dono: string,
  nomeRevenda: string,
  socios: string[],
): EstadoBancoPessoal {
  const opcoesCaixaBase = { despesas, nomeRevenda, socios }
  const lancamentos = lancamentosFromSistema(
    despesas,
    veiculos,
    dono,
    capitalInicial,
    vendas,
    opcoesCaixaBase,
  )
  const opcoesCaixa: OpcoesSimulacaoCaixa = {
    ...opcoesCaixaBase,
    devolucoes: devolucoesPoolFromLancamentos(lancamentos, vendas),
  }
  const sim = simularPoolPessoal(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  )
  const carros = carrosFromSistema(
    veiculos,
    despesas,
    vendas,
    capitalInicial,
    opcoesCaixa,
    sim,
  )
  const resumo = resumoBancoPessoal(
    carros,
    lancamentos,
    capitalInicial,
    veiculos,
    vendas,
    opcoesCaixa,
    sim,
  )
  return { lancamentos, opcoesCaixa, sim, carros, resumo }
}



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

  simPreCalculada?: SimulacaoPoolPessoal,

): CarroBancoPessoal[] {

  const sim =
    simPreCalculada ??
    simularPoolPessoal(veiculos, vendas, capitalInicial, {
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

      extrapessoal_compra: (() => {
        const simBolso = funding?.do_bolso ?? extrapPorVeic.get(v.id) ?? 0
        if (!veiculoTemFundingManual(v)) return dinheiro(simBolso)
        const cadBolso = pessoalMeuNaCompra(v)
        return Math.abs(simBolso - cadBolso) < 0.5 ? cadBolso : dinheiro(simBolso)
      })(),

      do_revenda: veiculoTemFundingManual(v)
        ? revendaMeuNaCompra(v)
        : (funding?.do_revenda ?? 0),

      do_investimento: (() => {
        const simInv = investimentoFunding(
          funding ?? {
            veiculo_id: v.id,
            do_revenda: 0,
            do_capital_inicial: 0,
            do_reinvestimento: 0,
            do_bolso: 0,
          },
        )
        if (!veiculoTemFundingManual(v)) return dinheiro(simInv)
        const aporte = aporteInvestimentoParaRevenda(v)
        if (aporte > 0) return aporte
        const cadInv = investimentoPoolNaCompra(v)
        return Math.abs(simInv - cadInv) < 0.5 ? cadInv : dinheiro(simInv)
      })(),

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

  opcoesCaixa?: OpcoesSimulacaoCaixa,

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



  for (const e of simularPoolPessoal(
    veiculos,
    vendas,
    capitalInicial,
    opcoesCaixa,
  ).extrapessoal) {
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


