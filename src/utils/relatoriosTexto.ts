// Geradores de texto WhatsApp para cada relatório.
//
// Premissas:
//  • Usar APENAS sintaxe que o WhatsApp entende: *negrito*, _itálico_, ~tachado~,
//    ```mono``` (evitar). Nada de markdown # ou tabelas.
//  • Quebras de linha com \n (o componente BolhaWhatsApp renderiza com
//    white-space: pre-wrap). O wa.me cuida do encoding via encodeURIComponent.
//  • Moeda sempre R$ X.XXX,XX (pt-BR), datas dd/mm/yyyy.
//  • Limite de 20 itens nas listagens — quando exceder, mostra "+N itens".
//  • Cada texto termina com a assinatura "— {nome da revenda} · enviado em ...".

import { format } from 'date-fns'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import type {
  Compra,
  Configuracoes,
  Despesa,
  Veiculo,
  Venda,
} from '@/types'
import {
  calcularLucroVenda,
  receitaRealizadaDaVenda,
  totalEmEstoque,
} from './calculos'
import {
  calcularDadosVeiculoIndividual,
  calcularGanhoEstoque,
  calcularIndicadoresDestaque,
  calcularLinhasVeiculos,
  calcularRelatorioGanhoMeia,
  calcularResumoFinanceiro,
  calcularValorEstoque,
  filtrarDespesasRelatorio,
  filtrarPorPeriodo,
  filtrarPorVeiculo,
  formatarDataBR,
  formatarDataCurtaBR,
  formatarMoedaBR,
  formatarPercentualBR,
  rotuloCurtoPeriodo,
  resumirDespesas,
  agruparDespesasPorTipoResumo,
  type DadosVeiculoIndividual,
  type Periodo,
} from './relatorios'
import {
  composicaoVendaTroca,
  linhasTextoTroca,
  resumirTrocasPeriodo,
  vendaOrigemDaTroca,
} from './trocaVenda'

const LIMITE_LISTA = 20
const LIMITE_LISTA_DESPESAS = 10
const LIMITE_ESTOQUE_WHATSAPP = 10

export interface EstadoRelatorio {
  veiculos: Veiculo[]
  compras: Compra[]
  vendas: Venda[]
  despesas: Despesa[]
  configuracoes: Configuracoes
}

// -----------------------------------------------------------------------------
// HELPERS DE FORMATAÇÃO INTERNA
// -----------------------------------------------------------------------------

function assinatura(nomeRevenda: string): string {
  const dataHora = format(new Date(), 'dd/MM/yyyy HH:mm')
  return `\n— ${nomeRevenda || NOME_REVENDA_PADRAO} · enviado em ${dataHora}`
}

