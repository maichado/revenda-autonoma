// Card empilhado para a visão mobile (<768px) da listagem de despesas.
// Reproduz TODOS os dados da tabela em layout vertical, mantendo a paridade
// de informação entre as duas visualizações exigida pela spec.

import { Calendar, Check, Link2, Pencil, Trash2 } from 'lucide-react'
import type { Despesa, Veiculo } from '@/types'
import { rotuloExibicaoPagoPor } from '@/utils/despesaOrigem'
import { TIPO_META } from './despesaMeta'
import { formatarDataCurta, formatarMoeda } from '@/utils/formatadores'

interface Props {
  despesa: Despesa
  nomeRevenda: string
  socios: string[]
  veiculo?: Veiculo
  onEditar: () => void
  onExcluir: () => void
  onTogglePago: () => void
}

export function DespesaCard({
  despesa,
  nomeRevenda,
  socios,
  veiculo,
  onEditar,
  onExcluir,
  onTogglePago,
}: Props) {
  const meta = TIPO_META[despesa.tipo]
  const Icone = meta.Icone

  return (
    <article className="card flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
              meta.iconBg,
            ].join(' ')}
          >
            <Icone size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {despesa.descricao}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Calendar size={11} />
              <span className="tabular">
                {formatarDataCurta(despesa.data)}
              </span>
            </p>
          </div>
        </div>
        <p className="tabular shrink-0 text-right text-base font-semibold tracking-tight">
          {formatarMoeda(despesa.valor)}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className={['badge capitalize', meta.badge].join(' ')}>
          {meta.label}
        </span>
        <button
          type="button"
          onClick={onTogglePago}
          aria-label={
            despesa.pago ? 'Marcar como em aberto' : 'Marcar como paga'
          }
          className={[
            'btn-press inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            despesa.pago
              ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400'
              : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400',
          ].join(' ')}
        >
          {despesa.pago ? <Check size={12} /> : null}
          {despesa.pago ? 'Pago' : 'Em aberto'}
        </button>
        <span className="badge bg-zinc-100 capitalize text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
          {despesa.forma_pagamento}
        </span>
        <span className="badge bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
          {rotuloExibicaoPagoPor(despesa.pago_por, nomeRevenda, socios)}
        </span>
      </div>

      <div className="text-xs">
        {veiculo ? (
          <p className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
            <Link2 size={12} className="text-zinc-400" />
            <span className="tabular font-semibold">{veiculo.placa}</span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {veiculo.marca} {veiculo.modelo}
            </span>
          </p>
        ) : (
          <p className="italic text-zinc-400">Despesa geral (sem veículo)</p>
        )}
      </div>

      <footer className="mt-1 flex items-center justify-end gap-1 border-t border-border-light pt-2 dark:border-border-dark">
        <button
          type="button"
          onClick={onEditar}
          title="Editar"
          aria-label={`Editar despesa ${despesa.descricao}`}
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onExcluir}
          title="Excluir"
          aria-label={`Excluir despesa ${despesa.descricao}`}
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={14} />
        </button>
      </footer>
    </article>
  )
}
