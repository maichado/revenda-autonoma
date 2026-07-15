// Segmented control para escolher qual relatório está sendo visualizado.
//
// Renderiza 5 botões (Geral, Veículos, Compras, Vendas, Despesas). Em telas
// pequenas vira um scroll horizontal para manter o conteúdo visível.

import {
  Car,
  FileBarChart,
  Receipt,
  ShoppingBag,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import type { TipoRelatorio } from '@/utils/relatoriosTexto'

interface Props {
  valor: TipoRelatorio
  onChange: (t: TipoRelatorio) => void
}

interface Aba {
  id: TipoRelatorio
  label: string
  Icone: LucideIcon
}

const ABAS: Aba[] = [
  { id: 'geral', label: 'Geral', Icone: FileBarChart },
  { id: 'veiculos', label: 'Veículos', Icone: Car },
  { id: 'compras', label: 'Compras', Icone: ShoppingBag },
  { id: 'vendas', label: 'Vendas', Icone: Tags },
  { id: 'despesas', label: 'Despesas', Icone: Receipt },
]

export function RelatorioTabs({ valor, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de relatório"
      className="-mx-1 flex w-full snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {ABAS.map(({ id, label, Icone }) => {
        const ativo = valor === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(id)}
            className={[
              'btn-press inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
              ativo
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border-light bg-surface-light text-zinc-600 hover:border-primary/40 hover:text-primary dark:border-border-dark dark:bg-surface-dark dark:text-zinc-300',
            ].join(' ')}
          >
            <Icone size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
