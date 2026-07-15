// Metadados de UI por tipo de despesa — fonte única consumida pelos cards de
// categoria, badges da tabela, cards mobile, filtros e formulário. Mantemos
// aqui (em vez de espalhar pelos componentes) para que adicionar/renomear um
// tipo seja uma única alteração consistente em toda a UI.
//
// IMPORTANTE: as classes Tailwind estão escritas por extenso em strings
// literais, condição necessária para o JIT do Tailwind detectá-las durante o
// build (não funciona com concatenação dinâmica de fragmentos).

import {
  FileText,
  Landmark,
  Megaphone,
  MoreHorizontal,
  Sparkles,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { TipoDespesa } from '@/types'

export interface DespesaTipoMeta {
  /** Label legível (capitalizado). */
  label: string
  /** Ícone Lucide. */
  Icone: LucideIcon
  /**
   * Classes para badge "pill" sutil (fundo translúcido + texto colorido) —
   * usado na coluna Tipo da tabela e nos cards mobile.
   */
  badge: string
  /**
   * Cor sólida do ícone do card de categoria (texto + fundo translúcido).
   * Aplicada no quadrado do ícone no canto superior dos KPIs.
   */
  iconBg: string
  /**
   * Cor da borda inferior do card de categoria (acento decorativo).
   * Combina com o ícone para reforçar identidade visual.
   */
  acento: string
}

export const TIPO_META: Record<TipoDespesa, DespesaTipoMeta> = {
  'manutenção': {
    label: 'Manutenção',
    Icone: Wrench,
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    acento: 'bg-amber-500',
  },
  'documentação': {
    label: 'Documentação',
    Icone: FileText,
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    acento: 'bg-sky-500',
  },
  'detalhamento': {
    label: 'Detalhamento',
    Icone: Sparkles,
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    acento: 'bg-violet-500',
  },
  'frete': {
    label: 'Frete',
    Icone: Truck,
    badge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
    acento: 'bg-teal-500',
  },
  'taxa': {
    label: 'Taxa',
    Icone: Landmark,
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    acento: 'bg-rose-500',
  },
  'marketing': {
    label: 'Marketing',
    Icone: Megaphone,
    badge: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    iconBg: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
    acento: 'bg-fuchsia-500',
  },
  'outros': {
    label: 'Outros',
    Icone: MoreHorizontal,
    badge:
      'bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200',
    iconBg:
      'bg-zinc-200 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200',
    acento: 'bg-zinc-400 dark:bg-zinc-500',
  },
}
