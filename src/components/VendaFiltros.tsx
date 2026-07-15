import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import {
  FORMAS_RECEBIMENTO_VENDA,
  type FormaRecebimentoVenda,
} from '@/types'
import { Button } from './Button'

export interface FiltrosVendas {
  dataInicio: string
  dataFim: string
  formasRecebimento: FormaRecebimentoVenda[]
}

interface Props {
  filtros: FiltrosVendas
  onChange: (f: FiltrosVendas) => void
  totalResultados: number
  onLimpar: () => void
}

// Tons das pills — consistentes com os badges usados na tabela/cards.
const pillFormaTone: Record<FormaRecebimentoVenda, string> = {
  dinheiro:
    'bg-emerald-500 text-zinc-900 border-emerald-500 hover:bg-emerald-400',
  pix: 'bg-sky-500 text-zinc-900 border-sky-500 hover:bg-sky-400',
  financiado: 'bg-violet-500 text-white border-violet-500 hover:bg-violet-400',
  'consórcio':
    'bg-amber-500 text-zinc-900 border-amber-500 hover:bg-amber-400',
}

export function VendaFiltros({
  filtros,
  onChange,
  totalResultados,
  onLimpar,
}: Props) {
  // Em telas pequenas a barra pode recolher para economizar espaço.
  const [aberto, setAberto] = useState(true)

  function toggleForma(f: FormaRecebimentoVenda) {
    const ja = filtros.formasRecebimento.includes(f)
    onChange({
      ...filtros,
      formasRecebimento: ja
        ? filtros.formasRecebimento.filter((x) => x !== f)
        : [...filtros.formasRecebimento, f],
    })
  }

  const algumAtivo =
    filtros.dataInicio !== '' ||
    filtros.dataFim !== '' ||
    filtros.formasRecebimento.length > 0

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
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Período */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Período
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input"
                value={filtros.dataInicio}
                onChange={(e) =>
                  onChange({ ...filtros, dataInicio: e.target.value })
                }
                aria-label="Data inicial"
              />
              <span className="text-zinc-400">–</span>
              <input
                type="date"
                className="input"
                value={filtros.dataFim}
                onChange={(e) =>
                  onChange({ ...filtros, dataFim: e.target.value })
                }
                aria-label="Data final"
              />
            </div>
          </div>

          {/* Forma de recebimento (pills) */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Forma de recebimento
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FORMAS_RECEBIMENTO_VENDA.map((f) => {
                const ativo = filtros.formasRecebimento.includes(f)
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleForma(f)}
                    className={[
                      'btn-press rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                      ativo
                        ? pillFormaTone[f]
                        : 'border-border-light text-zinc-600 hover:bg-zinc-100 dark:border-border-dark dark:text-zinc-300 dark:hover:bg-white/[0.06]',
                    ].join(' ')}
                    aria-pressed={ativo}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
