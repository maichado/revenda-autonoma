// Geradores de texto WhatsApp para o módulo Calculadora.
//
// Segue as mesmas premissas de relatoriosTexto.ts:
//  • Sintaxe WhatsApp: *negrito*, _itálico_
//  • Moeda R$ X.XXX,XX (pt-BR)
//  • Assinatura com nome da revenda e data/hora

import { format } from 'date-fns'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import type {
  ResultadoDivisaoMeiaCarro,
  ResultadoSimulacaoNegocio,
} from './calculos'
import { formatarMoedaBR, formatarPercentualBR } from './relatorios'

function assinatura(nomeRevenda: string): string {
  const dataHora = format(new Date(), 'dd/MM/yyyy HH:mm')
  return `\n— ${nomeRevenda || NOME_REVENDA_PADRAO} · enviado em ${dataHora}`
}

export interface DadosSimulacaoNegocioTexto {
  titulo?: string
  precoCompra: number
  valorFipe: number
  precoVenda: number
  despesasEstimadas: number
  observacoes?: string
  resultado: ResultadoSimulacaoNegocio
  nomeRevenda?: string
}

export function gerarTextoSimulacaoNegocio(
  dados: DadosSimulacaoNegocioTexto,
): string {
  const nome = dados.nomeRevenda || NOME_REVENDA_PADRAO
  const r = dados.resultado
  const out: string[] = []

  out.push(`📊 *Simulação de Negócio — ${nome}*`)
  if (dados.titulo?.trim()) {
    out.push(`🚗 ${dados.titulo.trim()}`)
  }
  out.push('')

  out.push('💰 *Valores*')
  out.push(`🛒 Compra: ${formatarMoedaBR(dados.precoCompra)}`)
  if (dados.valorFipe > 0) {
    out.push(`📋 FIPE: ${formatarMoedaBR(dados.valorFipe)}`)
  }
  out.push(`🏷 Venda: ${formatarMoedaBR(dados.precoVenda)}`)
  out.push(`💸 Despesas: ${formatarMoedaBR(dados.despesasEstimadas)}`)
  out.push(`🧾 *Custo total do carro:* ${formatarMoedaBR(r.custoTotal)}`)
  out.push('')

  out.push('📈 *Resultados*')
  out.push(`💵 Lucro bruto: ${formatarMoedaBR(r.lucroBruto)}`)
  const emojiLucro = r.lucroLiquido >= 0 ? '✅' : '⚠️'
  out.push(`${emojiLucro} Lucro líquido: *${formatarMoedaBR(r.lucroLiquido)}*`)
  out.push(`📊 Margem: ${formatarPercentualBR(r.margemPercentual, 1)}`)
  out.push(`📈 ROI: ${formatarPercentualBR(r.roiPercentual, 1)}`)

  if (dados.valorFipe > 0) {
    out.push('')
    out.push('📋 *Referência FIPE*')
    out.push(`Compra vs FIPE: ${formatarMoedaBR(r.diffCompraFipe)}`)
    out.push(`Venda vs FIPE: ${formatarMoedaBR(r.diffVendaFipe)}`)
  }

  if (dados.observacoes?.trim()) {
    out.push('')
    out.push(`📝 _${dados.observacoes.trim()}_`)
  }

  out.push(assinatura(nome))
  return out.join('\n')
}

export interface DadosDivisaoSocioTexto {
  veiculoLabel: string
  resultado: ResultadoDivisaoMeiaCarro
  nomeRevenda?: string
}

export function gerarTextoDivisaoSocio(dados: DadosDivisaoSocioTexto): string {
  const nome = dados.nomeRevenda || NOME_REVENDA_PADRAO
  const r = dados.resultado
  const out: string[] = []

  out.push(`🤝 *Divisão 50/50 — ${nome}*`)
  out.push(`🚗 ${dados.veiculoLabel}`)
  out.push('')

  out.push('💰 *Conta*')
  out.push(`1️⃣ Valor recebido: ${formatarMoedaBR(r.valorTotal)}`)
  out.push(`2️⃣ (−) Despesas do carro: ${formatarMoedaBR(r.totalDespesas)}`)
  out.push(`3️⃣ (=) Sobra para dividir: *${formatarMoedaBR(r.valorRestante)}*`)
  out.push(`   ${formatarMoedaBR(r.valorRestante / 2)} para cada sócio`)
  out.push('')

  out.push('*Distribuição:*')
  for (const linha of r.linhas) {
    out.push(`👤 *${linha.participante}*`)
    out.push(`   Reembolso despesas: ${formatarMoedaBR(linha.despesasPagas)}`)
    out.push(`   Metade do lucro: ${formatarMoedaBR(linha.metadeLucro)}`)
    out.push(`   ✅ Total a receber: *${formatarMoedaBR(linha.valorAReceber)}*`)
  }

  if (r.despesasNaoAtribuidas > 0) {
    out.push('')
    out.push(
      `⚠️ ${formatarMoedaBR(r.despesasNaoAtribuidas)} em despesas não atribuídas aos sócios.`,
    )
  }

  out.push(assinatura(nome))
  return out.join('\n')
}
