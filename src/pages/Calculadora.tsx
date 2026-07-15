import { useState } from 'react'
import { Calculator, PieChart, TrendingUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { SimuladorNegocioPanel } from '@/components/SimuladorNegocioPanel'
import { CalculadoraDivisaoSocio } from '@/components/CalculadoraDivisaoSocio'

type AbaCalculadora = 'negocio' | 'divisao'

const ABAS: {
  id: AbaCalculadora
  label: string
  Icone: typeof Calculator
}[] = [
  { id: 'negocio', label: 'Simular negócio', Icone: TrendingUp },
  { id: 'divisao', label: 'Divisão 50/50', Icone: PieChart },
]

export default function Calculadora() {
  const veiculos = useStore((s) => s.veiculos)
  const despesas = useStore((s) => s.despesas)
  const vendas = useStore((s) => s.vendas)
  const socios = useStore((s) => s.configuracoes.socios)
  const [aba, setAba] = useState<AbaCalculadora>('negocio')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calculadora</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Simule negócios, calcule margens e divida o lucro entre sócios. Tudo
          salvo no servidor quando você registrar uma simulação.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Tipo de cálculo"
        className="-mx-1 flex w-full snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {ABAS.map(({ id, label, Icone }) => {
          const ativo = aba === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(id)}
              className={[
                'btn-press inline-flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors',
                ativo
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border-light bg-surface-light text-zinc-600 hover:border-primary/40 hover:text-primary dark:border-border-dark dark:bg-surface-dark dark:text-zinc-300',
              ].join(' ')}
            >
              <Icone size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {aba === 'negocio' ? (
        <SimuladorNegocioPanel
          veiculos={veiculos}
          despesas={despesas}
          vendas={vendas}
        />
      ) : veiculos.length > 0 ? (
        <CalculadoraDivisaoSocio
          veiculos={veiculos}
          despesas={despesas}
          vendas={vendas}
          socios={socios}
        />
      ) : (
        <section className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Calculator size={24} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cadastre um veículo para usar a divisão 50/50 com despesas do
            estoque.
          </p>
        </section>
      )}
    </div>
  )
}
