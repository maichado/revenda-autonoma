import type { CategoriaVeiculo, Veiculo, Venda } from '@/types'
import { valorCaixaDaVenda } from '@/utils/calculos'

export interface BemTrocaResumo {
  id: string
  placa: string
  marca: string
  modelo: string
  categoria: CategoriaVeiculo
}

/**
 * Composição de uma venda com troca — reutilizável em cards, tabela e listagens.
 * Ex.: dinheiro R$ 11.000 + Honda BIZ = total do negócio.
 */
export interface ComposicaoVendaTroca {
  venda: Venda
  dinheiro: number
  valorTroca: number
  total: number
  bemTroca?: BemTrocaResumo
}

export function labelCurtoBem(bem: Pick<BemTrocaResumo, 'marca' | 'modelo' | 'categoria'>): string {
  const nome = `${bem.marca} ${bem.modelo}`.trim()
  if (nome) return nome
  return bem.categoria === 'moto' ? 'Moto' : 'Carro'
}

export function composicaoVendaTroca(
  venda: Venda | undefined,
  veiculosPorId: Record<string, Veiculo | undefined>,
): ComposicaoVendaTroca | null {
  if (!venda) return null
  const valorTroca = Number(venda.valor_troca) || 0
  if (valorTroca <= 0 && !venda.troca_veiculo_id) return null

  const tv = venda.troca_veiculo_id
    ? veiculosPorId[venda.troca_veiculo_id]
    : undefined

  return {
    venda,
    dinheiro: valorCaixaDaVenda(venda),
    valorTroca: valorTroca || (tv?.valor_compra ?? 0),
    total: Number(venda.valor_venda) || 0,
    bemTroca: tv
      ? {
          id: tv.id,
          placa: tv.placa,
          marca: tv.marca,
          modelo: tv.modelo,
          categoria: tv.categoria === 'moto' ? 'moto' : 'carro',
        }
      : undefined,
  }
}

/** Venda na qual este veículo entrou como bem de troca. */
export function vendaOrigemDaTroca(
  veiculoId: string,
  vendas: Venda[],
): Venda | undefined {
  return vendas.find((v) => v.troca_veiculo_id === veiculoId)
}

/**
 * Relação completa: este veículo (ex.: BIZ) entrou na troca de outro (ex.: Uno).
 * Usado ao vender o bem da troca e nas listagens para manter o vínculo visível.
 */
export function origemTrocaDoVeiculo(
  veiculoId: string,
  vendas: Venda[],
  veiculosPorId: Record<string, Veiculo | undefined>,
): { vendaOrigem: Venda; veiculoVendido: Veiculo | undefined } | null {
  const vendaOrigem = vendaOrigemDaTroca(veiculoId, vendas)
  if (!vendaOrigem) return null
  return {
    vendaOrigem,
    veiculoVendido: veiculosPorId[vendaOrigem.veiculo_id],
  }
}

/** Rótulo curto do par de troca — ex.: "BIZ ↔ Uno (ABC1D23)". */
export function rotuloParTroca(
  bemTroca: Pick<Veiculo, 'marca' | 'modelo' | 'placa' | 'categoria'>,
  veiculoVendido: Pick<Veiculo, 'marca' | 'modelo' | 'placa'> | undefined,
): string {
  const bem = labelCurtoBem({
    marca: bemTroca.marca,
    modelo: bemTroca.modelo,
    categoria: bemTroca.categoria === 'moto' ? 'moto' : 'carro',
  })
  if (!veiculoVendido) {
    return `${bem} entrou por troca`
  }
  const origem = `${veiculoVendido.marca} ${veiculoVendido.modelo}`.trim()
  const placa = veiculoVendido.placa ? ` (${veiculoVendido.placa})` : ''
  return `${bem} ↔ ${origem || 'veículo'}${placa}`
}

export interface ResumoTrocasPeriodo {
  quantidade: number
  dinheiro: number
  valorTrocas: number
  negocioTotal: number
  composicoes: ComposicaoVendaTroca[]
}

/** Agrega vendas com troca no período (para KPIs e blocos de relatório). */
export function resumirTrocasPeriodo(
  vendas: Venda[],
  veiculosPorId: Record<string, Veiculo | undefined>,
): ResumoTrocasPeriodo {
  const composicoes: ComposicaoVendaTroca[] = []
  for (const v of vendas) {
    const c = composicaoVendaTroca(v, veiculosPorId)
    if (c) composicoes.push(c)
  }
  return {
    quantidade: composicoes.length,
    dinheiro: composicoes.reduce((a, c) => a + c.dinheiro, 0),
    valorTrocas: composicoes.reduce((a, c) => a + c.valorTroca, 0),
    negocioTotal: composicoes.reduce((a, c) => a + c.total, 0),
    composicoes,
  }
}

/** Linhas de texto (WhatsApp / compartilhar) com detalhe da troca. */
export function linhasTextoTroca(
  comp: ComposicaoVendaTroca,
  formatarMoeda: (n: number) => string,
): string[] {
  const bem = comp.bemTroca
  const nomeBem = bem ? labelCurtoBem(bem) : 'bem na troca'
  const placaBem = bem?.placa ? ` (${bem.placa})` : ''
  const tipo = bem?.categoria === 'moto' ? 'moto' : bem ? 'carro' : 'bem'
  return [
    `🔄 Troca: entrou ${tipo} ${nomeBem}${placaBem}`,
    `   Dinheiro: ${formatarMoeda(comp.dinheiro)} · Troca: ${formatarMoeda(comp.valorTroca)} · Negócio: ${formatarMoeda(comp.total)}`,
    `   (Lucro/receita usam só o dinheiro; o ${tipo} fica no estoque até vender)`,
  ]
}
