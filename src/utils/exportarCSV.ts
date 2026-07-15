// Utilitário de exportação CSV — padrão BR (delimitador ";", encoding UTF-8 + BOM
// para abrir corretamente em Excel/LibreOffice em ambiente brasileiro).
//
// Usado pelo módulo Vendas, mas escrito de forma genérica para que outros
// módulos (Compras, Despesas...) possam reaproveitar no futuro.

import { format } from 'date-fns'
import { SLUG_ARQUIVO_REVENDA } from '@/constants/marca'
import type { Despesa, Veiculo, Venda } from '@/types'
import {
  calcularLucroVenda,
  calcularROIVenda,
} from './calculos'
import { formatarDataCurta } from './formatadores'

// -----------------------------------------------------------------------------
// Núcleo: serialização CSV "segura" (escapa aspas, quebra de linha, delimitador).
// -----------------------------------------------------------------------------

const DELIMITADOR = ';'
const QUEBRA = '\r\n'

/**
 * Escapa um valor para o CSV no padrão RFC 4180 simplificado:
 * envolve em aspas duplas quando contém o delimitador, aspas ou quebra de
 * linha; aspas duplas internas viram duas aspas duplas.
 */
function escaparCampo(valor: unknown): string {
  if (valor == null) return ''
  const texto = String(valor)
  const precisaAspas =
    texto.includes(DELIMITADOR) ||
    texto.includes('"') ||
    texto.includes('\n') ||
    texto.includes('\r')
  if (!precisaAspas) return texto
  return `"${texto.replace(/"/g, '""')}"`
}

/** Converte uma matriz de strings/números em uma string CSV completa. */
export function montarCSV(linhas: (string | number)[][]): string {
  return linhas.map((linha) => linha.map(escaparCampo).join(DELIMITADOR)).join(QUEBRA)
}

/**
 * Dispara o download de um arquivo CSV no navegador.
 * Prepende BOM (\uFEFF) para o Excel BR detectar UTF-8 corretamente.
 */
export function baixarCSV(nomeArquivo: string, conteudo: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Libera o objeto URL no próximo tick para garantir que o navegador já
  // iniciou o download antes da revogação.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// -----------------------------------------------------------------------------
// Formatação BR para CSV: número como "1234,56" (vírgula decimal).
// -----------------------------------------------------------------------------

function formatarNumeroBR(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return ''
  return valor
    .toFixed(casas)
    .replace('.', ',')
}

// -----------------------------------------------------------------------------
// Exportador específico do módulo Vendas
// -----------------------------------------------------------------------------

const CABECALHO_VENDAS = [
  'Data',
  'Placa',
  'Marca',
  'Modelo',
  'Ano',
  'Comprador',
  'CPF',
  'Contato',
  'Valor Venda',
  'Forma Recebimento',
  'Entrada',
  'Parcelas',
  'Lucro',
  'ROI (%)',
  'Observações',
]

/**
 * Exporta a listagem (já filtrada) de Vendas como CSV.
 * O cálculo de Lucro/ROI usa o veículo correspondente + despesas vinculadas.
 */
export function exportarVendasCSV(
  vendas: Venda[],
  veiculos: Veiculo[],
  despesas: Despesa[],
): void {
  const veiculosPorId: Record<string, Veiculo> = {}
  for (const v of veiculos) veiculosPorId[v.id] = v

  const linhas: (string | number)[][] = [CABECALHO_VENDAS]

  for (const venda of vendas) {
    const veic = veiculosPorId[venda.veiculo_id]
    const lucro = calcularLucroVenda(venda, veic, despesas)
    const roi = calcularROIVenda(venda, veic, despesas)

    linhas.push([
      formatarDataCurta(venda.data),
      veic?.placa ?? '',
      veic?.marca ?? '',
      veic?.modelo ?? '',
      veic?.ano ?? '',
      venda.comprador_nome,
      venda.comprador_cpf ?? '',
      venda.comprador_contato,
      formatarNumeroBR(venda.valor_venda),
      venda.forma_recebimento,
      venda.entrada != null ? formatarNumeroBR(venda.entrada) : '',
      venda.parcelas != null ? String(venda.parcelas) : '',
      formatarNumeroBR(lucro),
      formatarNumeroBR(roi, 1),
      venda.observacoes,
    ])
  }

  const conteudo = montarCSV(linhas)
  const hoje = format(new Date(), 'yyyy-MM-dd')
  baixarCSV(`vendas_${SLUG_ARQUIVO_REVENDA}_${hoje}.csv`, conteudo)
}
