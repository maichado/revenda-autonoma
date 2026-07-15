import { Calendar, Pencil, Trash2, User } from 'lucide-react'
import type { Despesa, Veiculo, Venda } from '@/types'
import {
  formatarDataCurta,
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import {
  calcularLucroVenda,
  calcularROIVenda,
} from '@/utils/calculos'
import { BadgeFormaRecebimento, formatarParcelas } from './VendaTable'

interface Props {
  venda: Venda
  veiculo?: Veiculo
  despesas: Despesa[]
  onEditar: () => void
  onExcluir: () => void
}

// Card empilhado para a visão mobile (<768px) — mantém TODAS as informações
// da tabela (inclusive lucro/ROI conforme spec), em layout vertical.
export function VendaCard({
  venda,
  veiculo,
  despesas,
  onEditar,
  onExcluir,
}: Props) {
  const lucro = calcularLucroVenda(venda, veiculo, despesas)
  const roi = calcularROIVenda(venda, veiculo, despesas)
  const corLucro =
    lucro >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <article className="card flex flex-col gap-3 p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          {veiculo ? (
            <>
              <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                {veiculo.placa}
              </span>
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
            <span className="tabular">{formatarDataCurta(venda.data)}</span>
          </p>
        </div>
        <p className="tabular text-right text-base font-semibold tracking-tight">
          {formatarMoeda(venda.valor_venda)}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <BadgeFormaRecebimento forma={venda.forma_recebimento} />
        <span className="badge bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">
          {formatarParcelas(venda.parcelas)}
        </span>
      </div>

      <div className="text-xs">
        <p className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200">
          <User size={12} /> {venda.comprador_nome || '—'}
        </p>
        {venda.comprador_contato && (
          <p className="mt-0.5 pl-4 text-zinc-500 dark:text-zinc-400">
            {venda.comprador_contato}
          </p>
        )}
        {venda.comprador_cpf && (
          <p className="mt-0.5 pl-4 tabular text-zinc-500 dark:text-zinc-400">
            CPF: {venda.comprador_cpf}
          </p>
        )}
      </div>

      {/* Linha de lucro/ROI — sempre presente na visão mobile (spec). */}
      <dl className="grid grid-cols-2 gap-y-1 border-t border-border-light pt-2 text-xs dark:border-border-dark">
        <dt className="text-zinc-500 dark:text-zinc-400">Lucro</dt>
        <dd className={['tabular text-right font-semibold', corLucro].join(' ')}>
          {formatarMoeda(lucro)}
        </dd>
        <dt className="text-zinc-500 dark:text-zinc-400">ROI</dt>
        <dd className={['tabular text-right font-semibold', corLucro].join(' ')}>
          {formatarPercentual(roi, 1)}
        </dd>
      </dl>

      {venda.observacoes && (
        <p className="line-clamp-3 text-xs text-zinc-500 dark:text-zinc-400">
          {venda.observacoes}
        </p>
      )}

      <footer className="mt-1 flex items-center justify-end gap-1 border-t border-border-light pt-2 dark:border-border-dark">
        <button
          type="button"
          onClick={onEditar}
          title="Editar"
          aria-label="Editar venda"
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onExcluir}
          title="Excluir"
          aria-label="Excluir venda"
          className="btn-press grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={14} />
        </button>
      </footer>
    </article>
  )
}
