import type { RecordModel } from 'pocketbase'
import { normalizarNomeRevenda } from '@/constants/marca'
import { normalizarListaSocios } from '@/utils/socios'
import type {
  Compra,
  Configuracoes,
  Despesa,
  SimulacaoNegocio,
  Veiculo,
  Venda,
} from '@/types'

function relId(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: string }).id)
  }
  return ''
}

function optRelId(value: unknown): string | undefined {
  if (!value) return undefined
  const id = relId(value)
  return id || undefined
}

export function veiculoFromPb(r: RecordModel): Veiculo {
  return {
    id: r.id,
    placa: String(r.placa ?? ''),
    marca: String(r.marca ?? ''),
    modelo: String(r.modelo ?? ''),
    ano: Number(r.ano ?? 0),
    cor: String(r.cor ?? ''),
    quilometragem: Number(r.quilometragem ?? 0),
    data_compra: String(r.data_compra ?? ''),
    data_anuncio: r.data_anuncio ? String(r.data_anuncio).slice(0, 10) : undefined,
    valor_compra: Number(r.valor_compra ?? 0),
    valor_fipe: r.valor_fipe != null ? Number(r.valor_fipe) : undefined,
    valor_venda_pretendido: Number(r.valor_venda_pretendido ?? 0),
    status: r.status as Veiculo['status'],
    tipo_propriedade: r.tipo_propriedade === 'meia' ? 'meia' : 'solo',
    socio_parceiro: r.socio_parceiro ? String(r.socio_parceiro) : undefined,
    observacoes: String(r.observacoes ?? ''),
    fotos: Array.isArray(r.fotos) ? (r.fotos as string[]) : [],
    despesas_vinculadas: Array.isArray(r.despesas_vinculadas)
      ? (r.despesas_vinculadas as string[])
      : [],
    compra_pessoal_reembolsada: Boolean(r.compra_pessoal_reembolsada),
    investimento_pessoal_devolvido: Boolean(r.investimento_pessoal_devolvido),
    compra_funding_revenda:
      r.compra_funding_revenda != null
        ? Number(r.compra_funding_revenda)
        : undefined,
    compra_funding_investimento:
      r.compra_funding_investimento != null
        ? Number(r.compra_funding_investimento)
        : undefined,
    compra_funding_pessoal:
      r.compra_funding_pessoal != null
        ? Number(r.compra_funding_pessoal)
        : undefined,
    compra_funding_manual: Boolean(r.compra_funding_manual),
    compra_funding_investimento_meia_socio: Boolean(
      r.compra_funding_investimento_meia_socio,
    ),
    compra_funding_revenda_meia_socio: Boolean(
      r.compra_funding_revenda_meia_socio,
    ),
    compra_funding_pessoal_meia_socio: Boolean(
      r.compra_funding_pessoal_meia_socio,
    ),
  }
}

export function veiculoToPb(v: Veiculo): Record<string, unknown> {
  return {
    id: v.id,
    placa: v.placa,
    marca: v.marca,
    modelo: v.modelo,
    ano: v.ano,
    cor: v.cor,
    quilometragem: v.quilometragem,
    data_compra: v.data_compra,
    data_anuncio: v.data_anuncio ?? '',
    valor_compra: v.valor_compra,
    valor_fipe: v.valor_fipe ?? null,
    valor_venda_pretendido: v.valor_venda_pretendido,
    status: v.status,
    tipo_propriedade: v.tipo_propriedade ?? 'solo',
    socio_parceiro: v.socio_parceiro ?? '',
    observacoes: v.observacoes,
    fotos: v.fotos,
    despesas_vinculadas: v.despesas_vinculadas,
    compra_pessoal_reembolsada: v.compra_pessoal_reembolsada ?? false,
    investimento_pessoal_devolvido: v.investimento_pessoal_devolvido ?? false,
    compra_funding_revenda: v.compra_funding_revenda ?? null,
    compra_funding_investimento: v.compra_funding_investimento ?? null,
    compra_funding_pessoal: v.compra_funding_pessoal ?? null,
    compra_funding_manual: v.compra_funding_manual ?? false,
    compra_funding_investimento_meia_socio:
      v.compra_funding_investimento_meia_socio ?? false,
    compra_funding_revenda_meia_socio:
      v.compra_funding_revenda_meia_socio ?? false,
    compra_funding_pessoal_meia_socio:
      v.compra_funding_pessoal_meia_socio ?? false,
  }
}

export function compraFromPb(r: RecordModel): Compra {
  return {
    id: r.id,
    data: String(r.data ?? ''),
    veiculo_id: relId(r.veiculo),
    valor_pago: Number(r.valor_pago ?? 0),
    forma_pagamento: r.forma_pagamento as Compra['forma_pagamento'],
    vendedor_nome: String(r.vendedor_nome ?? ''),
    vendedor_contato: String(r.vendedor_contato ?? ''),
    origem: String(r.origem ?? ''),
    observacoes: String(r.observacoes ?? ''),
  }
}

