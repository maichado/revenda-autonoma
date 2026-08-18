import type { ReactNode } from 'react'
import type { StatusVeiculo } from '@/types'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

const toneClasses: Record<Tone, string> = {
  neutral:
    'bg-zinc-500/10 text-zinc-700 dark:bg-white/[0.1] dark:text-zinc-200',
  success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/12 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
  primary: 'bg-primary/18 text-primary-800 dark:text-primary-200',
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

const statusTone: Record<StatusVeiculo, Tone> = {
  'em preparação': 'info',
  'mecânico': 'primary',
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
