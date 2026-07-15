import type {

  Compra,

  Configuracoes,

  Despesa,

  SimulacaoNegocio,

  Veiculo,

  Venda,

} from '@/types'

import type { RecordModel } from 'pocketbase'
import type { EstadoImportavel } from '@/store/useStore'
import { CONFIGURACOES_PADRAO } from '@/constants/configuracoesPadrao'

import { pb } from '@/lib/pocketbase'

import {
  isPbId,
  preparePbCreateBody,
  preparePbImportCreateBody,
  remapEstadoIdsParaPb,
} from '@/lib/pbIds'

import {

  compraFromPb,

  compraToPb,

  configuracoesFromPb,

  configuracoesToPb,

  despesaFromPb,

  despesaToPb,

  simulacaoFromPb,

  simulacaoToPb,

  veiculoFromPb,

  veiculoToPb,

  vendaFromPb,

  vendaToPb,

} from '@/lib/pbMappers'

import {

  normalizarDataPb,

  prepareDespesaParaImportPb,

  prepareVeiculoParaImportPb,

} from '@/lib/pbImportPrep'



const CONFIG_SLUG = 'default'



export class PbOfflineError extends Error {
  constructor(message = 'Servidor PocketBase indisponível.') {
    super(message)
    this.name = 'PbOfflineError'
  }
}

export class PbSyncRequiredError extends Error {
  constructor(
    message = 'Faça login para salvar dados no servidor PocketBase.',
  ) {
    super(message)
    this.name = 'PbSyncRequiredError'
  }
}



export class PbCollectionMissingError extends Error {

  constructor(

    message = 'Collections do PocketBase não foram importadas. Rode .\\scripts\\setup-pocketbase.ps1 ou importe pocketbase/pb_schema.json em Settings → Import collections.',

  ) {

    super(message)

    this.name = 'PbCollectionMissingError'

  }

}



export class PbImportError extends Error {

  constructor(

    message: string,

    public readonly etapa?: string,

  ) {

    super(message)

    this.name = 'PbImportError'

  }

}



function pbFieldErrors(err: unknown): string[] {

  if (!err || typeof err !== 'object') return []

  const e = err as {

    response?: { data?: Record<string, unknown> }

  }

  const data = e.response?.data

  if (!data || typeof data !== 'object') return []

  return Object.entries(data)

    .map(([field, val]) => {

      if (val && typeof val === 'object' && 'message' in val) {

        const msg = String((val as { message?: string }).message ?? '').trim()

        return msg ? `${field}: ${msg}` : ''

      }

      return ''

    })

    .filter(Boolean)

}



function pbErrorMessage(err: unknown): string {

  const fieldMsgs = pbFieldErrors(err)

  if (fieldMsgs.length > 0) return fieldMsgs.join('; ')

  if (err && typeof err === 'object') {

    const e = err as {

      message?: string

      response?: { message?: string }

    }

    return String(e.message || e.response?.message || '')

  }

  return ''

}



export function formatPbError(err: unknown): string {
  if (
    err instanceof PbOfflineError ||
    err instanceof PbCollectionMissingError ||
    err instanceof PbSyncRequiredError
  ) {
    return err.message
  }

  if (isCollectionMissingError(err)) {
    return 'Collection não encontrada no PocketBase. Rode .\\scripts\\atualizar-schema.ps1 para atualizar o banco (inclui simulacoes).'
  }

  if (err instanceof TypeError) {
    return 'Servidor PocketBase indisponível. Inicie .\\scripts\\start-pocketbase.ps1'
  }

  if (err instanceof PbImportError) {

    return err.etapa ? `${err.etapa}: ${err.message}` : err.message

  }

  if (err && typeof err === 'object' && 'status' in err) {

    const status = (err as { status: number }).status

    const data = (err as { response?: { data?: Record<string, unknown> } })

      .response?.data

    const msg = pbErrorMessage(err)

    const semDetalhes =

      !data || typeof data !== 'object' || Object.keys(data).length === 0

    if (status === 400 && semDetalhes) {

      if (msg === 'Failed to create record.') {

        return 'Permissão negada ou sessão expirada. Faça login novamente.'

      }

      if (msg === 'Something went wrong while processing your request.') {

        return 'Erro ao consultar o servidor. Atualize o schema com .\\scripts\\setup-pocketbase.ps1'

      }

    }

    if (msg) return msg

  }

  const msg = pbErrorMessage(err)

  if (msg) return msg

  if (err instanceof Error) return err.message

  return 'Erro desconhecido ao comunicar com o servidor.'

}



