// Grid de indicadores de destaque do período.
//
// 7 cards (spec), em layout responsivo:
//   1. Veículo mais lucrativo
//   2. Veículo menos lucrativo (ou com prejuízo)
//   3. Média de dias em estoque (apenas vendidos do período)
//   4. Forma de pagamento mais usada nas compras
//   5. Forma de recebimento mais usada nas vendas
//   6. Ticket médio de venda
//   7. Origem mais frequente das compras

import type { ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Clock,
  MapPin,
  Trophy,
  Wallet,
  WalletCards,
} from 'lucide-react'

import {
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { IndicadoresDestaque } from '@/utils/relatorios'

interface Props {
  indicadores: IndicadoresDestaque
}

export function IndicadoresDestaqueGrid({ indicadores }: Props) {
  const {
    veiculoMaisLucrativo,
    veiculoMenosLucrativo,
    mediaDiasEstoque,
    formaPagamentoTop,
    formaRecebimentoTop,
    ticketMedioVenda,
    origemTop,
  } = indicadores

  return (
    <section
      aria-label="Indicadores de destaque do período"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <CardDestaque
        titulo="Mais lucrativo"
        icone={<Trophy size={16} />}
        tone="success"
        principal={
          veiculoMaisLucrativo
            ? formatarMoeda(veiculoMaisLucrativo.lucro)
            : '—'
        }
        sub={
          veiculoMaisLucrativo ? (
            <>
              <span className="tabular font-medium text-zinc-700 dark:text-zinc-200">
                {veiculoMaisLucrativo.veiculo.placa}
              </span>{' '}
              · ROI {formatarPercentual(veiculoMaisLucrativo.roi, 1)}
              <br />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {veiculoMaisLucrativo.veiculo.marca}{' '}
                {veiculoMaisLucrativo.veiculo.modelo}
              </span>
            </>
          ) : (
            'Sem vendas no período.'
          )
        }
      />

      <CardDestaque
        titulo="Menos lucrativo"
        icone={
          veiculoMenosLucrativo && veiculoMenosLucrativo.lucro < 0 ? (
            <ArrowDownRight size={16} />
          ) : (
            <ArrowUpRight size={16} />
          )
        }
        tone={
          veiculoMenosLucrativo && veiculoMenosLucrativo.lucro < 0
            ? 'danger'
            : 'neutral'
        }
        principal={
          veiculoMenosLucrativo
            ? formatarMoeda(veiculoMenosLucrativo.lucro)
            : '—'
        }
        sub={
          veiculoMenosLucrativo ? (
            <>
              <span className="tabular font-medium text-zinc-700 dark:text-zinc-200">
                {veiculoMenosLucrativo.veiculo.placa}
              </span>{' '}
              · ROI {formatarPercentual(veiculoMenosLucrativo.roi, 1)}
              <br />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {veiculoMenosLucrativo.veiculo.marca}{' '}
                {veiculoMenosLucrativo.veiculo.modelo}
              </span>
            </>
          ) : (
            'Sem vendas no período.'
          )
        }
      />

      <CardDestaque
        titulo="Dias em estoque (média)"
        icone={<Clock size={16} />}
        tone="info"
        principal={
          mediaDiasEstoque > 0
            ? `${mediaDiasEstoque.toFixed(1)} dias`
            : '—'
        }
        sub="Tempo médio até a venda dos veículos vendidos no período."
      />

      <CardDestaque
        titulo="Ticket médio de venda"
        icone={<Wallet size={16} />}
        tone="primary"
        principal={formatarMoeda(ticketMedioVenda)}
        sub="Receita total ÷ quantidade de vendas no período."
      />

      <CardDestaque
        titulo="Forma de pagamento (compras)"
        icone={<Banknote size={16} />}
        tone="warning"
        principal={
          formaPagamentoTop ? capitalizar(formaPagamentoTop.forma) : '—'
        }
        sub={
          formaPagamentoTop
            ? `${formaPagamentoTop.qtd} compra(s) · ${formatarPercentual(
                formaPagamentoTop.percentual,
                0,
              )} do total`
            : 'Sem compras no período.'
        }
      />

      <CardDestaque
        titulo="Forma de recebimento (vendas)"
        icone={<WalletCards size={16} />}
        tone="success"
        principal={
          formaRecebimentoTop ? capitalizar(formaRecebimentoTop.forma) : '—'
        }
        sub={
          formaRecebimentoTop
            ? `${formaRecebimentoTop.qtd} venda(s) · ${formatarPercentual(
                formaRecebimentoTop.percentual,
                0,
              )} do total`
            : 'Sem vendas no período.'
        }
      />

      <CardDestaque
        titulo="Origem mais frequente"
        icone={<MapPin size={16} />}
        tone="info"
        principal={origemTop ? capitalizar(origemTop.origem) : '—'}
        sub={
          origemTop
            ? `${origemTop.qtd} compra(s) · ${formatarPercentual(
                origemTop.percentual,
                0,
              )} do total`
            : 'Sem compras no período.'
        }
      />
    </section>
  )
}

// -----------------------------------------------------------------------------
// Card de destaque genérico
// -----------------------------------------------------------------------------

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

const toneIcone: Record<Tone, string> = {
  neutral: 'bg-zinc-200 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  primary: 'bg-primary/15 text-primary',
}

function CardDestaque({
  titulo,
  icone,
  tone = 'neutral',
  principal,
  sub,
}: {
  titulo: string
  icone: ReactNode
  tone?: Tone
  principal: string
  sub: ReactNode
}) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {titulo}
        </p>
        <span
          className={[
            'grid h-8 w-8 place-items-center rounded-lg',
            toneIcone[tone],
          ].join(' ')}
        >
          {icone}
        </span>
      </div>
      <p className="tabular mt-2 text-lg font-semibold tracking-tight">
        {principal}
      </p>
      <p className="mt-1 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
        {sub}
      </p>
    </div>
  )
}

function capitalizar(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
