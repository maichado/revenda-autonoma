import { ArrowLeftRight } from 'lucide-react'
import type { Veiculo, Venda } from '@/types'
import {
  composicaoVendaTroca,
  labelCurtoBem,
  origemTrocaDoVeiculo,
  rotuloParTroca,
  type ComposicaoVendaTroca,
  type ResumoTrocasPeriodo,
} from '@/utils/trocaVenda'
import { formatarDataCurta, formatarMoeda } from '@/utils/formatadores'

interface PropsVenda {
  /** Venda do veículo (ex.: Uno vendido). */
  venda?: Venda
  veiculosPorId: Record<string, Veiculo | undefined>
  /** `card` / `compact` / `relatorio` (detalhe completo para Relatórios). */
  variant?: 'card' | 'compact' | 'relatorio'
  /** Placa/modelo do veículo vendido (útil no relatório). */
  veiculoVendido?: Veiculo
}

interface PropsEstoqueTroca {
  /** Veículo que entrou por troca (ex.: BIZ no estoque). */
  veiculo: Veiculo
  vendaOrigem: Venda
  veiculoVendido?: Veiculo
  variant?: 'card' | 'compact'
}

function BlocoTrocaNaVenda({
  comp,
  variant,
  veiculoVendido,
}: {
  comp: ComposicaoVendaTroca
  variant: 'card' | 'compact' | 'relatorio'
  veiculoVendido?: Veiculo
}) {
  const nomeBem = comp.bemTroca
    ? labelCurtoBem(comp.bemTroca)
    : 'bem na troca'
  const placaBem = comp.bemTroca?.placa
  const tipoBem =
    comp.bemTroca?.categoria === 'moto'
      ? 'Moto'
      : comp.bemTroca
        ? 'Carro'
        : 'Bem'
  const nomeVendido = veiculoVendido
    ? `${veiculoVendido.marca} ${veiculoVendido.modelo}`.trim()
    : null

  if (variant === 'compact') {
    return (
      <p
        className="mt-0.5 flex flex-col gap-0.5 text-[11px] text-amber-700 dark:text-amber-300"
        title={`${formatarMoeda(comp.dinheiro)} + ${nomeBem} = ${formatarMoeda(comp.total)}`}
      >
        <span className="inline-flex items-center gap-1">
          <ArrowLeftRight size={11} />
          Entrou {nomeBem}
          {placaBem ? ` (${placaBem})` : ''}
        </span>
        <span className="tabular text-zinc-500 dark:text-zinc-400">
          {formatarMoeda(comp.dinheiro)} em dinheiro + {nomeBem}
        </span>
      </p>
    )
  }

  if (variant === 'relatorio') {
    return (
      <div className="rounded-lg border border-amber-500/35 bg-amber-500/5 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <ArrowLeftRight size={14} />
          Negócio com troca
        </p>
        {nomeVendido && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Veículo vendido:{' '}
            <span className="font-medium">
              {nomeVendido}
              {veiculoVendido?.placa ? ` · ${veiculoVendido.placa}` : ''}
            </span>
          </p>
        )}
        <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-3">
          <div className="rounded-md bg-white/60 px-2 py-1.5 dark:bg-black/20">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Dinheiro (realizado)
            </dt>
            <dd className="tabular font-semibold">
              {formatarMoeda(comp.dinheiro)}
            </dd>
          </div>
          <div className="rounded-md bg-white/60 px-2 py-1.5 dark:bg-black/20">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Valor da troca
            </dt>
            <dd className="tabular font-semibold">
              {formatarMoeda(comp.valorTroca)}
            </dd>
          </div>
          <div className="rounded-md bg-white/60 px-2 py-1.5 dark:bg-black/20">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
              Total do negócio
            </dt>
            <dd className="tabular font-semibold">
              {formatarMoeda(comp.total)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-200">
          Entrou no estoque:{' '}
          <span className="font-semibold">
            {tipoBem} {nomeBem}
            {placaBem ? ` · ${placaBem}` : ''}
          </span>
          {comp.bemTroca
            ? ` — ainda não vendido; resultado entra só na venda desse ${tipoBem.toLowerCase()}.`
            : ' — (cadastro do bem não encontrado na lista atual).'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
        <ArrowLeftRight size={12} />
        Troca na venda
      </p>
      <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-200">
        Entrou{' '}
        <span className="font-semibold">
          {nomeBem}
          {placaBem ? ` · ${placaBem}` : ''}
        </span>
      </p>
      <p className="mt-0.5 tabular text-[11px] text-zinc-500 dark:text-zinc-400">
        Venda em dinheiro:{' '}
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          {formatarMoeda(comp.dinheiro)}
        </span>
        {' · entrou '}
        {nomeBem}
        {' (estoque)'}
      </p>
    </div>
  )
}

/** No card/tabela do veículo VENDIDO: mostra o bem que entrou e a soma dinheiro + troca. */
export function TrocaNaVendaInfo({
  venda,
  veiculosPorId,
  variant = 'card',
  veiculoVendido,
}: PropsVenda) {
  const comp = composicaoVendaTroca(venda, veiculosPorId)
  if (!comp) return null
  return (
    <BlocoTrocaNaVenda
      comp={comp}
      variant={variant}
      veiculoVendido={veiculoVendido}
    />
  )
}

/** Painel agregado de trocas — Relatório de Vendas / Geral / Ganho a meia. */
export function PainelTrocasRelatorio({
  resumo,
  veiculosPorId,
  titulo = 'Trocas no período',
  subtitulo = 'Dinheiro realizado à parte do bem que entrou no estoque',
}: {
  resumo: ResumoTrocasPeriodo
  veiculosPorId: Record<string, Veiculo | undefined>
  titulo?: string
  subtitulo?: string
}) {
  if (resumo.quantidade === 0) return null

  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeftRight size={16} className="text-amber-600 dark:text-amber-400" />
            {titulo}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {subtitulo}
          </p>
        </div>
        <span className="badge bg-amber-500/15 text-amber-700 dark:text-amber-300">
          {resumo.quantidade}{' '}
          {resumo.quantidade === 1 ? 'venda com troca' : 'vendas com troca'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/[0.04]">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Dinheiro (caixa)
          </p>
          <p className="tabular text-sm font-semibold">
            {formatarMoeda(resumo.dinheiro)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/[0.04]">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Valor em trocas (estoque)
          </p>
          <p className="tabular text-sm font-semibold">
            {formatarMoeda(resumo.valorTrocas)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/[0.04]">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Total dos negócios
          </p>
          <p className="tabular text-sm font-semibold">
            {formatarMoeda(resumo.negocioTotal)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border-light dark:divide-border-dark">
        {resumo.composicoes.map((c) => {
          const vendido = veiculosPorId[c.venda.veiculo_id]
          const bem = c.bemTroca
          return (
            <li key={c.venda.id} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                <span className="tabular text-zinc-500">
                  {formatarDataCurta(c.venda.data)}
                </span>
                {' · '}
                {vendido
                  ? `${vendido.marca} ${vendido.modelo} (${vendido.placa})`
                  : 'Veículo vendido'}
                {' → entrou '}
                {bem
                  ? `${labelCurtoBem(bem)}${bem.placa ? ` (${bem.placa})` : ''}`
                  : 'bem na troca'}
              </p>
              <p className="mt-0.5 tabular text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatarMoeda(c.dinheiro)} dinheiro +{' '}
                {formatarMoeda(c.valorTroca)} troca ={' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {formatarMoeda(c.total)}
                </span>{' '}
                · comprador {c.venda.comprador_nome || '—'}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** No card/tabela do bem que ENTROU por troca: liga à venda de origem. */
export function TrocaOrigemEstoqueInfo({
  veiculo,
  vendaOrigem,
  veiculoVendido,
  variant = 'card',
}: PropsEstoqueTroca) {
  const nomeVendido = veiculoVendido
    ? `${veiculoVendido.marca} ${veiculoVendido.modelo}`.trim()
    : 'veículo vendido'
  const placaVendido = veiculoVendido?.placa
  const dinheiro = Number(vendaOrigem.entrada) || 0
  const nomeEste = labelCurtoBem({
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    categoria: veiculo.categoria === 'moto' ? 'moto' : 'carro',
  })
  const par = rotuloParTroca(veiculo, veiculoVendido)
  const jaVendido = veiculo.status === 'vendido'

  if (variant === 'compact') {
    return (
      <p
        className="mt-0.5 text-[11px] text-sky-700 dark:text-sky-300"
        title={par}
      >
        <ArrowLeftRight size={11} className="mr-0.5 inline align-[-2px]" />
        {par}
      </p>
    )
  }

  return (
    <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-2.5 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-sky-800 dark:text-sky-200">
        <ArrowLeftRight size={12} />
        Relação de troca · {par}
      </p>
      <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-200">
        {nomeEste} entrou na venda do{' '}
        <span className="font-semibold">
          {nomeVendido}
          {placaVendido ? ` · ${placaVendido}` : ''}
        </span>
      </p>
      <p className="mt-0.5 tabular text-[11px] text-zinc-500 dark:text-zinc-400">
        Dinheiro daquela venda:{' '}
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          {formatarMoeda(dinheiro)}
        </span>
        {jaVendido
          ? ' · custo de aquisição deste bem = R$ 0 (já contabilizado na troca)'
          : ` · ${nomeEste} no estoque até vender`}
      </p>
    </div>
  )
}

/**
 * Resolve e mostra a relação de origem por troca (ex.: ao vender a BIZ → Uno).
 * Não renderiza nada se o veículo não entrou por troca.
 */
export function RelacaoOrigemTrocaInfo({
  veiculo,
  vendas,
  veiculosPorId,
  variant = 'card',
}: {
  veiculo: Veiculo | undefined
  vendas: Venda[]
  veiculosPorId: Record<string, Veiculo | undefined>
  variant?: 'card' | 'compact'
}) {
  if (!veiculo) return null
  const origem = origemTrocaDoVeiculo(veiculo.id, vendas, veiculosPorId)
  if (!origem) return null
  return (
    <TrocaOrigemEstoqueInfo
      veiculo={veiculo}
      vendaOrigem={origem.vendaOrigem}
      veiculoVendido={origem.veiculoVendido}
      variant={variant}
    />
  )
}
