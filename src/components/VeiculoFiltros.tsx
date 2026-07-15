import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { StatusVeiculo } from '@/types'
import { Button } from './Button'

export interface FiltrosVeiculos {
  status: StatusVeiculo[]
  marca: string
  precoMin: number | null
  precoMax: number | null
  dataInicio: string
  dataFim: string
}

interface Props {
  filtros: FiltrosVeiculos
  onChange: (f: FiltrosVeiculos) => void
  marcasDisponiveis: string[]
  /** Total de itens após filtrar — exibido como contador. */
  totalResultados: number
  onLimpar: () => void
}

const TODOS_STATUS: StatusVeiculo[] = [
  'em preparação',
  'disponível',
  'reservado',
  'vendido',
]

const pillTone: Record<StatusVeiculo, string> = {
  'em preparação':
    'bg-violet-500 text-white border-violet-500 hover:bg-violet-400',
  'disponível':
    'bg-emerald-500 text-zinc-900 border-emerald-500 hover:bg-emerald-400',
  reservado: 'bg-amber-500 text-zinc-900 border-amber-500 hover:bg-amber-400',
  vendido:
    'bg-zinc-300 text-zinc-900 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-500 dark:text-white dark:border-zinc-500 dark:hover:bg-zinc-400',
}

export function VeiculoFiltros({
  filtros,
  onChange,
  marcasDisponiveis,
  totalResultados,
  onLimpar,
}: Props) {
  // Em telas pequenas a barra pode recolher para economizar espaço.
  const [aberto, setAberto] = useState(true)

  function toggleStatus(s: StatusVeiculo) {
    const ja = filtros.status.includes(s)
    onChange({
      ...filtros,
      status: ja
        ? filtros.status.filter((x) => x !== s)
        : [...filtros.status, s],
    })
  }

  const algumAtivo =
    filtros.status.length > 0 ||
    filtros.marca !== '' ||
    filtros.precoMin !== null ||
    filtros.precoMax !== null ||
    filtros.dataInicio !== '' ||
    filtros.dataFim !== ''

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold"
          aria-expanded={aberto}
        >
          Filtros
          {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
            · {totalResultados} resultado{totalResultados === 1 ? '' : 's'}
          </span>
        </button>
        {algumAtivo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw size={13} />}
            onClick={onLimpar}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {aberto && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Status (pills) */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TODOS_STATUS.map((s) => {
                const ativo = filtros.status.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    className={[
                      'btn-press rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                      ativo
                        ? pillTone[s]
                        : 'border-border-light text-zinc-600 hover:bg-zinc-100 dark:border-border-dark dark:text-zinc-300 dark:hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Marca */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Marca
            </p>
            <select
              className="input"
              value={filtros.marca}
              onChange={(e) =>
                onChange({ ...filtros, marca: e.target.value })
              }
            >
              <option value="">Todas</option>
              {marcasDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Faixa de preço */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Venda pretendida (R$)
            </p>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="mín."
                className="input tabular"
                value={filtros.precoMin ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filtros,
                    precoMin:
                      e.target.value === ''
                        ? null
                        : Number(e.target.value.replace(/\D/g, '')) || 0,
                  })
                }
              />
              <span className="text-zinc-400">–</span>
              <input
                inputMode="numeric"
                placeholder="máx."
                className="input tabular"
                value={filtros.precoMax ?? ''}
                onChange={(e) =>
                  onChange({
                    ...filtros,
                    precoMax:
                      e.target.value === ''
                        ? null
                        : Number(e.target.value.replace(/\D/g, '')) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Período de compra */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Período de compra
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input"
                value={filtros.dataInicio}
                onChange={(e) =>
                  onChange({ ...filtros, dataInicio: e.target.value })
                }
              />
              <span className="text-zinc-400">–</span>
              <input
                type="date"
                className="input"
                value={filtros.dataFim}
                onChange={(e) =>
                  onChange({ ...filtros, dataFim: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