export function isCollectionMissingError(err: unknown): boolean {

  const msg = pbErrorMessage(err).toLowerCase()

  return (

    msg.includes('missing or invalid collection') ||

    msg.includes('collection context')

  )

}



function isNetworkError(err: unknown): boolean {

  if (err instanceof TypeError) return true

  if (err && typeof err === 'object' && 'status' in err) {

    const status = (err as { status: number }).status

    return status === 0 || status >= 500

  }

  return false

}



export async function checkPbHealth(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    try {
      await pb.health.check({ signal: ctrl.signal })
      return true
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return false
  }
}

const FETCH_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new PbOfflineError(`${label} demorou demais. Verifique o PocketBase.`)),
      ms,
    )
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}



export async function fetchAllData(): Promise<
  EstadoImportavel & {
    simulacoesColecaoOk: boolean
  }
> {
  try {
    let simulacoesRes: RecordModel[] = []
    let simulacoesColecaoOk = true

    try {
      simulacoesRes = await pb
        .collection('simulacoes')
        .getFullList({ sort: '-data' })
    } catch (err) {
      if (isCollectionMissingError(err)) {
        simulacoesColecaoOk = false
      } else {
        throw err
      }
    }

    const [veiculosRes, comprasRes, vendasRes, despesasRes, configRes] =
      await withTimeout(
        Promise.all([
          pb.collection('veiculos').getFullList({ sort: '-data_compra' }),
          pb.collection('compras').getFullList({ sort: '-data' }),
          pb.collection('vendas').getFullList({ sort: '-data' }),
          pb.collection('despesas').getFullList({ sort: '-data' }),
          pb
            .collection('configuracoes')
            .getList(1, 1, { filter: `slug = "${CONFIG_SLUG}"` })
            .catch(() => ({ items: [] as never[] })),
        ]),
        FETCH_TIMEOUT_MS,
        'Carregamento dos dados',
      )



    const configuracoes =

      configRes.items.length > 0

        ? configuracoesFromPb(configRes.items[0])

        : { ...CONFIGURACOES_PADRAO }



    return {

      veiculos: veiculosRes.map(veiculoFromPb),

      compras: comprasRes.map(compraFromPb),

      vendas: vendasRes.map(vendaFromPb),

      despesas: despesasRes.map(despesaFromPb),

      simulacoes: simulacoesRes.map(simulacaoFromPb),

      configuracoes,

      simulacoesColecaoOk,
    }

  } catch (err) {

    if (isCollectionMissingError(err)) {

      throw new PbCollectionMissingError()

    }

    throw err

  }

}



export async function syncVeiculoCreate(v: Veiculo): Promise<void> {

  await pb.collection('veiculos').create(preparePbCreateBody(veiculoToPb(v)))

}



export async function syncVeiculoUpdate(

  id: string,

  patch: Partial<Veiculo>,

): Promise<void> {

  const atual = await pb.collection('veiculos').getOne(id)

  const merged = { ...veiculoFromPb(atual), ...patch }

  await pb.collection('veiculos').update(id, veiculoToPb(merged))

}



export async function syncVeiculoDelete(id: string): Promise<void> {

  await pb.collection('veiculos').delete(id)

}



export async function syncCompraCreate(c: Compra): Promise<void> {

  await pb.collection('compras').create(preparePbCreateBody(compraToPb(c)))

}



export async function syncCompraUpdate(

  id: string,

  patch: Partial<Compra>,

): Promise<void> {

  const atual = await pb.collection('compras').getOne(id)

  const merged = { ...compraFromPb(atual), ...patch }

  await pb.collection('compras').update(id, compraToPb(merged))

}



export async function syncCompraDelete(id: string): Promise<void> {

  await pb.collection('compras').delete(id)

}



export async function syncVendaCreate(v: Venda): Promise<void> {

  await pb.collection('vendas').create(preparePbCreateBody(vendaToPb(v)))

}



