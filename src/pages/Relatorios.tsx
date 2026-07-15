// Módulo Relatórios — análise financeira por período com tabs, escopo e WhatsApp.

import { useMemo, useState } from 'react'
import { Car, FileBarChart } from 'lucide-react'

import { useStore } from '@/store/useStore'
import { Badge } from '@/components/Badge'
import { PeriodoSelector } from '@/components/PeriodoSelector'
import { RelatorioCompras } from '@/components/RelatorioCompras'
import { RelatorioDespesas } from '@/components/RelatorioDespesas'
import { RelatorioGeral } from '@/components/RelatorioGeral'
import { RelatorioTabs } from '@/components/RelatorioTabs'
import { RelatorioVeiculoIndividual } from '@/components/RelatorioVeiculoIndividual'
import { RelatorioVeiculos } from '@/components/RelatorioVeiculos'
import { RelatorioVendas } from '@/components/RelatorioVendas'
import {
  anosDisponiveis,
  labelPeriodo,
  labelVeiculoSelect,
  periodoMesAtual,
} from '@/utils/relatorios'
import type { EstadoRelatorio } from '@/utils/relatoriosTexto'
import type { TipoRelatorio } from '@/utils/relatoriosTexto'

type EscopoRelatorio = 'todos' | 'veiculo'

export default function Relatorios() {
  const veiculos = useStore((s) => s.veiculos)
  const vendas = useStore((s) => s.vendas)
  const compras = useStore((s) => s.compras)
  const despesas = useStore((s) => s.despesas)
  const configuracoes = useStore((s) => s.configuracoes)

  const [periodo, setPeriodo] = useState(() => periodoMesAtual())
  const [tipo, setTipo] = useState<TipoRelatorio>('geral')
  const [escopo, setEscopo] = useState<EscopoRelatorio>('todos')
  const [veiculoId, setVeiculoId] = useState('')

  const anos = useMemo(
    () => anosDisponiveis(veiculos, compras, vendas, despesas),
    [veiculos, compras, vendas, despesas],
  )

  const veiculosOrdenados = useMemo(
    () =>
      [...veiculos].sort((a, b) =>
        a.placa.localeCompare(b.placa, 'pt-BR'),
      ),
    [veiculos],
  )

  const veiculoSelecionado = useMemo(
    () => veiculos.find((v) => v.id === veiculoId),
    [veiculos, veiculoId],
  )

  const estado: EstadoRelatorio = useMemo(
    () => ({ veiculos, compras, vendas, despesas, configuracoes }),
    [veiculos, compras, vendas, despesas, configuracoes],
  )

  const escopoVeiculo = escopo === 'veiculo' && !!veiculoId

  function renderRelatorio() {
    if (escopoVeiculo) {
      if (tipo === 'geral' || tipo === 'veiculos') {
        return (
          <RelatorioVeiculoIndividual
            estado={estado}
            veiculoId={veiculoId}
            periodo={periodo}
          />
        )
      }
      const props = { estado, periodo, veiculoId }
      switch (tipo) {
        case 'compras':
          return <RelatorioCompras {...props} />
        case 'vendas':
          return <RelatorioVendas {...props} />
        case 'despesas':
          return <RelatorioDespesas {...props} />
      }
    }

    switch (tipo) {
      case 'geral':
        return <RelatorioGeral estado={estado} periodo={periodo} />
      case 'veiculos':
        return <RelatorioVeiculos estado={estado} periodo={periodo} />
      case 'compras':
        return <RelatorioCompras estado={estado} periodo={periodo} />
      case 'vendas':
        return <RelatorioVendas estado={estado} periodo={periodo} />
      case 'despesas':
        return <RelatorioDespesas estado={estado} periodo={periodo} />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Análise financeira por período — relatórios gerais, por módulo ou de
          um veículo específico, com compartilhamento via WhatsApp.
        </p>
      </div>

      <PeriodoSelector
        periodo={periodo}
        anosDisponiveis={anos}
        onChange={setPeriodo}
      />

      <RelatorioTabs valor={tipo} onChange={setTipo} />

      {/* Nível 2 — Escopo */}
      <div className="card space-y-3 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
            <FileBarChart size={14} />
          </span>
          <h2 className="text-sm font-semibold tracking-tight">
            Escopo do relatório
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEscopo('todos')}
            className={[
              'btn-press rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              escopo === 'todos'
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border-light text-zinc-600 hover:border-primary/40 dark:border-border-dark dark:text-zinc-300',
            ].join(' ')}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setEscopo('veiculo')}
            className={[
              'btn-press inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              escopo === 'veiculo'
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border-light text-zinc-600 hover:border-primary/40 dark:border-border-dark dark:text-zinc-300',
            ].join(' ')}
          >
            <Car size={12} />
            Veículo específico
          </button>
        </div>

        {escopo === 'veiculo' && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={veiculoId}
              onChange={(e) => setVeiculoId(e.target.value)}
              className="input max-w-md"
              aria-label="Selecionar veículo"
            >
              <option value="">Selecione um veículo…</option>
              {veiculosOrdenados.map((v) => (
                <option key={v.id} value={v.id}>
                  {labelVeiculoSelect(v)}
                </option>
              ))}
            </select>
            {veiculoSelecionado && (
              <Badge tone="primary">{veiculoSelecionado.placa}</Badge>
            )}
          </div>
        )}

        {escopo === 'veiculo' && !veiculoId && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Selecione um veículo para gerar o relatório individual.
          </p>
        )}

        {escopoVeiculo && veiculoSelecionado && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {tipo === 'geral' || tipo === 'veiculos'
              ? `Relatório consolidado de ${veiculoSelecionado.placa} — compra, despesas, venda e lucro.`
              : tipo === 'despesas'
                ? `Todas as despesas de ${veiculoSelecionado.placa} (histórico completo — bate com o módulo Despesas).`
                : `Filtrando ${tipo} do veículo ${veiculoSelecionado.placa} no período ${labelPeriodo(periodo)}.`}
          </p>
        )}
      </div>

      {escopo === 'veiculo' && !veiculoId ? (
        <div className="card mx-auto max-w-4xl p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Escolha um veículo acima para visualizar o relatório.
        </div>
      ) : (
        renderRelatorio()
      )}
    </div>
  )
}
