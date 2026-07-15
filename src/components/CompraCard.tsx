import { Calendar, Pencil, Trash2, User } from 'lucide-react'
import type { Compra, Veiculo } from '@/types'
import { formatarDataCurta, formatarMoeda } from '@/utils/formatadores'
import { BadgeForma, BadgeOrigem } from './CompraTable'

interface Props {
  compra: Compra
  veiculo?: Veiculo
  onEditar: () => void
  onExcluir: () => void
}

// Card empilhado usado na visão mobile (<768px). Mostra os mesmos dados da
// tabela em layout vertical, com micro-interação btn-press nas ações.
export function CompraCard({ compra, veiculo, onEditar, onExcluir }: Props) {
  return (
    <article className="card flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          {veiculo ? (
            <>
              <div className="flex items-center gap-2">
                <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                  {veiculo.placa}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold leading-tight">
                {veiculo.marca}{' '}
                <span className="font-normal text-zinc-600 dark:text-zinc-300">
                  {veiculo.modelo}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm italic text-zinc-400">veículo removido</p>
          )}
          <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Calendar size={11} />
            <span className="tabular">{formatarDataCurta(compra.data)}</span>
          </p>
        </div>
        <p className="tabular text-right text-base font-semibold tracking-tight">
          {formatarMoeda(compra.valor_pago)}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <BadgeForma forma={compra.forma_pagamento} />
        <BadgeOrigem origem={compra.origem} />
      </div>

      <div className="text-xs">
        <p className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200">
          <User size={12} /> {compra.vendedor_nome || '—'}
        </p>
        {compra.vendedor_contato && (
          <p className="mt-0.5 pl-4 text-zinc-500 dark:text-zinc-400">
            {compra.vendedor_contato}
          </p>
        )}
      </div>

      {compra.observacoes && (
        <p className="line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">
          {compra.observacoes}
        </p>
      )}

      <footer className="mt-1 flex items-center justify-end gap-1 border-t border-border-light pt-2 dark:border-border-dark">
        <button
          type="button"
          onClick={onEditar}
          title="Editar"
          aria-label="Editar compra"
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onExcluir}
          title="Excluir"
          aria-label="Excluir compra"
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={14} />
        </button>
      </footer>
    </article>
  )
}
