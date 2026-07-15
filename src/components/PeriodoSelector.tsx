// Seletor de período do módulo Relatórios.
//
// Suporta dois modos (toggle):
//   • Mês/Ano específico — selects de mês (1–12) e ano (dinâmico)
//   • Range customizado  — date_inicial / date_final
//
// Botões rápidos: "Mês atual", "Mês anterior", "Ano atual", "Últimos 90 dias".
// Todas as mudanças disparam onChange — a página recalcula em tempo real.

import { CalendarDays, CalendarRange, RotateCcw } from 'lucide-react'

import {
  labelPeriodo,
  periodoAnoAtual,
  periodoMesAno,
  periodoMesAnterior,
  periodoMesAtual,
  periodoRange,
  periodoUltimosDias,
  type Periodo,
} from '@/utils/relatorios'

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface Props {
  periodo: Periodo
  anosDisponiveis: number[]
  onChange: (p: Periodo) => void
}

export function PeriodoSelector({ periodo, anosDisponiveis, onChange }: Props) {
  function trocarModo(modo: 'mes-ano' | 'range') {
    if (modo === periodo.modo) return
    if (modo === 'mes-ano') {
      onChange(periodoMesAno(periodo.mes, periodo.ano))
    } else {
      // Ao entrar no modo range, preservamos o intervalo já calculado.
      onChange(periodoRange(periodo.dataInicio, periodo.dataFim))
    }
  }

  return (
    <section
      // print:hidden esconde o seletor interativo na exportação para PDF.
      className="card no-print p-4 sm:p-5 print:hidden"
      aria-label="Seletor de período do relatório"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">
            Período do relatório
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="tabular font-medium text-zinc-700 dark:text-zinc-200">
              {labelPeriodo(periodo)}
            </span>{' '}
            — todos os números abaixo recalculam ao trocar o período.
          </p>
        </div>

        {/* Toggle de modo */}
        <div
          role="tablist"
          aria-label="Modo do seletor"
          className="inline-flex overflow-hidden rounded-lg border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
        >
          <button
            role="tab"
            aria-selected={periodo.modo === 'mes-ano'}
            onClick={() => trocarModo('mes-ano')}
            className={[
              'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
              periodo.modo === 'mes-ano'
                ? 'bg-primary/15 text-primary'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
            ].join(' ')}
          >
            <CalendarDays size={14} /> Mês/Ano
          </button>
          <button
            role="tab"
            aria-selected={periodo.modo === 'range'}
            onClick={() => trocarModo('range')}
            className={[
              'btn-press inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium',
              periodo.modo === 'range'
                ? 'bg-primary/15 text-primary'
                : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]',
            ].join(' ')}
          >
            <CalendarRange size={14} /> Intervalo
          </button>
        </div>
      </div>

      {/* Campos do modo escolhido */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periodo.modo === 'mes-ano' ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Mês
              </span>
              <select
                className="input"
                value={periodo.mes}
                onChange={(e) =>
                  onChange(periodoMesAno(Number(e.target.value), periodo.ano))
                }
                aria-label="Selecionar mês"
              >
                {NOMES_MESES.map((nome, i) => (
                  <option key={nome} value={i + 1}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Ano
              </span>
              <select
                className="input"
                value={periodo.ano}
                onChange={(e) =>
                  onChange(periodoMesAno(periodo.mes, Number(e.target.value)))
                }
                aria-label="Selecionar ano"
              >
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Data inicial
              </span>
              <input
                type="date"
                className="input"
                value={periodo.dataInicio}
                onChange={(e) =>
                  onChange(periodoRange(e.target.value, periodo.dataFim))
                }
                aria-label="Data inicial"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Data final
              </span>
              <input
                type="date"
                className="input"
                value={periodo.dataFim}
                onChange={(e) =>
                  onChange(periodoRange(periodo.dataInicio, e.target.value))
                }
                aria-label="Data final"
              />
            </label>
          </>
        )}
      </div>

      {/* Atalhos rápidos */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <RotateCcw size={11} /> Atalhos
        </span>
        <BotaoRapido label="Mês atual" onClick={() => onChange(periodoMesAtual())} />
        <BotaoRapido
          label="Mês anterior"
          onClick={() => onChange(periodoMesAnterior())}
        />
        <BotaoRapido label="Ano atual" onClick={() => onChange(periodoAnoAtual())} />
        <BotaoRapido
          label="Últimos 90 dias"
          onClick={() => onChange(periodoUltimosDias(90))}
        />
      </div>
    </section>
  )
}

function BotaoRapido({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-press inline-flex items-center rounded-full border border-border-light bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-primary/60 hover:bg-primary/5 dark:border-border-dark dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-primary/10"
    >
      {label}
    </button>
  )
}
