import { useEffect, useRef, useState } from 'react'
import {
  Car,
  Gauge,
  MoreVertical,
  Pencil,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import type { Veiculo, Venda } from '@/types'
import { StatusBadge } from './Badge'
import { TempoEstoqueResumo } from './TempoEstoqueResumo'
import { formatarMoeda, formatarPercentual } from '@/utils/formatadores'
import { calcularMetricasTempoVeiculo } from '@/utils/tempoVeiculo'

interface Props {
  veiculo: Veiculo
  margemEsperada: number
  venda?: Venda
  onEditar: () => void
  onExcluir: () => void
  onRegistrarVenda: () => void
}

// Card padrão da listagem do estoque.
export function VeiculoCard({
  veiculo,
  margemEsperada,
  venda,
  onEditar,
  onExcluir,
  onRegistrarVenda,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora.
  useEffect(() => {
    if (!menuAberto) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuAberto])

  const fotoCapa = veiculo.fotos[0]

  // Cor da pill de margem: >=10% verde, 0-10% âmbar, <0 vermelho.
  let pillMargemClasse =
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (margemEsperada < 0) {
    pillMargemClasse = 'bg-red-500/15 text-red-600 dark:text-red-400'
  } else if (margemEsperada < 10) {
    pillMargemClasse = 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  }

  const podeVender = veiculo.status === 'disponível'
  const metricasTempo = calcularMetricasTempoVeiculo(veiculo, venda)

  return (
    <article
      className={[
        'card card-hover group relative flex flex-col overflow-hidden',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-card-dark',
      ].join(' ')}
    >
      {/* Foto / placeholder */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-white/[0.04]">
        {fotoCapa ? (
          <img
            src={fotoCapa}
            alt={`${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
            <Car size={40} strokeWidth={1.25} />
            <span className="text-[11px] uppercase tracking-wide">
              Sem foto
            </span>
          </div>
        )}

        {/* Status no canto */}
        <div className="absolute left-3 top-3">
          <StatusBadge status={veiculo.status} />
        </div>

        {/* Menu de ações */}
        <div ref={menuRef} className="absolute right-2 top-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuAberto((s) => !s)
            }}
            aria-label="Abrir menu de ações"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            className={[
              'btn-press grid h-8 w-8 place-items-center rounded-full',
              'bg-black/55 text-white backdrop-blur-sm hover:bg-black/75',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            ].join(' ')}
          >
            <MoreVertical size={16} />
          </button>
          {menuAberto && (
            <div
              role="menu"
              className={[
                'absolute right-0 top-10 z-10 w-48 overflow-hidden rounded-lg border',
                'border-border-light bg-surface-light shadow-lg',
                'dark:border-border-dark dark:bg-surface-dark',
                'animate-fade-in',
              ].join(' ')}
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuAberto(false)
                  onEditar()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                role="menuitem"
                type="button"
                disabled={!podeVender}
                onClick={() => {
                  setMenuAberto(false)
                  if (podeVender) onRegistrarVenda()
                }}
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  podeVender
                    ? 'hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    : 'cursor-not-allowed text-zinc-400 dark:text-zinc-600',
                ].join(' ')}
              >
                <Tag size={14} /> Registrar venda
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuAberto(false)
                  onExcluir()
                }}
                className="flex w-full items-center gap-2 border-t border-border-light px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 dark:border-border-dark dark:text-red-400"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
            {veiculo.placa}
          </span>
          <span className="tabular text-[11px] text-zinc-500 dark:text-zinc-400">
            {veiculo.ano} • {veiculo.cor}
          </span>
        </div>

        <h3 className="text-sm font-semibold leading-tight">
          {veiculo.marca}{' '}
          <span className="text-zinc-600 dark:text-zinc-300">
            {veiculo.modelo}
          </span>
        </h3>

        {veiculo.tipo_propriedade === 'meia' && (
          <span
            className="badge w-fit bg-amber-500/15 text-amber-600 dark:text-amber-400"
            title={
              veiculo.socio_parceiro
                ? `Carro a meia com ${veiculo.socio_parceiro} — lucro dividido 50/50`
                : 'Carro a meia — lucro dividido 50/50'
            }
          >
            <Users size={11} />
            A meia
            {veiculo.socio_parceiro ? ` · ${veiculo.socio_parceiro}` : ''}
          </span>
        )}

        <TempoEstoqueResumo metricas={metricasTempo} className="mt-1" />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Venda pretendida
            </p>
            <p className="tabular text-lg font-semibold tracking-tight">
              {formatarMoeda(veiculo.valor_venda_pretendido)}
            </p>
          </div>
          <span
            className={[
              'badge whitespace-nowrap',
              pillMargemClasse,
            ].join(' ')}
            title="Margem esperada = (venda − compra − despesas) / compra"
          >
            <Gauge size={11} />
            <span className="tabular">
              {formatarPercentual(margemEsperada, 1)}
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}