export async function syncVendaUpdate(

  id: string,

  patch: Partial<Venda>,

): Promise<void> {

  const atual = await pb.collection('vendas').getOne(id)

  const merged = { ...vendaFromPb(atual), ...patch }

  await pb.collection('vendas').update(id, vendaToPb(merged))

}



export async function syncVendaDelete(id: string): Promise<void> {

  await pb.collection('vendas').delete(id)

}



export async function syncDespesaCreate(d: Despesa): Promise<void> {

  const prepared = prepareDespesaParaImportPb(d)

  await pb

    .collection('despesas')

    .create(preparePbCreateBody(despesaToPb(prepared)))

}



export async function syncDespesaUpdate(

  id: string,

  patch: Partial<Despesa>,

): Promise<void> {

  const atual = await pb.collection('despesas').getOne(id)

  const merged = { ...despesaFromPb(atual), ...patch }

  const body = despesaToPb(merged)

  if (!patch.veiculo_id && merged.veiculo_id === undefined) {

    body.veiculo = null

  }

  await pb.collection('despesas').update(id, body)

}



export async function syncDespesaDelete(id: string): Promise<void> {

  await pb.collection('despesas').delete(id)

}



export async function syncSimulacaoCreate(s: SimulacaoNegocio): Promise<void> {
  try {
    await pb
      .collection('simulacoes')
      .create(preparePbCreateBody(simulacaoToPb(s)))
  } catch (err) {
    if (isCollectionMissingError(err)) {
      throw new PbCollectionMissingError(
        'Collection simulacoes não existe. Rode .\\scripts\\atualizar-schema.ps1 (uma vez).',
      )
    }
    throw err
  }
}

export async function syncSimulacaoDelete(id: string): Promise<void> {
  try {
    await pb.collection('simulacoes').delete(id)
  } catch (err) {
    if (isCollectionMissingError(err)) {
      throw new PbCollectionMissingError(
        'Collection simulacoes não existe. Rode .\\scripts\\atualizar-schema.ps1 (uma vez).',
      )
    }
    throw err
  }
}

export async function limparSimulacoesPb(): Promise<void> {
  try {
    const items = await pb.collection('simulacoes').getFullList({ fields: 'id' })
    for (const item of items) {
      await pb.collection('simulacoes').delete(item.id)
    }
  } catch (err) {
    if (isCollectionMissingError(err)) return
    throw err
  }
}



export async function syncConfiguracoes(c: Configuracoes): Promise<void> {

  const body = configuracoesToPb(c)

  const existing = await pb

    .collection('configuracoes')

    .getList(1, 1, { filter: `slug = "${CONFIG_SLUG}"` })

  if (existing.items.length > 0) {

    await pb.collection('configuracoes').update(existing.items[0].id, body)

  } else {

    await pb.collection('configuracoes').create(body)

  }

}



/** Substitui todos os dados no servidor (migração do localStorage / importação de backup). */

