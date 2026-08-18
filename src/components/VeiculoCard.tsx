import { useEffect, useRef, useState } from 'react'
import {
  Gauge,
  Megaphone,
  MoreVertical,
  Pencil,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import type { Veiculo, Venda } from '@/types'
import type { ResumoFinanceiroVeiculo } from '@/utils/calculos'
import { StatusBadge } from './Badge'
import { FotoCarrossel } from './FotoCarrossel'
import { TempoEstoqueResumo } from './TempoEstoqueResumo'
import {
  TrocaNaVendaInfo,
  TrocaOrigemEstoqueInfo,
} from './TrocaVeiculoInfo'
import { formatarMoeda, formatarPercentual } from '@/utils/formatadores'
import { calcularMetricasTempoVeiculo } from '@/utils/tempoVeiculo'

interface Props {
  veiculo: Veiculo
  resumo: ResumoFinanceiroVeiculo
  venda?: Venda
  /** Mapa de veículos — resolve o bem da troca (ex.: BIZ) no card do vendido. */
  veiculosPorId: Record<string, Veiculo | undefined>
  /** Se este veículo entrou por troca, a venda de origem (ex.: venda do Uno). */
  vendaOrigemTroca?: Venda
  onEditar: () => void
  onExcluir: () => void
  onRegistrarVenda: () => void
  onGerarAnuncio: () => void
}

function classesLucro(valor: number): string {
  if (valor < 0) return 'text-red-600 dark:text-red-400'
  if (valor > 0) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-zinc-600 dark:text-zinc-400'
}

function classesMargem(margem: number): string {
  if (margem < 0) return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (margem < 10) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
  return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
}

// Card padrão da listagem do estoque.
export function VeiculoCard({
  veiculo,
  resumo,
  venda,
  veiculosPorId,
  vendaOrigemTroca,
  onEditar,
  onExcluir,
  onRegistrarVenda,
  onGerarAnuncio,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  const podeVender = veiculo.status === 'disponível'
  const metricasTempo = calcularMetricasTempoVeiculo(veiculo, venda)

  return (
    <article
      className={[
        'card card-hover group relative flex flex-col overflow-hidden',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-card-dark',
      ].join(' ')}
    >
      <div className="relative">
        <FotoCarrossel
          fotos={veiculo.fotos ?? []}
          alt={`${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`}
        />

        <div className="pointer-events-none absolute left-3 top-3 z-[2]">
          <div className="pointer-events-auto">
            <StatusBadge status={veiculo.status} />
          </div>
        </div>

        <div ref={menuRef} className="absolute right-2 top-2 z-[2]">
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
                onClick={() => {
                  setMenuAberto(false)
                  onGerarAnuncio()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                <Megaphone size={14} /> Gerar anúncio
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

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
              {veiculo.placa}
            </span>
            {veiculo.categoria === 'moto' && (
              <span className="badge bg-sky-500/15 text-sky-700 dark:text-sky-300">
                Moto
              </span>
            )}
          </div>
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

        {venda && (
          <TrocaNaVendaInfo
            venda={venda}
            veiculosPorId={veiculosPorId}
            variant="card"
          />
        )}

        {vendaOrigemTroca && (
          <TrocaOrigemEstoqueInfo
            veiculo={veiculo}
            vendaOrigem={vendaOrigemTroca}
            veiculoVendido={veiculosPorId[vendaOrigemTroca.veiculo_id]}
            variant="card"
          />
        )}

        <div className="mt-auto space-y-2 border-t border-border-light pt-2 dark:border-border-dark">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {resumo.rotuloVenda}
                {venda && (Number(venda.valor_troca) || 0) > 0
                  ? ' (dinheiro)'
                  : ''}
              </p>
              <p className="tabular text-lg font-semibold tracking-tight">
                {formatarMoeda(resumo.valorVenda)}
              </p>
            </div>
            <span
              className={['badge whitespace-nowrap', classesMargem(resumo.margemPercentual)].join(
                ' ',
              )}
              title="Margem sobre o valor de compra"
            >
              <Gauge size={11} />
              <span className="tabular">
                {formatarPercentual(resumo.margemPercentual, 1)}
              </span>
            </span>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Lucro líquido
                {resumo.vendido ? '' : ' (est.)'}
              </p>
              <p
                className={[
                  'tabular text-base font-bold',
                  classesLucro(resumo.lucroLiquido),
                ].join(' ')}
              >
                {resumo.lucroLiquido >= 0 ? '+' : ''}
                {formatarMoeda(resumo.lucroLiquido)}
              </p>
            </div>
            {veiculo.tipo_propriedade === 'meia' && (
              <p className="text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                Sua parte
                <span
                  className={[
                    'ml-1 tabular font-semibold',
                    classesLucro(resumo.lucroMeu),
                  ].join(' ')}
                >
                  {formatarMoeda(resumo.lucroMeu)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
