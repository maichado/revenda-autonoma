import type { Despesa, StatusVeiculo, TipoDespesa, Veiculo } from '@/types'

/** Limite do campo `fotos` (json) no PocketBase — ver pocketbase/pb_schema.json */
export const PB_FOTOS_JSON_MAX_BYTES = 2_000_000

const STATUS_ALIASES: Record<string, StatusVeiculo> = {
  'em preparação': 'em preparação',
  'em preparacao': 'em preparação',
  preparação: 'em preparação',
  preparacao: 'em preparação',
  disponível: 'disponível',
  disponivel: 'disponível',
  reservado: 'reservado',
  vendido: 'vendido',
}

const TIPO_DESPESA_ALIASES: Record<string, TipoDespesa> = {
  manutenção: 'manutenção',
  manutencao: 'manutenção',
  documentação: 'documentação',
  documentacao: 'documentação',
  detalhamento: 'detalhamento',
  frete: 'frete',
  taxa: 'taxa',
  marketing: 'marketing',
  outros: 'outros',
}

/** Normaliza datas para yyyy-MM-dd (máx. 10 chars no PB). */
export function normalizarDataPb(valor: string): string {
  const bruto = String(valor ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(bruto)) return bruto.slice(0, 10)
  const parsed = new Date(bruto)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return bruto.slice(0, 10)
}

export function normalizarStatusVeiculo(status: unknown): StatusVeiculo {
  const chave = String(status ?? 'disponível')
    .trim()
    .toLowerCase()
  return STATUS_ALIASES[chave] ?? 'disponível'
}

export function normalizarTipoDespesa(tipo: unknown): TipoDespesa {
  const chave = String(tipo ?? 'outros')
    .trim()
    .toLowerCase()
  return TIPO_DESPESA_ALIASES[chave] ?? 'outros'
}

/**
 * Prepara veículo para create no PocketBase durante importação.
 * Fotos em base64 costumam exceder o limite JSON de 2MB — omitimos na importação.
 */
export function prepareVeiculoParaImportPb(v: Veiculo): {
  veiculo: Veiculo
  fotosOmitidas: number
} {
  const fotosOmitidas = Array.isArray(v.fotos) ? v.fotos.length : 0
  return {
    veiculo: {
      ...v,
      placa: String(v.placa ?? '').trim(),
      marca: String(v.marca ?? '').trim(),
      modelo: String(v.modelo ?? '').trim(),
      ano: Math.round(Number(v.ano ?? 0)),
      cor: String(v.cor ?? ''),
      quilometragem: Math.round(Number(v.quilometragem ?? 0)),
      data_compra: normalizarDataPb(v.data_compra),
      data_anuncio: v.data_anuncio
        ? normalizarDataPb(v.data_anuncio)
        : undefined,
      valor_compra: Number(v.valor_compra ?? 0),
      valor_fipe: v.valor_fipe != null ? Number(v.valor_fipe) : undefined,
      valor_venda_pretendido: Number(v.valor_venda_pretendido ?? 0),
      status: normalizarStatusVeiculo(v.status),
      observacoes: String(v.observacoes ?? '').slice(0, 5000),
      fotos: [],
      despesas_vinculadas: [],
    },
    fotosOmitidas,
  }
}

export function prepareDespesaParaImportPb(d: Despesa): Despesa {
  return {
    ...d,
    data: normalizarDataPb(d.data),
    tipo: normalizarTipoDespesa(d.tipo),
    descricao: String(d.descricao ?? '').slice(0, 500),
    valor: Number(d.valor ?? 0),
    pago_por: d.pago_por ?? '',
    reembolsado: d.reembolsado ?? false,
  }
}
