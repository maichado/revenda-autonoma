// Utilitários de backup do estado completo do app (Configurações → Backup).
//
// Formato do arquivo gerado/aceito:
//
//   {
//     "appName": "rvd-autonoma",
//     "appVersion": "0.1.0",          // versão do package.json
//     "schemaVersion": 6,             // versão do schema (igual à STORE_VERSION)
//     "exportadoEm": "ISO date-time",
//     "estado": {
//       "veiculos":      Veiculo[],
//       "compras":       Compra[],
//       "vendas":        Venda[],
//       "despesas":      Despesa[],
//       "configuracoes": Configuracoes
//     }
//   }
//
// Observações:
//   • Preferências locais (tema, sidebar) NÃO entram no backup — são
//     do dispositivo, não dos dados do usuário.
//   • A importação valida que o arquivo NÃO É de uma versão MAIS NOVA que
//     a que o app sabe ler. Versões mais antigas são aceitas e a migração
//     do middleware `persist` é reaproveitada via reload da página.
//   • Quando a versão é igual à atual, aplicamos sem reload (UX melhor).

import { format } from 'date-fns'
import { APP_SLUG, NOME_REVENDA_PADRAO, SLUG_ARQUIVO_REVENDA, normalizarNomeRevenda } from '@/constants/marca'
import { consumirFlagBackupLegada } from '@/constants/storage'
import { normalizarListaSocios } from '@/utils/socios'
import type {
  Compra,
  Configuracoes,
  Despesa,
  TipoPropriedade,
  Veiculo,
  Venda,
} from '@/types'
import {
  STORE_VERSION,
  useStore,
  type EstadoImportavel,
} from '@/store/useStore'
import { checkPbHealth } from '@/lib/pbApi'
import {
  normalizarDataPb,
  normalizarStatusVeiculo,
  normalizarTipoDespesa,
} from '@/lib/pbImportPrep'
import { pb } from '@/lib/pocketbase'
import { isPbSyncEnabled } from '@/store/pbSyncBridge'

const APP_NAME = APP_SLUG
const APP_VERSION = '0.1.0'

export interface ArquivoBackup {
  appName: string
  appVersion: string
  schemaVersion: number
  exportadoEm: string
  estado: EstadoImportavel
}

// -----------------------------------------------------------------------------
// EXPORTAÇÃO ------------------------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Monta o objeto serializável (sem disparar download). Útil para testes /
 * para o próprio cálculo de tamanho de backup.
 */
export function montarBackup(): ArquivoBackup {
  const s = useStore.getState()
  return {
    appName: APP_NAME,
    appVersion: APP_VERSION,
    schemaVersion: STORE_VERSION,
    exportadoEm: new Date().toISOString(),
    estado: {
      veiculos: s.veiculos,
      compras: s.compras,
      vendas: s.vendas,
      despesas: s.despesas,
      configuracoes: s.configuracoes,
    },
  }
}

/**
 * Dispara o download do backup completo em JSON.
 * Nome do arquivo: backup_mgrevenda_YYYY-MM-DD_HHmm.json (spec).
 */
