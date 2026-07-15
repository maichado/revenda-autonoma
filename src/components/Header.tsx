import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import { LogoMgRevenda } from '@/components/LogoMgRevenda'
import { useStore } from '@/store/useStore'
import { lucroDoMesBreakdown } from '@/utils/calculos'
import { formatarMoeda } from '@/utils/formatadores'
import { ThemeToggle } from './ThemeToggle'

// Header global — nome da loja, data e LUCRO DO MÊS sempre visível.
export function Header() {
  const nome = useStore((s) => s.configuracoes.nome_revenda)
  const socios = useStore((s) => s.configuracoes.socios)
  const vendas = useStore((s) => s.vendas)
  const veiculos = useStore((s) => s.veiculos)
  const despesas = useStore((s) => s.despesas)

  const hoje = useMemo(() => new Date(), [])
  const breakdown = useMemo(
    () => lucroDoMesBreakdown(vendas, veiculos, despesas, hoje),
    [vendas, veiculos, despesas, hoje],
  )
  const lucro = breakdown.total
  const positivo = lucro >= 0
  const marcaCurta = (nome || 'MG Revenda').trim().split(/\s+/)[0] || 'MG'
  const nomeDono = socios[0]?.trim().split(/\s+/)[0] || 'Você'

  const dataLonga = format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const dataCurta = format(hoje, "d 'de' MMM", { locale: ptBR })

  return (
    <header
      className={[
        'sticky top-0 z-30 flex h-16 items-center gap-3 px-4 sm:px-6',
        'border-b bg-surface-light/80 backdrop-blur border-border-light',
        'dark:bg-surface-dark/80 dark:border-border-dark',
      ].join(' ')}
    >
      {/* Identidade (em mobile mostra a logo; em desktop o sidebar já mostra) */}
      <div className="flex items-center justify-center md:hidden">
        <LogoMgRevenda height={33} />
      </div>

      <div className="hidden md:block">
        <p className="text-sm font-semibold tracking-tight">{nome}</p>
        <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
          {dataLonga}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div
          className={[
            'hidden sm:flex items-stretch gap-0 overflow-hidden rounded-lg border',
            'border-border-light bg-white dark:bg-surface-dark dark:border-border-dark',
          ].join(' ')}
          title="Lucro do mês realizado (carros vendidos)"
        >
          {/* Lucro total do negócio (MG) */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <TrendingUp size={16} className="text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Lucro do mês · {marcaCurta}
              </span>
              <span
                className={[
                  'tabular text-sm font-semibold',
                  positivo
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                ].join(' ')}
              >
                {formatarMoeda(lucro)}
              </span>
            </div>
            {positivo ? (
              <ArrowUpRight size={14} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={14} className="text-red-500" />
            )}
          </div>

          {/* Parte do dono (Maicon) — só quando há carro a meia */}
          {breakdown.temDivisao && (
            <div className="flex flex-col justify-center border-l border-border-light px-3 py-1.5 leading-tight dark:border-border-dark">
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {nomeDono}
              </span>
              <span className="tabular text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatarMoeda(breakdown.meu)}
              </span>
            </div>
          )}
        </div>

        {/* Compacto em mobile */}
        <div
          className={[
            'flex sm:hidden items-center gap-1 rounded-md border px-2 py-1 text-xs',
            'border-border-light dark:border-border-dark',
          ].join(' ')}
          title={`Lucro do mês — ${dataCurta}`}
        >
          <TrendingUp size={12} className="text-primary" />
          <span
            className={[
              'tabular font-semibold',
              positivo
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            ].join(' ')}
          >
            {formatarMoeda(lucro)}
          </span>
          {breakdown.temDivisao && (
            <span className="text-zinc-500 dark:text-zinc-400">
              · {nomeDono}{' '}
              <span className="tabular font-semibold text-emerald-600 dark:text-emerald-400">
                {formatarMoeda(breakdown.meu)}
              </span>
            </span>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
