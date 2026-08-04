import { useMemo, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  TrendingUp,
} from 'lucide-react'
import { LogoRevenda } from '@/components/LogoRevenda'
import { abreviarNomeRevenda, NOME_REVENDA_PADRAO } from '@/constants/marca'
import { useStore } from '@/store/useStore'
import {
  lucroDoAnoBreakdown,
  lucroDoMesBreakdown,
  type LucroBreakdown,
} from '@/utils/calculos'
import { simularPoolPessoal } from '@/utils/bancoPessoal'
import { formatarMoeda } from '@/utils/formatadores'
import { ThemeToggle } from './ThemeToggle'

// Header global — lucro revenda líquido + divisão sócio / pessoal.
export function Header() {
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const socios = useStore((s) => s.configuracoes.socios)
  const vendas = useStore((s) => s.vendas)
  const veiculos = useStore((s) => s.veiculos)
  const despesas = useStore((s) => s.despesas)
  const capitalInicial = useStore(
    (s) => s.configuracoes.capital_inicial_pessoal,
  )

  const hoje = useMemo(() => new Date(), [])
  const { breakdownMes, breakdownAno } = useMemo(
    () => {
      const sim = simularPoolPessoal(veiculos, vendas, capitalInicial, {
        despesas,
        nomeRevenda,
        socios,
      })
      return {
        breakdownMes: lucroDoMesBreakdown(
          vendas,
          veiculos,
          despesas,
          hoje,
          sim.fundingPorVeiculo,
        ),
        breakdownAno: lucroDoAnoBreakdown(
          vendas,
          veiculos,
          despesas,
          hoje,
          sim.fundingPorVeiculo,
        ),
      }
    },
    [vendas, veiculos, despesas, hoje, capitalInicial, nomeRevenda, socios],
  )
  const breakdown = breakdownMes
  const lucroRevenda = breakdown.revendaLiquido
  const lucroRevendaAno = breakdownAno.revendaLiquido
  const positivoRevenda = lucroRevenda >= 0
  const positivoRevendaAno = lucroRevendaAno >= 0
  const marcaCurta = abreviarNomeRevenda(nomeRevenda)
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
      <div className="flex items-center justify-center md:hidden">
        <LogoRevenda
          height={33}
          nomeRevenda={nomeRevenda || NOME_REVENDA_PADRAO}
        />
      </div>

      <div className="hidden md:block">
        <p className="text-sm font-semibold tracking-tight">
          {nomeRevenda?.trim() || NOME_REVENDA_PADRAO}
        </p>
        <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
          {dataLonga}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-stretch gap-2 md:flex">
          <PainelLucro
            label={`Mês · ${marcaCurta}`}
            icone={<TrendingUp size={16} className="text-primary" />}
            breakdown={breakdownMes}
            positivo={positivoRevenda}
            nomeDono={nomeDono}
            titulo="Lucro líquido do mês — revenda (a meia + caixa) menos despesas gerais"
          />
          <PainelLucro
            label={`Ano · ${hoje.getFullYear()}`}
            icone={<CalendarRange size={16} className="text-primary" />}
            breakdown={breakdownAno}
            positivo={positivoRevendaAno}
            nomeDono={nomeDono}
            titulo="Lucro líquido acumulado no ano — revenda (a meia + caixa) menos despesas gerais"
          />
        </div>

        <div
          className={[
            'flex md:hidden items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
            'border-border-light dark:border-border-dark',
          ].join(' ')}
          title={`Lucro líquido — mês (${dataCurta}) e acumulado do ano`}
        >
          <span className="flex items-center gap-1">
            <TrendingUp size={12} className="text-primary" />
            <span
              className={[
                'tabular font-semibold',
                positivoRevenda
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {formatarMoeda(lucroRevenda)}
            </span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="flex items-center gap-1">
            <CalendarRange size={12} className="text-primary" />
            <span
              className={[
                'tabular font-semibold',
                positivoRevendaAno
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {formatarMoeda(lucroRevendaAno)}
            </span>
          </span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}

// -----------------------------------------------------------------------------
// Painel de lucro (mês ou ano) — valor principal + divisão dono/sócio quando
// aplicável. Reaproveitado para os dois períodos exibidos no header.
// -----------------------------------------------------------------------------
function PainelLucro({
  label,
  icone,
  breakdown,
  positivo,
  nomeDono,
  titulo,
}: {
  label: string
  icone: ReactNode
  breakdown: LucroBreakdown
  positivo: boolean
  nomeDono: string
  titulo: string
}) {
  const lucro = breakdown.revendaLiquido
  return (
    <div
      className={[
        'flex items-stretch gap-0 overflow-hidden rounded-lg border',
        'border-border-light bg-white dark:bg-surface-dark dark:border-border-dark',
      ].join(' ')}
      title={titulo}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        {icone}
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {label}
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

      {(breakdown.temDivisao || breakdown.temPessoal) && (
        <>
          <div
            className="hidden flex-col justify-center border-l border-border-light px-3 py-1.5 leading-tight lg:flex dark:border-border-dark"
            title={
              breakdown.temPessoal
                ? `Revenda: ${formatarMoeda(breakdown.meuRevenda)} + pessoal (Golf, etc.): ${formatarMoeda(breakdown.pessoalLiquido)}`
                : 'Sua parte na revenda compartilhada'
            }
          >
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {nomeDono}
            </span>
            <span className="tabular text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatarMoeda(breakdown.meu)}
            </span>
          </div>
          {breakdown.temDivisao && (
            <div className="hidden flex-col justify-center border-l border-border-light px-3 py-1.5 leading-tight lg:flex dark:border-border-dark">
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Sócio
              </span>
              <span className="tabular text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatarMoeda(breakdown.socio)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