export function compraToPb(c: Compra): Record<string, unknown> {
  return {
    id: c.id,
    data: c.data,
    veiculo: c.veiculo_id,
    valor_pago: c.valor_pago,
    forma_pagamento: c.forma_pagamento,
    vendedor_nome: c.vendedor_nome,
    vendedor_contato: c.vendedor_contato,
    origem: c.origem,
    observacoes: c.observacoes,
  }
}

export function vendaFromPb(r: RecordModel): Venda {
  return {
    id: r.id,
    data: String(r.data ?? ''),
    veiculo_id: relId(r.veiculo),
    comprador_nome: String(r.comprador_nome ?? ''),
    comprador_cpf: r.comprador_cpf ? String(r.comprador_cpf) : undefined,
    comprador_contato: String(r.comprador_contato ?? ''),
    valor_venda: Number(r.valor_venda ?? 0),
    forma_recebimento: r.forma_recebimento as Venda['forma_recebimento'],
    entrada: r.entrada != null ? Number(r.entrada) : undefined,
    parcelas: r.parcelas != null ? Number(r.parcelas) : undefined,
    observacoes: String(r.observacoes ?? ''),
  }
}

export function vendaToPb(v: Venda): Record<string, unknown> {
  return {
    id: v.id,
    data: v.data,
    veiculo: v.veiculo_id,
    comprador_nome: v.comprador_nome,
    comprador_cpf: v.comprador_cpf ?? '',
    comprador_contato: v.comprador_contato,
    valor_venda: v.valor_venda,
    forma_recebimento: v.forma_recebimento,
    entrada: v.entrada ?? null,
    parcelas: v.parcelas ?? null,
    observacoes: v.observacoes,
  }
}

export function despesaFromPb(r: RecordModel): Despesa {
  return {
    id: r.id,
    data: String(r.data ?? ''),
    tipo: r.tipo as Despesa['tipo'],
    descricao: String(r.descricao ?? ''),
    valor: Number(r.valor ?? 0),
    veiculo_id: optRelId(r.veiculo),
    pago: Boolean(r.pago),
    forma_pagamento: r.forma_pagamento as Despesa['forma_pagamento'],
    pago_por: String(r.pago_por ?? ''),
    reembolsado: Boolean(r.reembolsado),
  }
}

export function despesaToPb(d: Despesa): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: d.id,
    data: d.data,
    tipo: d.tipo,
    descricao: d.descricao,
    valor: d.valor,
    pago: d.pago,
    forma_pagamento: d.forma_pagamento,
    pago_por: d.pago_por,
    reembolsado: d.reembolsado ?? false,
  }
  if (d.veiculo_id) body.veiculo = d.veiculo_id
  return body
}

export function configuracoesFromPb(r: RecordModel): Configuracoes {
  return {
    nome_revenda: normalizarNomeRevenda(r.nome_revenda),
    socios: [...normalizarListaSocios(Array.isArray(r.socios) ? (r.socios as string[]) : [])],
    meta_lucro_mensal: Number(r.meta_lucro_mensal ?? 0),
    capital_inicial_pessoal: Number(
      r.capital_inicial_pessoal ?? 38000,
    ),
  }
}

export function configuracoesToPb(c: Configuracoes): Record<string, unknown> {
  return {
    slug: 'default',
    nome_revenda: c.nome_revenda,
    socios: Array.isArray(c.socios) ? c.socios : [],
    meta_lucro_mensal: c.meta_lucro_mensal,
    capital_inicial_pessoal: c.capital_inicial_pessoal,
  }
}

export function simulacaoFromPb(r: RecordModel): SimulacaoNegocio {
  return {
    id: r.id,
    titulo: String(r.titulo ?? ''),
    data: String(r.data ?? ''),
    preco_compra: Number(r.preco_compra ?? 0),
    valor_fipe: Number(r.valor_fipe ?? 0),
    preco_venda: Number(r.preco_venda ?? 0),
    despesas_estimadas: Number(r.despesas_estimadas ?? 0),
    observacoes: String(r.observacoes ?? ''),
  }
}

export function simulacaoToPb(s: SimulacaoNegocio): Record<string, unknown> {
  return {
    id: s.id,
    titulo: s.titulo || null,
    data: s.data,
    preco_compra: s.preco_compra,
    valor_fipe: s.valor_fipe || null,
    preco_venda: s.preco_venda,
    despesas_estimadas: s.despesas_estimadas || null,
    observacoes: s.observacoes || null,
  }
}
