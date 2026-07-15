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
import { totalEmEstoque } from './calculos'
import {
  calcularDadosVeiculoIndividual,
  calcularIndicadoresDestaque,
  calcularLinhasVeiculos,
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
      `✅ ${resumo.qtdVendas} ${resumo.qtdVendas === 1 ? 'venda' : 'vendas'} · Receita ${formatarMoedaBR(resumo.receita)} · Lucro ${formatarMoedaBR(resumo.lucro)}`,
    )
  }
  linhasTexto.push('')

  // Resumo financeiro do período
  linhasTexto.push('💰 *Resumo financeiro do período*')
  linhasTexto.push(`💰 *Receita:* ${formatarMoedaBR(resumo.receita)}`)
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
  out.push(`💰 Receita: *${formatarMoedaBR(resumo.receita)}*`)
  out.push(`✅ Lucro: *${formatarMoedaBR(resumo.lucro)}*`)
  out.push(`📊 Ticket médio: *${formatarMoedaBR(ticket)}*`)
  out.push(`📈 Margem média: *${formatarPercentualBR(resumo.margem, 1)}*`)
  out.push('')

  if (vendasPeriodo.length === 0) {
    out.push('_Nenhuma venda registrada no período._')
  } else {
    out.push('*Vendas do período:*')
    const limitada = vendasPeriodo.slice(0, LIMITE_LISTA)
    for (const v of limitada) {
      const veic = veiculos.find((x) => x.id === v.veiculo_id)
      const placa = veic?.placa ?? '—'
      // Lucro por venda: valor_venda − valor_compra − despesas vinculadas
      const despesasVinc = despesas
        .filter((d) => d.veiculo_id === v.veiculo_id)
        .reduce((acc, d) => acc + d.valor, 0)
      const lucroVenda = veic
        ? v.valor_venda - veic.valor_compra - despesasVinc
        : 0
      out.push(
        `${formatarDataCurtaBR(v.data)} · ${placa} · ${trunc(v.comprador_nome || '—', 16)} · ${formatarMoedaBR(v.valor_venda)} · ${v.forma_recebimento || '—'} · lucro ${formatarMoedaBR(lucroVenda)}`,
      )
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
    out.push(
      `${formatarDataBR(venda.data)} · ${formatarMoedaBR(venda.valor_venda)} · ${venda.forma_recebimento || '—'} · ${trunc(venda.comprador_nome || '—', 24)}`,
    )
    out.push(
      `✅ Lucro: ${formatarMoedaBR(lucro)} (ROI ${formatarPercentualBR(roi, 1)})`,
    )
    out.push(`⏱ ${diasEmEstoque} dias em estoque`)
  } else {
    out.push('🤝 *Venda*')
    out.push('_Veículo ainda não vendido._')
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
] as const
export type TipoRelatorio = (typeof TIPOS_RELATORIO)[number]

export function gerarTextoRelatorio(
  tipo: TipoRelatorio,
  estado: EstadoRelatorio,
  periodo: Periodo,
  veiculoId?: string,
): string {
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
  }
}