export async function importarParaPb(estado: EstadoImportavel): Promise<void> {
  const dados = remapEstadoIdsParaPb(estado)
  let fotosOmitidasTotal = 0
  console.info(
    '[PB] Importando backup:',
    dados.veiculos.length,
    'veículos,',
    dados.compras.length,
    'compras,',
    dados.vendas.length,
    'vendas,',
    dados.despesas.length,
    'despesas',
  )

  const idMap = new Map<string, string>()



  const resolveRelId = (rawId: string, contexto: string): string => {
    const mapped = idMap.get(rawId)
    if (mapped) return mapped
    throw new PbImportError(
      `referência "${rawId}" não corresponde a nenhum registro importado`,
      contexto,
    )
  }



  const ordemDelete = ['simulacoes', 'despesas', 'compras', 'vendas', 'veiculos'] as const

  for (const col of ordemDelete) {

    try {

      const items = await pb.collection(col).getFullList({ fields: 'id' })

      for (const item of items) {

        await pb.collection(col).delete(item.id)

      }

    } catch (err) {

      if (isCollectionMissingError(err)) throw new PbCollectionMissingError()

      throw new PbImportError(

        formatPbError(err) || `falha ao limpar registros existentes`,

        `Limpar ${col}`,

      )

    }

  }



  for (const v of dados.veiculos) {

    try {

      const { veiculo, fotosOmitidas } = prepareVeiculoParaImportPb(v)

      fotosOmitidasTotal += fotosOmitidas

      const body = preparePbImportCreateBody(veiculoToPb(veiculo))

      const created = await pb.collection('veiculos').create(body)

      idMap.set(v.id, created.id)

    } catch (err) {

      throw new PbImportError(

        formatPbError(err) || 'falha ao criar veículo',

        `Veículo ${v.placa || v.id}`,

      )

    }

  }



  for (const c of dados.compras) {

    try {

      const veiculoId = resolveRelId(c.veiculo_id, `Compra ${c.id}`)

      const body = preparePbImportCreateBody(

        compraToPb({ ...c, veiculo_id: veiculoId, data: normalizarDataPb(c.data) }),

      )

      const created = await pb.collection('compras').create(body)

      idMap.set(c.id, created.id)

    } catch (err) {

      if (err instanceof PbImportError) throw err

      throw new PbImportError(

        formatPbError(err) || 'falha ao criar compra',

        `Compra ${c.id}`,

      )

    }

  }



  for (const v of dados.vendas) {

    try {

      const veiculoId = resolveRelId(v.veiculo_id, `Venda ${v.id}`)

      const body = preparePbImportCreateBody(

        vendaToPb({ ...v, veiculo_id: veiculoId, data: normalizarDataPb(v.data) }),

      )

      const created = await pb.collection('vendas').create(body)

      idMap.set(v.id, created.id)

    } catch (err) {

      if (err instanceof PbImportError) throw err

      throw new PbImportError(

        formatPbError(err) || 'falha ao criar venda',

        `Venda ${v.id}`,

      )

    }

  }



  for (const d of dados.despesas) {

    try {

      const veiculoId = d.veiculo_id

        ? resolveRelId(d.veiculo_id, `Despesa ${d.descricao || d.id}`)

        : undefined

      const body = preparePbImportCreateBody(

        despesaToPb(prepareDespesaParaImportPb({ ...d, veiculo_id: veiculoId })),

      )

      const created = await pb.collection('despesas').create(body)

      idMap.set(d.id, created.id)

    } catch (err) {

      if (err instanceof PbImportError) throw err

      throw new PbImportError(

        formatPbError(err) || 'falha ao criar despesa',

        `Despesa ${d.descricao || d.id}`,

      )

    }

  }



  for (const v of dados.veiculos) {

    const pbId = idMap.get(v.id)

    if (!pbId) continue

    const despesasVinc = v.despesas_vinculadas

      .map((dId) => idMap.get(dId) ?? dId)

      .filter((dId) => isPbId(dId))

    if (despesasVinc.length !== v.despesas_vinculadas.length) continue

    try {

      await pb.collection('veiculos').update(pbId, {

        despesas_vinculadas: despesasVinc,

      })

    } catch (err) {

      throw new PbImportError(

        formatPbError(err) || 'falha ao vincular despesas ao veículo',

        `Veículo ${v.placa || v.id}`,

      )

    }

  }



  if (fotosOmitidasTotal > 0) {

    console.warn(

      `[PB] Importação: ${fotosOmitidasTotal} foto(s) omitida(s) — limite JSON de 2MB no PocketBase.`,

    )

  }



  try {

    await syncConfiguracoes(dados.configuracoes)

  } catch (err) {

    throw new PbImportError(

      formatPbError(err) || 'falha ao salvar configurações',

      'Configurações',

    )

  }

}



export async function syncVeiculoDeleteCascade(

  veiculoId: string,

  compraIds: string[],

  vendaIds: string[],

  despesaIds: string[],

): Promise<void> {

  for (const id of compraIds) await syncCompraDelete(id)

  for (const id of vendaIds) await syncVendaDelete(id)

  for (const id of despesaIds) {

    await syncDespesaUpdate(id, { veiculo_id: undefined })

  }

  await syncVeiculoDelete(veiculoId)

}



export function handlePbSyncError(
  err: unknown,
  onOffline: () => void,
): void {
  if (isNetworkError(err)) {
    onOffline()
    console.warn('[PB] Servidor offline — alteração não persistida.', err)
    return
  }
  console.error('[PB] Erro ao sincronizar:', err)
}

