// Card mobile equivalente a uma linha da tabela do relatório.
// Usado em telas <md, onde a tabela 12-colunas não cabe.

import { StatusBadge } from '@/components/Badge'
import {
  formatarDataCurta,
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { VeiculoLinhaRelatorio } from '@/utils/relatorios'

interface Props {
  linha: VeiculoLinhaRelatorio
}

export function RelatorioVeiculoCard({ linha: l }: Props) {
  const lucroCor =
    l.lucro > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : l.lucro < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-zinc-500 dark:text-zinc-400'

  const dataCompra = l.veiculo.data_compra
  const dataVenda = l.venda?.data ?? ''

  return (
    <article className="card card-hover p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
            {l.veiculo.placa}
          </span>
          <p className="mt-1.5 truncate text-sm font-medium">
            {l.veiculo.marca} {l.veiculo.modelo}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {l.veiculo.ano} · {l.veiculo.cor}
          </p>
        </div>
        <StatusBadge status={l.veiculo.status} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <Item
          label="Compra"
          value={dataCompra ? formatarDataCurta(dataCompra) : '—'}
        />
        <Item
          label="Venda"
          value={dataVenda ? formatarDataCurta(dataVenda) : '—'}
        />
        <Item label="R$ compra" value={formatarMoeda(l.compra)} />
        <Item label="R$ despesas" value={formatarMoeda(l.despesas)} />
        <Item
          label="R$ venda"
          value={l.venda ? formatarMoeda(l.venda_valor) : '—'}
        />
        <Item label="Dias estoque" value={String(l.diasEmEstoque)} />
      </dl>

      <div className="mt-3 flex items-end justify-between border-t border-border-light pt-3 dark:border-border-dark">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Lucro
          </p>
          <p className={['tabular text-base font-semibold', lucroCor].join(' ')}>
            {l.venda ? formatarMoeda(l.lucro) : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            ROI
          </p>
          <p className={['tabular text-base font-semibold', lucroCor].join(' ')}>
            {l.venda ? formatarPercentual(l.roi, 1) : '—'}
          </p>
        </div>
      </div>
    </article>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </>
  )
}
