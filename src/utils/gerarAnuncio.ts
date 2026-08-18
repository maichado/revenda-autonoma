import type { Veiculo } from '@/types'
import { formatarMoeda, formatarNumero } from '@/utils/formatadores'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'

/**
 * Gera texto de anúncio chamativo para WhatsApp / marketplace.
 * Usa só formatação que o WhatsApp entende (*negrito*).
 */
export function gerarTextoAnuncioVeiculo(
  veiculo: Veiculo,
  nomeRevenda?: string,
): string {
  const loja = nomeRevenda?.trim() || NOME_REVENDA_PADRAO
  const titulo = `${veiculo.marca} ${veiculo.modelo}`.trim().toUpperCase()
  const acessorios = (veiculo.acessorios ?? [])
    .map((a) => a.trim())
    .filter(Boolean)

  const linhas: string[] = [
    '🔥 *OPORTUNIDADE IMPERDÍVEL!* 🔥',
    '',
    `🚗 *${titulo}*`,
    `✨ ${veiculo.ano} · ${veiculo.cor} · ${formatarNumero(veiculo.quilometragem)} km`,
    `🔢 Placa: *${veiculo.placa}*`,
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    `💰 *POR APENAS ${formatarMoeda(veiculo.valor_venda_pretendido)}*`,
    '━━━━━━━━━━━━━━━━━━━━',
  ]

  if (veiculo.valor_fipe && veiculo.valor_fipe > 0) {
    linhas.push(`📊 Referência FIPE: ${formatarMoeda(veiculo.valor_fipe)}`)
  }

  if (acessorios.length > 0) {
    linhas.push('', '⭐ *O QUE ESSE CARRO TEM:*', '')
    for (const item of acessorios) {
      linhas.push(`✅ ${item}`)
    }
  } else {
    linhas.push(
      '',
      '⭐ *DESTAQUES:*',
      '✅ Pronto para negociar',
      '✅ Ideal para uso diário',
    )
  }

  const obs = veiculo.observacoes?.trim()
  if (obs) {
    linhas.push('', '📝 *Mais detalhes:*', obs)
  }

  linhas.push(
    '',
    '💎 Veículo selecionado com carinho para você',
    '🤝 Aceitamos proposta — vamos conversar!',
    '',
    `📍 *${loja}*`,
    '📲 *Chame agora no WhatsApp e garanta o seu!*',
    '👇 Manda um "TENHO INTERESSE" que te respondo na hora',
  )

  return linhas.join('\n')
}