function trunc(s: string, max = 40): string {
  if (!s) return ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function statusLabel(s: string): string {
  return s === 'disponível' ? 'disponível' : s
}

function cabecalho(titulo: string, periodo: Periodo): string {
  return `${titulo}\n🗓 Período: ${rotuloCurtoPeriodo(periodo)}\n`
}

// -----------------------------------------------------------------------------
// A) RELATÓRIO GERAL
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioGeral(
  estado: EstadoRelatorio,
  periodo: Periodo,
): string {
  const { veiculos, compras, vendas, despesas, configuracoes } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO

  const resumo = calcularResumoFinanceiro(
    vendas,
    compras,
    despesas,
    veiculos,
    periodo,
  )
  const linhas = calcularLinhasVeiculos(veiculos, vendas, despesas, periodo)
  const indicadores = calcularIndicadoresDestaque(
    linhas,
    vendas,
    compras,
    periodo,
  )

  const estoque = calcularValorEstoque(veiculos, despesas)

  const linhasTexto: string[] = []
  linhasTexto.push(`📊 *Relatório Geral — ${nome}*`)
  linhasTexto.push(`🗓 Período: ${rotuloCurtoPeriodo(periodo)}`)
  linhasTexto.push('')

  // Estoque atual — sempre visível, independente do período
  linhasTexto.push('🏪 *ESTOQUE ATUAL*')
  linhasTexto.push(
    `🚗 ${estoque.qtd} ${estoque.qtd === 1 ? 'veículo' : 'veículos'} em estoque`,
  )
  linhasTexto.push(
    `💰 Valor investido: ${formatarMoedaBR(estoque.custoTotal)}`,
  )
  if (estoque.valorVendaPretendido > 0) {
    linhasTexto.push(
      `🏷 Valor de venda pretendido: ${formatarMoedaBR(estoque.valorVendaPretendido)}`,
    )
  }
  if (estoque.veiculos.length > 0) {
    const limitada = estoque.veiculos.slice(0, LIMITE_ESTOQUE_WHATSAPP)
    for (const { veiculo, investido } of limitada) {
      linhasTexto.push(
        `📋 ${veiculo.placa} — ${trunc(`${veiculo.marca} ${veiculo.modelo}`, 22)} ${veiculo.ano} · ${statusLabel(veiculo.status)} · ${formatarMoedaBR(investido)}`,
      )
    }
    const restante = estoque.veiculos.length - limitada.length
    if (restante > 0) {
      linhasTexto.push(`_+${restante} veículo(s) não exibido(s)._`)
    }
  }
  linhasTexto.push('')

  // Vendas no período — sempre exibir bloco, mesmo quando zero
  linhasTexto.push('🤝 *VENDAS NO PERÍODO*')
  if (resumo.qtdVendas === 0) {
    linhasTexto.push('❌ Nenhuma venda registrada neste período.')
  } else {
    linhasTexto.push(
      `✅ ${resumo.qtdVendas} ${resumo.qtdVendas === 1 ? 'venda' : 'vendas'} · Receita (dinheiro) ${formatarMoedaBR(resumo.receita)} · Lucro ${formatarMoedaBR(resumo.lucro)}`,
    )
  }
  linhasTexto.push('')

  const veiculosPorIdGeral: Record<string, Veiculo | undefined> = {}
  for (const v of veiculos) veiculosPorIdGeral[v.id] = v
  const vendasPeriodoGeral = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  )
  const trocasGeral = resumirTrocasPeriodo(vendasPeriodoGeral, veiculosPorIdGeral)
  if (trocasGeral.quantidade > 0) {
    linhasTexto.push('🔄 *TROCAS NO PERÍODO*')
    linhasTexto.push(
      `${trocasGeral.quantidade} negócio(s) · Dinheiro ${formatarMoedaBR(trocasGeral.dinheiro)} · Trocas (estoque) ${formatarMoedaBR(trocasGeral.valorTrocas)} · Negócios ${formatarMoedaBR(trocasGeral.negocioTotal)}`,
    )
    for (const c of trocasGeral.composicoes.slice(0, LIMITE_LISTA)) {
      const vendido = veiculosPorIdGeral[c.venda.veiculo_id]
      const placa = vendido?.placa ?? '—'
      linhasTexto.push(
        `• ${formatarDataCurtaBR(c.venda.data)} · ${placa} · ${formatarMoedaBR(c.dinheiro)} + troca ${formatarMoedaBR(c.valorTroca)} = ${formatarMoedaBR(c.total)}`,
      )
      for (const linha of linhasTextoTroca(c, formatarMoedaBR)) {
        if (!linha.startsWith('🔄')) linhasTexto.push(linha)
      }
    }
    linhasTexto.push('')
  }

  // Resumo financeiro do período
  linhasTexto.push('💰 *Resumo financeiro do período*')
  linhasTexto.push(
    `💰 *Receita (dinheiro):* ${formatarMoedaBR(resumo.receita)}`,
  )
  linhasTexto.push(
    `🧾 *Custos (compra + despesas):* ${formatarMoedaBR(resumo.custoTotal)}`,
  )
  const emojiLucro = resumo.lucro >= 0 ? '✅' : '⚠️'
  linhasTexto.push(
    `${emojiLucro} *Lucro líquido:* ${formatarMoedaBR(resumo.lucro)}`,
  )
  if (resumo.temDivisao) {
    linhasTexto.push(
      `🤝 *Divisão do lucro dos vendidos (${formatarMoedaBR(resumo.lucroVeiculosVendidos)}):*`,
    )
    linhasTexto.push(
      `   👤 Sua parte: ${formatarMoedaBR(resumo.lucroMeu)}`,
    )
    linhasTexto.push(
      `   🤝 Sócio (a meia): ${formatarMoedaBR(resumo.parteSocios)}`,
    )
  }
  linhasTexto.push(
    `📈 *Margem média:* ${formatarPercentualBR(resumo.margem, 1)}`,
  )
  linhasTexto.push(`🛒 Compras no período: ${resumo.qtdCompras}`)
  linhasTexto.push(
    `💸 Despesas no período: ${formatarMoedaBR(resumo.custoDespesas)} (${resumo.qtdDespesas} ${resumo.qtdDespesas === 1 ? 'lançamento' : 'lançamentos'})`,
  )

  if (indicadores.veiculoMaisLucrativo) {
    const top = indicadores.veiculoMaisLucrativo
    linhasTexto.push('')
    linhasTexto.push(
      `🏆 Veículo mais lucrativo: ${top.veiculo.placa} — ${trunc(`${top.veiculo.marca} ${top.veiculo.modelo}`, 28)} ${top.veiculo.ano} (${formatarMoedaBR(top.lucro)} / ROI ${formatarPercentualBR(top.roi, 0)})`,
    )
  }
  if (indicadores.mediaDiasEstoque > 0) {
    linhasTexto.push(
      `⏱ Média de dias em estoque: ${Math.round(indicadores.mediaDiasEstoque)}`,
    )
  }
  if (indicadores.formaRecebimentoTop) {
    const fr = indicadores.formaRecebimentoTop
    linhasTexto.push(
      `💳 Recebimento mais usado: ${fr.forma} (${formatarPercentualBR(fr.percentual, 0)})`,
    )
  }

  linhasTexto.push(assinatura(nome))
  return linhasTexto.join('\n')
}

