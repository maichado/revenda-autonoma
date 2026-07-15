import type { Despesa } from '@/types'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import {
  normalizarNomeSocio,
  resolverNomeSocio,
  correspondeSocio,
  socioPrincipal,
  sociosAtivos,
} from '@/utils/socios'

/** De onde saiu o dinheiro da despesa. */
export type OrigemDespesa = 'revenda' | 'pessoal'

export const ORIGENS_DESPESA: OrigemDespesa[] = ['revenda', 'pessoal']

export const PESSOA_PESSOAL_OUTRO = '__outro__'

export function valorPagoPorOrigem(
  origem: OrigemDespesa,
  nomeRevenda: string,
  pessoaPessoal: string,
): string {
  if (origem === 'revenda') return rotuloCaixaRevenda(nomeRevenda)
  return pessoaPessoal.trim()
}

/** Despesas cujo `pago_por` deve usar o rótulo atual do caixa da loja. */
export function remapPagoPorCaixaRevenda(
  despesas: Despesa[],
  nomeRevendaNovo: string,
  socios: string[],
  nomeRevendaAnterior?: string,
): Despesa[] {
  const novoRotulo = rotuloCaixaRevenda(nomeRevendaNovo)
  const anterior = nomeRevendaAnterior ?? nomeRevendaNovo

  return despesas.map((d) => {
    const eraCaixa =
      resolverOrigemDespesa(d.pago_por, anterior, socios) === 'revenda' ||
      resolverOrigemDespesa(d.pago_por, nomeRevendaNovo, socios) === 'revenda'
    if (!eraCaixa) return d
    if (d.pago_por === novoRotulo) return d
    return { ...d, pago_por: novoRotulo }
  })
}

export function rotuloCaixaRevenda(nomeRevenda: string): string {
  return `Caixa ${nomeRevenda.trim() || NOME_REVENDA_PADRAO}`
}

export function rotuloOrigemDespesa(
  origem: OrigemDespesa,
  nomeRevenda: string,
): string {
  return origem === 'revenda'
    ? rotuloCaixaRevenda(nomeRevenda)
    : 'Pessoal'
}

/** Resolve select + texto livre ao editar despesa pessoal. */
export function resolverPessoaPessoal(
  pagoPor: string | undefined,
  socios: string[],
): { select: string; outro: string } {
  const v = (pagoPor ?? '').trim()
  if (!v) return { select: socioPrincipal(socios), outro: '' }
  const cad = resolverNomeSocio(v, socios)
  if (cad) return { select: cad, outro: '' }
  return { select: PESSOA_PESSOAL_OUTRO, outro: v }
}

export function resolverPessoaPessoalForm(
  select: string,
  outro: string,
  socios: string[],
): string {
  if (select === PESSOA_PESSOAL_OUTRO) return outro.trim()
  return select.trim() || socioPrincipal(socios)
}

/** Infere a origem a partir do valor salvo em `pago_por` (inclui dados antigos). */
export function resolverOrigemDespesa(
  pagoPor: string | undefined,
  nomeRevenda: string,
  socios: string[],
): OrigemDespesa {
  const v = (pagoPor ?? '').trim()
  if (!v) return 'revenda'

  const norm = normalizarNomeSocio(v)
  const caixa = normalizarNomeSocio(rotuloCaixaRevenda(nomeRevenda))

  if (norm === caixa || norm.startsWith('caixa ')) return 'revenda'
  if (
    norm.includes('revenda') ||
    norm.includes('loja') ||
    norm === normalizarNomeSocio(nomeRevenda)
  ) {
    return 'revenda'
  }

  return 'pessoal'
}

export function rotuloExibicaoPagoPor(
  pagoPor: string | undefined,
  nomeRevenda: string,
  socios: string[],
): string {
  const origem = resolverOrigemDespesa(pagoPor, nomeRevenda, socios)
  if (origem === 'revenda') return rotuloCaixaRevenda(nomeRevenda)

  const nome = (pagoPor ?? '').trim()
  const cad = resolverNomeSocio(nome, socios)
  if (cad) return `Pessoal · ${cad}`
  if (nome) return `Pessoal · ${nome}`
  return 'Pessoal'
}

export function ehDespesaPessoal(
  pagoPor: string | undefined,
  nomeRevenda: string,
  socios: string[],
): boolean {
  return resolverOrigemDespesa(pagoPor, nomeRevenda, socios) === 'pessoal'
}

export function ehDespesaPessoalDono(
  pagoPor: string | undefined,
  socios: string[],
): boolean {
  const nome = (pagoPor ?? '').trim()
  if (!nome) return false
  return correspondeSocio(nome, [socioPrincipal(socios)])
}

/** Despesas que debitam o caixa da loja (cronológicas na simulação). */
export function despesasCaixaRevenda(
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
  apenasPagas = true,
): Despesa[] {
  return despesas.filter((d) => {
    if (apenasPagas && !d.pago) return false
    return resolverOrigemDespesa(d.pago_por, nomeRevenda, socios) === 'revenda'
  })
}

export function sociosParaDespesaPessoal(socios: string[]): string[] {
  return sociosAtivos(socios)
}

/** Valor interno do filtro para despesas pagas pelo caixa da loja. */
export const FILTRO_CAIXA_REVENDA = '__caixa_revenda__'

export interface OpcaoFiltroPagoPor {
  value: string
  label: string
}

/** Opções do filtro "Quem pagou" em Despesas. */
export function opcoesFiltroPagoPor(
  despesas: Despesa[],
  nomeRevenda: string,
  socios: string[],
): OpcaoFiltroPagoPor[] {
  const opts: OpcaoFiltroPagoPor[] = [
    {
      value: FILTRO_CAIXA_REVENDA,
      label: rotuloCaixaRevenda(nomeRevenda),
    },
  ]

  for (const s of sociosAtivos(socios)) {
    opts.push({ value: s, label: `Pessoal · ${s}` })
  }

  const nomesConhecidos = new Set(
    opts.map((o) => normalizarNomeSocio(o.value === FILTRO_CAIXA_REVENDA ? '' : o.value)),
  )

  for (const d of despesas) {
    if (resolverOrigemDespesa(d.pago_por, nomeRevenda, socios) !== 'pessoal') {
      continue
    }
    const bruto = (d.pago_por ?? '').trim()
    if (!bruto) continue
    const cad = resolverNomeSocio(bruto, socios)
    if (cad) continue
    const norm = normalizarNomeSocio(bruto)
    if (nomesConhecidos.has(norm)) continue
    nomesConhecidos.add(norm)
    opts.push({ value: bruto, label: `Pessoal · ${bruto}` })
  }

  return opts
}

export function correspondeFiltroPagoPor(
  pagoPor: string | undefined,
  filtro: string,
  nomeRevenda: string,
  socios: string[],
): boolean {
  if (!filtro) return true

  if (filtro === FILTRO_CAIXA_REVENDA) {
    return resolverOrigemDespesa(pagoPor, nomeRevenda, socios) === 'revenda'
  }

  const bruto = (pagoPor ?? '').trim()
  const cad = resolverNomeSocio(bruto, socios)
  const alvo = normalizarNomeSocio(filtro)
  if (cad && normalizarNomeSocio(cad) === alvo) return true
  return normalizarNomeSocio(bruto) === alvo
}
