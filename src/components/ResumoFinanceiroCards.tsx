// Cards de resumo financeiro do período (topo da página de Relatórios).
//
// Reaproveita KpiCard para manter a paridade visual com Dashboard/Veículos.
// O lucro tem um destaque visual extra (verde/vermelho) por ser o número
// mais importante do relatório.

import {
  CircleDollarSign,
  Coins,
  Gauge,
  PiggyBank,
  ShoppingBag,
  Tags,
} from 'lucide-react'

import { KpiCard } from '@/components/KpiCard'
import { formatarMoeda, formatarPercentual } from '@/utils/formatadores'
import type { ResumoFinanceiro } from '@/utils/relatorios'

interface Props {
  resumo: ResumoFinanceiro
}

export function ResumoFinanceiroCards({ resumo }: Props) {
  const lucroPositivo = resumo.lucro >= 0
  const corLucro = lucroPositivo
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <section
      aria-label="Resumo financeiro do período"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      <KpiCard
        titulo="Receita total"
        valor={formatarMoeda(resumo.receita)}
        icone={<CircleDollarSign size={16} />}
      />
      <KpiCard
        titulo="Custo total"
        valor={formatarMoeda(resumo.custoTotal)}
        icone={<Coins size={16} />}
      />

      {/* Card de lucro com cor enfatizada — único divergente do KpiCard padrão. */}
      <div className="card card-hover p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Lucro líquido
          </p>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <PiggyBank size={16} />
          </span>
        </div>
        <p
          className={[
            'tabular mt-2 text-2xl font-semibold tracking-tight',
            corLucro,
          ].join(' ')}
        >
          {formatarMoeda(resumo.lucro)}
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Receita − custo de aquisição − despesas
        </p>
      </div>

      <KpiCard
        titulo="Margem média"
        valor={formatarPercentual(resumo.margem, 1)}
        icone={<Gauge size={16} />}
      />
      <KpiCard
        titulo="Vendas no período"
        valor={String(resumo.qtdVendas)}
        icone={<Tags size={16} />}
      />
      <KpiCard
        titulo="Compras no período"
        valor={String(resumo.qtdCompras)}
        icone={<ShoppingBag size={16} />}
      />
    </section>
  )
}
