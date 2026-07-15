// Filtros do módulo Despesas:
//   • Período (data range)
//   • Tipo (pills multi — usa a paleta canônica em despesaMeta)
//   • Status de pagamento (pills: todas / pagas / em aberto)
//   • Veículo (select — incluindo "Geral (sem veículo)")
//   • Quem pagou (caixa da revenda ou pessoa no pessoal)
// A faixa de valor da iteração anterior foi removida (fora da spec atual).

import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { TIPOS_DESPESA, type TipoDespesa, type Veiculo } from '@/types'
import {
  type OpcaoFiltroPagoPor,
} from '@/utils/despesaOrigem'
import { Button } from './Button'
import { TIPO_META } from './despesaMeta'

export type FiltroPago = 'todos' | 'pago' | 'aberto'

export interface FiltrosDespesas {
  tipos: TipoDespesa[]
  pago: FiltroPago
  /** '' = todos · 'sem' = somente sem veículo · qualquer id = aquele veículo */
  veiculoId: string
  /** '' = todos · nome do sócio · __caixa_revenda__ */
  pagoPor: string
  dataInicio: string
  dataFim: string
}

export const filtrosDespesasVazios: FiltrosDespesas = {
  tipos: [],
  pago: 'todos',
  veiculoId: '',
  pagoPor: '',
  dataInicio: '',
  dataFim: '',
}

interface Props {
  filtros: FiltrosDespesas
  onChange: (f: FiltrosDespesas) => void
  veiculos: Veiculo[]
  opcoesPagoPor: OpcaoFiltroPagoPor[]
  totalResultados: number
  onLimpar: () => void
}

export function DespesaFiltros({
  filtros,
  onChange,
  veiculos,
  opcoesPagoPor,
  totalResultados,
  onLimpar,
}: Props) {
  // Recolhível por padrão em mobile, aberto em telas maiores. Como o estado é
  // local, escolhemos abrir para desktop e o usuário recolhe se quiser.
  const [aberto, setAberto] = useState(true)

  function toggleTipo(t: TipoDespesa) {
    const ja = filtros.tipos.includes(t)
    onChange({
      ...filtros,
      tipos: ja ? filtros.tipos.filter((x) => x !== t) : [...filtros.tipos, t],
    })
  }

  const algumAtivo =
    filtros.tipos.length > 0 ||
    filtros.pago !== 'todos' ||
    filtros.veiculoId !== '' ||
    filtros.pagoPor !== '' ||
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
        <div className="mt-4 space-y-4">
          {/* Tipos — pills coloridas alinhadas à paleta dos cards de categoria */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Tipos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_DESPESA.map((t) => {
                const meta = TIPO_META[t]
                const ativo = filtros.tipos.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTipo(t)}
                    aria-pressed={ativo}
                    className={[
                      'btn-press inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      ativo
                        ? `${meta.badge} border-transparent ring-1 ring-current/30`
                        : 'border-border-light text-zinc-600 hover:bg-zinc-100 dark:border-border-dark dark:text-zinc-300 dark:hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <meta.Icone size={12} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Status pago */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Status
              </p>
              <div className="inline-flex w-full overflow-hidden rounded-lg border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                {(['todos', 'pago', 'aberto'] as FiltroPago[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ ...filtros, pago: s })}
                    aria-pressed={filtros.pago === s}
                    className={[
                      'btn-press flex-1 px-3 py-2 text-xs font-medium',
                      filtros.pago === s
                        ? 'bg-primary/15 text-primary'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    {s === 'todos'
                      ? 'Todas'
                      : s === 'pago'
                        ? 'Pagas'
                        : 'Em aberto'}
                  </button>
                ))}
              </div>
            </div>

            {/* Veículo */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Veículo
              </p>
              <select
                className="input"
                value={filtros.veiculoId}
                onChange={(e) =>
                  onChange({ ...filtros, veiculoId: e.target.value })
                }
                aria-label="Filtrar por veículo"
              >
                <option value="">Todos os veículos</option>
                <option value="sem">Geral (sem veículo)</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.marca} {v.modelo}
                  </option>
                ))}
              </select>
            </div>

            {/* Quem pagou */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Quem pagou
              </p>
              <select
                className="input"
                value={filtros.pagoPor}
                onChange={(e) =>
                  onChange({ ...filtros, pagoPor: e.target.value })
                }
                aria-label="Filtrar por quem pagou"
              >
                <option value="">Todos</option>
                {opcoesPagoPor.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Período */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Período
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="input tabular"
                  value={filtros.dataInicio}
                  onChange={(e) =>
                    onChange({ ...filtros, dataInicio: e.target.value })
                  }
                  aria-label="Data inicial"
                />
                <span className="text-zinc-400">–</span>
                <input
                  type="date"
                  className="input tabular"
                  value={filtros.dataFim}
                  onChange={(e) =>
                    onChange({ ...filtros, dataFim: e.target.value })
                  }
                  aria-label="Data final"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