// -----------------------------------------------------------------------------
// B) RELATÓRIO DE VEÍCULOS / ESTOQUE
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioVeiculos(
  estado: EstadoRelatorio,
  periodo: Periodo,
): string {
  const { veiculos, vendas, despesas, configuracoes } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO

  const linhas = calcularLinhasVeiculos(veiculos, vendas, despesas, periodo)
  const estoqueAtual = totalEmEstoque(veiculos)
  const entradosPeriodo = veiculos.filter(
    (v) =>
      v.data_compra >= periodo.dataInicio && v.data_compra <= periodo.dataFim,
  ).length
  const vendidosPeriodo = linhas.filter((l) => !!l.venda).length

  const out: string[] = []
  out.push(`🚗 *Relatório de Veículos — ${nome}*`)
  out.push(`🗓 Período: ${rotuloCurtoPeriodo(periodo)}`)
  out.push('')
  out.push(`📦 Estoque atual: *${estoqueAtual}*`)
  out.push(`📥 Entrados no período: *${entradosPeriodo}*`)
  out.push(`📤 Vendidos no período: *${vendidosPeriodo}*`)
  out.push('')

  if (linhas.length === 0) {
    out.push('_Nenhum veículo movimentado no período._')
  } else {
    out.push('*Veículos relevantes:*')
    const limitada = linhas.slice(0, LIMITE_LISTA)
    for (const l of limitada) {
      const v = l.veiculo
      const status = l.venda ? 'vendido' : statusLabel(v.status)
      const sufixo = l.venda
        ? `${formatarMoedaBR(l.venda_valor)} · lucro ${formatarMoedaBR(l.lucro)}`
        : `${formatarMoedaBR(v.valor_venda_pretendido)} (margem esperada ${formatarPercentualBR(
            v.valor_compra > 0
              ? ((v.valor_venda_pretendido - v.valor_compra - l.despesas) /
                  v.valor_compra) *
                  100
              : 0,
            0,
          )})`
      out.push(
        `🚗 ${v.placa} — ${trunc(`${v.marca} ${v.modelo}`, 22)} ${v.ano} · ${status} · ${sufixo}`,
      )
    }
    const restante = linhas.length - limitada.length
    if (restante > 0) {
      out.push(`_+${restante} veículo(s) não exibidos._`)
    }
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

// -----------------------------------------------------------------------------
// C) RELATÓRIO DE COMPRAS
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioCompras(
  estado: EstadoRelatorio,
  periodo: Periodo,
): string {
  const { veiculos, compras, configuracoes } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO

  const comprasPeriodo = filtrarPorPeriodo(
    compras,
    periodo.dataInicio,
    periodo.dataFim,
    (c) => c.data,
  ).sort((a, b) => (a.data < b.data ? 1 : -1))

  const total = comprasPeriodo.reduce((acc, c) => acc + c.valor_pago, 0)
  const ticket =
    comprasPeriodo.length > 0 ? total / comprasPeriodo.length : 0

  const out: string[] = []
  out.push(`🛒 *Relatório de Compras — ${nome}*`)
  out.push(`🗓 Período: ${rotuloCurtoPeriodo(periodo)}`)
  out.push('')
  out.push(`🔢 Quantidade: *${comprasPeriodo.length}*`)
  out.push(`💵 Total pago: *${formatarMoedaBR(total)}*`)
  out.push(`📊 Ticket médio: *${formatarMoedaBR(ticket)}*`)
  out.push('')

  if (comprasPeriodo.length === 0) {
    out.push('_Nenhuma compra registrada no período._')
  } else {
    out.push('*Compras do período:*')
    const limitada = comprasPeriodo.slice(0, LIMITE_LISTA)
    for (const c of limitada) {
      const veic = veiculos.find((v) => v.id === c.veiculo_id)
      const placa = veic?.placa ?? '—'
      out.push(
        `${formatarDataCurtaBR(c.data)} · ${placa} · ${formatarMoedaBR(c.valor_pago)} · ${c.forma_pagamento || '—'} · ${c.origem || '—'} · ${trunc(c.vendedor_nome || '—', 18)}`,
      )
    }
    const restante = comprasPeriodo.length - limitada.length
    if (restante > 0) {
      out.push(`_+${restante} compra(s) não exibida(s)._`)
    }
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

// -----------------------------------------------------------------------------
// D) RELATÓRIO DE VENDAS
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioVendas(
  estado: EstadoRelatorio,
  periodo: Periodo,
): string {
  const { veiculos, vendas, despesas, configuracoes, compras } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO

  const vendasPeriodo = filtrarPorPeriodo(
    vendas,
    periodo.dataInicio,
    periodo.dataFim,
    (v) => v.data,
  ).sort((a, b) => (a.data < b.data ? 1 : -1))

  const resumo = calcularResumoFinanceiro(
    vendas,
    compras,
    despesas,
    veiculos,
    periodo,
  )
  const ticket =
    vendasPeriodo.length > 0 ? resumo.receita / vendasPeriodo.length : 0

  const out: string[] = []
  out.push(`🤝 *Relatório de Vendas — ${nome}*`)
  out.push(`🗓 Período: ${rotuloCurtoPeriodo(periodo)}`)
  out.push('')
  out.push(`🔢 Quantidade: *${vendasPeriodo.length}*`)
  out.push(`💰 Receita (dinheiro): *${formatarMoedaBR(resumo.receita)}*`)
  out.push(`✅ Lucro: *${formatarMoedaBR(resumo.lucro)}*`)
  out.push(`📊 Ticket médio: *${formatarMoedaBR(ticket)}*`)
  out.push(`📈 Margem média: *${formatarPercentualBR(resumo.margem, 1)}*`)
  out.push('')

  const veiculosPorId: Record<string, Veiculo | undefined> = {}
  for (const x of veiculos) veiculosPorId[x.id] = x
  const trocas = resumirTrocasPeriodo(vendasPeriodo, veiculosPorId)
  if (trocas.quantidade > 0) {
    out.push('🔄 *Trocas no período*')
    out.push(
      `${trocas.quantidade} · Dinheiro ${formatarMoedaBR(trocas.dinheiro)} · Em estoque (trocas) ${formatarMoedaBR(trocas.valorTrocas)} · Negócios ${formatarMoedaBR(trocas.negocioTotal)}`,
    )
    out.push('')
  }

  if (vendasPeriodo.length === 0) {
    out.push('_Nenhuma venda registrada no período._')
  } else {
    out.push('*Vendas do período:*')
    const limitada = vendasPeriodo.slice(0, LIMITE_LISTA)
    for (const v of limitada) {
      const veic = veiculosPorId[v.veiculo_id]
      const placa = veic?.placa ?? '—'
      const dinheiro = receitaRealizadaDaVenda(v)
      const lucroVenda = calcularLucroVenda(v, veic, despesas, vendas)
      const comp = composicaoVendaTroca(v, veiculosPorId)
      out.push(
        `${formatarDataCurtaBR(v.data)} · ${placa} · ${trunc(v.comprador_nome || '—', 16)} · ${formatarMoedaBR(dinheiro)} dinheiro · ${v.forma_recebimento || '—'} · lucro ${formatarMoedaBR(lucroVenda)}`,
      )
      if (comp) {
        for (const linha of linhasTextoTroca(comp, formatarMoedaBR)) {
          out.push(linha)
        }
      }
    }
    const restante = vendasPeriodo.length - limitada.length
    if (restante > 0) {
      out.push(`_+${restante} venda(s) não exibida(s)._`)
    }
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

// -----------------------------------------------------------------------------
// E) RELATÓRIO DE DESPESAS
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioDespesas(
  estado: EstadoRelatorio,
  periodo: Periodo,
  veiculoId?: string,
): string {
  const { despesas, veiculos, configuracoes } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO

  const despesasPeriodo = filtrarDespesasRelatorio(
    despesas,
    periodo,
    veiculoId,
  )

  const resumo = resumirDespesas(despesasPeriodo)
  const porTipo = agruparDespesasPorTipoResumo(despesasPeriodo)
  const top = [...despesasPeriodo]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, LIMITE_LISTA_DESPESAS)

  const out: string[] = []
  out.push(`💸 *Relatório de Despesas — ${nome}*`)
  if (veiculoId) {
    const veic = veiculos.find((v) => v.id === veiculoId)
    out.push(`🚗 Veículo: *${veic?.placa ?? '—'}*`)
    out.push('📋 Escopo: histórico completo (todas as despesas do veículo)')
  } else {
    out.push(`🗓 Período: ${rotuloCurtoPeriodo(periodo)}`)
  }
  out.push('')
  out.push(`🔢 Quantidade: *${resumo.qtd}*`)
  out.push(`💵 Total: *${formatarMoedaBR(resumo.total)}*`)
  out.push(`✅ Pago: ${formatarMoedaBR(resumo.pago)}`)
  out.push(`⏳ Em aberto: ${formatarMoedaBR(resumo.aberto)}`)

  if (porTipo.length > 0) {
    out.push('')
    out.push('*Totais por categoria:*')
    for (const { tipo, total: t, qtd } of porTipo) {
      out.push(`• ${tipo}: ${formatarMoedaBR(t)} (${qtd})`)
    }
  }

  if (top.length > 0) {
    out.push('')
    out.push(`*Maiores despesas (top ${top.length}):*`)
    for (const d of top) {
      const statusEmoji = d.pago ? '✅' : '⏳'
      out.push(
        `${formatarDataCurtaBR(d.data)} · ${d.tipo} · ${trunc(d.descricao || '—', 24)} · ${trunc(d.pago_por || '—', 16)} · ${formatarMoedaBR(d.valor)} · ${statusEmoji} ${d.pago ? 'pago' : 'em aberto'}`,
      )
    }
    if (despesasPeriodo.length > top.length) {
      out.push(`_+${despesasPeriodo.length - top.length} despesa(s) não exibidas._`)
    }
  } else {
    out.push('')
    out.push('_Nenhuma despesa registrada no período._')
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

// -----------------------------------------------------------------------------
// F) RELATÓRIO INDIVIDUAL DE VEÍCULO
// -----------------------------------------------------------------------------

export function gerarTextoRelatorioVeiculoIndividual(
  estado: EstadoRelatorio,
  dados: DadosVeiculoIndividual,
): string {
  const nome = estado.configuracoes.nome_revenda || NOME_REVENDA_PADRAO
  const { veiculo, compra, venda, despesasPorTipo, totalDespesas, lucro, roi, diasEmEstoque } =
    dados

  const status = venda ? 'vendido' : statusLabel(veiculo.status)
  const out: string[] = []

  out.push(`🏷 *Relatório do Veículo — ${veiculo.placa}*`)
  out.push(
    `🚗 ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} · ${veiculo.cor} · ${veiculo.quilometragem.toLocaleString('pt-BR')} km`,
  )
  out.push(`📊 Status: ${status}`)
  out.push('')

  out.push('🛒 *Compra*')
  out.push(
    `${formatarDataBR(compra?.data ?? veiculo.data_compra)} · ${formatarMoedaBR(veiculo.valor_compra)} · ${compra?.forma_pagamento || '—'} · ${compra?.origem || '—'} · ${trunc(compra?.vendedor_nome || '—', 24)}`,
  )
  out.push('')

  out.push(`💸 *Despesas (${formatarMoedaBR(totalDespesas)})*`)
  if (despesasPorTipo.length === 0) {
    out.push('_Nenhuma despesa vinculada._')
  } else {
    for (const grupo of despesasPorTipo) {
      for (const d of grupo.items) {
        out.push(
          `• ${grupo.tipo} · ${trunc(d.descricao || '—', 24)} · pago por ${trunc(d.pago_por || '—', 16)} · ${formatarMoedaBR(d.valor)}`,
        )
      }
    }
  }
  out.push('')

  if (venda) {
    out.push('🤝 *Venda*')
    const dinheiro = receitaRealizadaDaVenda(venda)
    out.push(
      `${formatarDataBR(venda.data)} · ${formatarMoedaBR(dinheiro)} dinheiro · ${venda.forma_recebimento || '—'} · ${trunc(venda.comprador_nome || '—', 24)}`,
    )
    const mapV: Record<string, Veiculo | undefined> = {}
    for (const x of estado.veiculos) mapV[x.id] = x
    const comp = composicaoVendaTroca(venda, mapV)
    if (comp) {
      for (const linha of linhasTextoTroca(comp, formatarMoedaBR)) {
        out.push(linha)
      }
    }
    const origem = vendaOrigemDaTroca(veiculo.id, estado.vendas)
    if (origem) {
      const vendido = estado.veiculos.find((x) => x.id === origem.veiculo_id)
      out.push(
        `🔄 Relação de troca: ${veiculo.marca} ${veiculo.modelo} ↔ ${vendido ? `${vendido.marca} ${vendido.modelo} (${vendido.placa})` : 'veículo de origem'}`,
      )
      out.push(
        `_Entrou na venda do ${vendido?.placa || 'veículo'} · custo de aquisição = R$ 0_`,
      )
    }
    out.push(
      `✅ Lucro realizado: ${formatarMoedaBR(lucro)} (ROI ${formatarPercentualBR(roi, 1)})`,
    )
    out.push(`⏱ ${diasEmEstoque} dias em estoque`)
  } else {
    out.push('🤝 *Venda*')
    const origem = vendaOrigemDaTroca(veiculo.id, estado.vendas)
    if (origem) {
      const vendido = estado.veiculos.find((x) => x.id === origem.veiculo_id)
      out.push(
        `🔄 Entrou por troca na venda do ${vendido ? `${vendido.marca} ${vendido.modelo} (${vendido.placa})` : 'veículo'}`,
      )
      out.push(
        `Dinheiro daquela venda: ${formatarMoedaBR(Number(origem.entrada) || 0)} · este bem ainda no estoque`,
      )
    } else {
      out.push('_Veículo ainda não vendido._')
    }
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

// -----------------------------------------------------------------------------
// EXPORT EM BLOCO (facilita import na página)
// -----------------------------------------------------------------------------

export const TIPOS_RELATORIO = [
  'geral',
  'veiculos',
  'compras',
  'vendas',
  'despesas',
  'ganho-meia',
  'ganho-meus',
] as const
export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number]

export function gerarTextoRelatorioGanhoEstoque(
  estado: EstadoRelatorio,
  escopo: 'meia' | 'meus',
): string {
  const { veiculos, despesas, configuracoes } = estado
  const nome = configuracoes.nome_revenda || NOME_REVENDA_PADRAO
  const out: string[] = []

  if (escopo === 'meia') {
    const meia = calcularRelatorioGanhoMeia(
      veiculos,
      estado.vendas,
      despesas,
      configuracoes,
    )
    const pc = meia.potencialComCaixa
    const dono = meia.nomeDono || 'Você'
    const socio = meia.nomeSocio || 'Sócio'
    const qtdEstoque = meia.potencial.qtd

    out.push(`🤝 *A meia — ${nome}*`)
    out.push('')
    out.push('━━━━━━━━━━━━━━')
    out.push('💵 *CAIXA REVENDA*')
    out.push('━━━━━━━━━━━━━━')
    out.push(`Em caixa: *${formatarMoedaBR(meia.caixa.saldo)}*`)
    out.push(`👤 ${dono}: *${formatarMoedaBR(meia.caixa.parteDono)}*`)
    out.push(`🤝 ${socio}: *${formatarMoedaBR(meia.caixa.parteSocio)}*`)
    out.push('')
    out.push('━━━━━━━━━━━━━━')
    out.push('📈 *POTENCIAL*')
    out.push('━━━━━━━━━━━━━━')
    out.push(`Caixa: *${formatarMoedaBR(pc.emCaixa)}*`)
    out.push(
      `Valor colocado no negócio: *${formatarMoedaBR(pc.valorColocado)}*`,
    )
    out.push(
      `Vai vender (${qtdEstoque} ${qtdEstoque === 1 ? 'carro' : 'carros'}): *${formatarMoedaBR(pc.vendaPretendida)}*`,
    )
    out.push(`*Total: ${formatarMoedaBR(pc.total)}*`)
    out.push('')
    out.push(`👤 ${dono}: *${formatarMoedaBR(pc.parteDono)}*`)
    out.push(`🤝 ${socio}: *${formatarMoedaBR(pc.parteSocio)}*`)
    out.push('')
    out.push('_Caixa + venda pretendida · 50/50_')
    out.push(assinatura(nome))
    return out.join('\n')
  }

  const resumo = calcularGanhoEstoque(veiculos, despesas, escopo)
  out.push(`👤 *Ganho potencial — Meus — ${nome}*`)
  out.push('🗓 Estoque atual (independente do período)')
  out.push('')
  out.push(`🔢 Em estoque: *${resumo.qtd}*`)
  out.push(`💸 Investido: *${formatarMoedaBR(resumo.investido)}*`)
  out.push(
    `🏷 Venda pretendida: *${formatarMoedaBR(resumo.vendaPretendida)}*`,
  )
  out.push(`📈 Ganho bruto: *${formatarMoedaBR(resumo.ganhoBruto)}*`)
  out.push(`✅ Seu ganho (100%): *${formatarMoedaBR(resumo.ganhoMeu)}*`)
  out.push('')

  if (resumo.linhas.length === 0) {
    out.push('_Nenhum veículo 100% seu em estoque._')
  } else {
    out.push('*Veículos:*')
    for (const l of resumo.linhas.slice(0, LIMITE_LISTA)) {
      const v = l.veiculo
      out.push(
        `${v.placa} · ${trunc(`${v.marca} ${v.modelo}`, 20)} · pret. ${formatarMoedaBR(l.vendaPretendida)} · ganho ${formatarMoedaBR(l.ganhoBruto)}`,
      )
    }
    const restante =
      resumo.linhas.length - Math.min(resumo.linhas.length, LIMITE_LISTA)
    if (restante > 0) {
      out.push(`_+${restante} veículo(s) não exibido(s)._`)
    }
  }

  out.push('')
  out.push(
    '_Projeção: pretendido − (compra + despesas do carro). Só se concretiza na venda._',
  )
  out.push(assinatura(nome))
  return out.join('\n')
}

export function gerarTextoRelatorio(
  tipo: TipoRelatorio,
  estado: EstadoRelatorio,
  periodo: Periodo,
  veiculoId?: string,
): string {
  if (tipo === 'ganho-meia') {
    return gerarTextoRelatorioGanhoEstoque(estado, 'meia')
  }
  if (tipo === 'ganho-meus') {
    return gerarTextoRelatorioGanhoEstoque(estado, 'meus')
  }

  if (veiculoId && (tipo === 'geral' || tipo === 'veiculos')) {
    const dados = calcularDadosVeiculoIndividual(
      veiculoId,
      estado.veiculos,
      estado.compras,
      estado.vendas,
      estado.despesas,
    )
    if (dados) return gerarTextoRelatorioVeiculoIndividual(estado, dados)
  }

  const estadoFiltrado: EstadoRelatorio = veiculoId
    ? {
        ...estado,
        veiculos: estado.veiculos.filter((v) => v.id === veiculoId),
        compras: filtrarPorVeiculo(estado.compras, veiculoId, (c) => c.veiculo_id),
        vendas: filtrarPorVeiculo(estado.vendas, veiculoId, (v) => v.veiculo_id),
        despesas: filtrarPorVeiculo(
          estado.despesas,
          veiculoId,
          (d) => d.veiculo_id,
        ),
      }
    : estado

  switch (tipo) {
    case 'geral':
      return gerarTextoRelatorioGeral(estadoFiltrado, periodo)
    case 'veiculos':
      return gerarTextoRelatorioVeiculos(estadoFiltrado, periodo)
    case 'compras':
      return gerarTextoRelatorioCompras(estadoFiltrado, periodo)
    case 'vendas':
      return gerarTextoRelatorioVendas(estadoFiltrado, periodo)
    case 'despesas':
      return gerarTextoRelatorioDespesas(estadoFiltrado, periodo, veiculoId)
  }
}

/** Slug curto para nomear o arquivo .txt do download. */
export function slugRelatorio(tipo: TipoRelatorio): string {
  switch (tipo) {
    case 'geral':
      return 'geral'
    case 'veiculos':
      return 'veiculos'
    case 'compras':
      return 'compras'
    case 'vendas':
      return 'vendas'
    case 'despesas':
      return 'despesas'
    case 'ganho-meia':
      return 'ganho-meia'
    case 'ganho-meus':
      return 'ganho-meus'
  }
}
