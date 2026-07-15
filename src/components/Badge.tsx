import type { ReactNode } from 'react'
import type { StatusVeiculo } from '@/types'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral:
    'bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  primary: 'bg-primary/20 text-primary-700 dark:text-primary-200',
}

interface Props {
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className = '' }: Props) {
  return (
    <span className={['badge', toneClasses[tone], className].join(' ')}>
      {children}
    </span>
  )
}

// Cores conforme spec do módulo Estoque:
// disponível = verde, reservado = âmbar, vendido = cinza/zinco.
const statusTone: Record<StatusVeiculo, Tone> = {
  'em preparação': 'info',
  'disponível': 'success',
  reservado: 'warning',
  vendido: 'neutral',
}

interface StatusProps {
  status: StatusVeiculo
}

export function StatusBadge({ status }: StatusProps) {
  return (
    <Badge tone={statusTone[status]}>
      <span className="capitalize">{status}</span>
    </Badge>
  )
}