export function exportarEstadoJSON(): string {
  const backup = montarBackup()
  const conteudo = JSON.stringify(backup, null, 2)
  const blob = new Blob([conteudo], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const stamp = format(new Date(), "yyyy-MM-dd_HHmm")
  const nomeArquivo = `backup_${SLUG_ARQUIVO_REVENDA}_${stamp}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Libera o objeto URL no próximo tick.
  setTimeout(() => URL.revokeObjectURL(url), 0)

  return nomeArquivo
}

// -----------------------------------------------------------------------------
// IMPORTAÇÃO ------------------------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Erro de domínio para a importação — mensagens já amigáveis e em PT,
 * prontas para serem exibidas no toast pelo componente.
 */
export class ErroBackupInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroBackupInvalido'
  }
}

/**
 * Lê + valida o conteúdo de um arquivo escolhido pelo usuário no <input>.
 * Não altera o estado do app — quem chama decide o que fazer com o backup
 * retornado (mostrar confirmação, então chamar `aplicarBackup`).
 */
export function importarEstadoJSON(
  arquivo: File,
): Promise<ArquivoBackup> {
  return new Promise((resolve, reject) => {
    if (!arquivo) {
      reject(new ErroBackupInvalido('Nenhum arquivo selecionado.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () =>
      reject(new ErroBackupInvalido('Não foi possível ler o arquivo.'))
    reader.onload = () => {
      try {
        const texto = String(reader.result ?? '')
        const obj = JSON.parse(texto) as unknown
        const backup = validarBackup(obj)
        resolve(backup)
      } catch (e) {
        if (e instanceof ErroBackupInvalido) {
          reject(e)
        } else {
          reject(
            new ErroBackupInvalido(
              'Arquivo inválido — não é um JSON válido de backup.',
            ),
          )
        }
      }
    }
    reader.readAsText(arquivo)
  })
}

/**
 * Aplica um backup VALIDADO ao estado do app via PocketBase.
 * Preferências locais (tema, sidebar) são preservadas.
 */
export async function aplicarBackup(backup: ArquivoBackup): Promise<void> {
  const online = await checkPbHealth()

  if (!online) {
    throw new ErroBackupInvalido(
      'PocketBase offline. Inicie .\\scripts\\start-pocketbase.ps1 e tente novamente.',
    )
  }
  if (!isPbSyncEnabled()) {
    throw new ErroBackupInvalido(
      'Faça login antes de importar — os dados são salvos no PocketBase.',
    )
  }
  if (!pb.authStore.isValid) {
    throw new ErroBackupInvalido(
      'Sessão expirada. Faça login novamente antes de importar.',
    )
  }

  try {
    await useStore.getState().importarEstado(backup.estado)
  } catch (err) {
    console.error('[Backup] Falha ao importar para PocketBase:', err)
    throw err
  }
}

// -----------------------------------------------------------------------------
// Validação detalhada — produz mensagens úteis em PT.
// -----------------------------------------------------------------------------
function validarBackup(obj: unknown): ArquivoBackup {
  if (!obj || typeof obj !== 'object') {
    throw new ErroBackupInvalido('Arquivo de backup vazio ou ilegível.')
  }
  const candidato = obj as Partial<ArquivoBackup>

  if (typeof candidato.schemaVersion !== 'number') {
    throw new ErroBackupInvalido(
      `Arquivo sem versão do schema — não parece ser um backup do ${NOME_REVENDA_PADRAO}.`,
    )
  }
  if (candidato.schemaVersion > STORE_VERSION) {
    throw new ErroBackupInvalido(
      `Backup é de uma versão mais nova (v${candidato.schemaVersion}) do que esta instalação suporta (v${STORE_VERSION}). Atualize o app antes de importar.`,
    )
  }

  const estado = candidato.estado as Partial<EstadoImportavel> | undefined
  if (!estado || typeof estado !== 'object') {
    throw new ErroBackupInvalido(
      'Arquivo sem o bloco "estado" — backup inválido.',
    )
  }
  if (!Array.isArray(estado.veiculos)) {
    throw new ErroBackupInvalido('Estado inválido: "veiculos" não é um array.')
  }
  if (!Array.isArray(estado.compras)) {
    throw new ErroBackupInvalido('Estado inválido: "compras" não é um array.')
  }
  if (!Array.isArray(estado.vendas)) {
    throw new ErroBackupInvalido('Estado inválido: "vendas" não é um array.')
  }
  if (!Array.isArray(estado.despesas)) {
    throw new ErroBackupInvalido('Estado inválido: "despesas" não é um array.')
  }
  if (!estado.configuracoes || typeof estado.configuracoes !== 'object') {
    throw new ErroBackupInvalido('Estado inválido: "configuracoes" ausente.')
  }
  if (typeof (estado.configuracoes as Configuracoes).nome_revenda !== 'string') {
    throw new ErroBackupInvalido(
      'Configurações sem o campo "nome_revenda" — backup inválido.',
    )
  }

  return {
    appName: typeof candidato.appName === 'string' ? candidato.appName : APP_NAME,
    appVersion:
      typeof candidato.appVersion === 'string'
        ? candidato.appVersion
        : APP_VERSION,
    schemaVersion: candidato.schemaVersion,
    exportadoEm:
      typeof candidato.exportadoEm === 'string'
        ? candidato.exportadoEm
        : new Date().toISOString(),
    estado: normalizarEstadoBackup(estado),
  }
}

/** Normaliza campos opcionais/ausentes em backups legados antes da importação. */
function normalizarEstadoBackup(
  estado: Partial<EstadoImportavel>,
): EstadoImportavel {
  const veiculoIds = new Set(
    (estado.veiculos ?? []).map((v) => String((v as Veiculo).id ?? '')),
  )
  const despesaIds = new Set(
    (estado.despesas ?? []).map((d) => String((d as Despesa).id ?? '')),
  )

  const veiculos = (estado.veiculos ?? []).map((raw) => {
    const v = raw as Veiculo
    return {
      ...v,
      id: String(v.id ?? ''),
      placa: String(v.placa ?? ''),
      marca: String(v.marca ?? ''),
      modelo: String(v.modelo ?? ''),
      ano: Number(v.ano ?? 0),
      cor: String(v.cor ?? ''),
      quilometragem: Number(v.quilometragem ?? 0),
      data_compra: normalizarDataPb(String(v.data_compra ?? '')),
      valor_compra: Number(v.valor_compra ?? 0),
      valor_venda_pretendido: Number(v.valor_venda_pretendido ?? 0),
      status: normalizarStatusVeiculo(v.status),
      tipo_propriedade: (v.tipo_propriedade === 'meia'
        ? 'meia'
        : 'solo') as TipoPropriedade,
      socio_parceiro: v.socio_parceiro ? String(v.socio_parceiro) : undefined,
      observacoes: String(v.observacoes ?? ''),
      fotos: Array.isArray(v.fotos) ? v.fotos : [],
      despesas_vinculadas: Array.isArray(v.despesas_vinculadas)
        ? v.despesas_vinculadas.filter((dId) => despesaIds.has(dId))
        : [],
    }
  })

  const compras = (estado.compras ?? []).map((raw) => {
    const c = raw as Compra
    const veiculoId = String(c.veiculo_id ?? '')
    if (veiculoId && !veiculoIds.has(veiculoId)) {
      throw new ErroBackupInvalido(
        `Compra "${c.id}" referencia veículo inexistente (${veiculoId}).`,
      )
    }
    return {
      ...c,
      id: String(c.id ?? ''),
      data: normalizarDataPb(String(c.data ?? '')),
      veiculo_id: veiculoId,
      valor_pago: Number(c.valor_pago ?? 0),
      vendedor_nome: String(c.vendedor_nome ?? ''),
      vendedor_contato: String(c.vendedor_contato ?? ''),
      origem: String(c.origem ?? ''),
      observacoes: String(c.observacoes ?? ''),
    }
  })

  const vendas = (estado.vendas ?? []).map((raw) => {
    const v = raw as Venda
    const veiculoId = String(v.veiculo_id ?? '')
    if (veiculoId && !veiculoIds.has(veiculoId)) {
      throw new ErroBackupInvalido(
        `Venda "${v.id}" referencia veículo inexistente (${veiculoId}).`,
      )
    }
    return {
      ...v,
      id: String(v.id ?? ''),
      data: normalizarDataPb(String(v.data ?? '')),
      veiculo_id: veiculoId,
      comprador_nome: String(v.comprador_nome ?? ''),
      comprador_contato: String(v.comprador_contato ?? ''),
      valor_venda: Number(v.valor_venda ?? 0),
      observacoes: String(v.observacoes ?? ''),
    }
  })

  const despesas = (estado.despesas ?? []).map((raw) => {
    const d = raw as Despesa
    const veiculoId = d.veiculo_id ? String(d.veiculo_id) : undefined
    if (veiculoId && !veiculoIds.has(veiculoId)) {
      throw new ErroBackupInvalido(
        `Despesa "${d.descricao || d.id}" referencia veículo inexistente (${veiculoId}).`,
      )
    }
    return {
      ...d,
      id: String(d.id ?? ''),
      data: normalizarDataPb(String(d.data ?? '')),
      descricao: String(d.descricao ?? ''),
      valor: Number(d.valor ?? 0),
      veiculo_id: veiculoId,
      pago: Boolean(d.pago),
      pago_por: d.pago_por ?? '',
      reembolsado: Boolean(d.reembolsado),
      tipo: normalizarTipoDespesa(d.tipo),
    }
  })

  const cfg = estado.configuracoes as Configuracoes
  return {
    veiculos,
    compras,
    vendas,
    despesas,
    configuracoes: {
      nome_revenda: normalizarNomeRevenda(cfg.nome_revenda),
      socios: [...normalizarListaSocios(Array.isArray(cfg.socios) ? cfg.socios : [])],
      meta_lucro_mensal: Number(cfg.meta_lucro_mensal ?? 0),
      capital_inicial_pessoal: Number(cfg.capital_inicial_pessoal ?? 38000),
    },
  }
}

// -----------------------------------------------------------------------------
// TAMANHO ATUAL DO ESTADO -----------------------------------------------------
// -----------------------------------------------------------------------------

/**
 * Retorna o tamanho aproximado do estado em KB (dados em memória / servidor).
 */
export function calcularTamanhoEstado(): number {
  const bruto = JSON.stringify(montarBackup().estado)
  const bytes = new TextEncoder().encode(bruto).length
  return bytes / 1024
}

/**
 * Lê (e consome) a flag de "acabamos de aplicar um backup" gravada por
 * `aplicarBackup` antes do reload. Permite ao componente exibir o toast
 * mesmo após o refresh.
 */
export function consumirFlagBackupAplicado(): boolean {
  return consumirFlagBackupLegada()
}
