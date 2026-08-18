// Card do Dashboard: resumo compacto; clique abre modal com detalhes completos.

import { useState } from 'react'
import {
  Calendar,
  Car,
  Expand,
  Gauge,
  Tags,
  Wallet,
} from 'lucide-react'
import type { Despesa, Veiculo, Venda } from '@/types'
import {
  receitaRealizadaDaVenda,
  resumoFinanceiroVeiculo,
} from '@/utils/calculos'
import {
  formatarDataCurta,
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { MetricasTempoVeiculo } from '@/utils/tempoVeiculo'
import { StatusBadge } from './Badge'
import { Modal } from './Modal'
import { TempoEstoqueResumo } from './TempoEstoqueResumo'
import {
  RelacaoOrigemTrocaInfo,
  TrocaNaVendaInfo,
} from './TrocaVeiculoInfo'

interface Props {
  veiculo: Veiculo
  metricas: MetricasTempoVeiculo
  venda?: Venda
  veiculosPorId?: Record<string, Veiculo | undefined>
  vendas?: Venda[]
  despesas?: Despesa[]
  compact?: boolean
}

export function EstoqueTempoCard({
  veiculo,
  metricas,
  venda,
  veiculosPorId = {},
  vendas = [],
  despesas = [],
  compact = false,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const foto = veiculo.fotos[0]
  const vendido = veiculo.status === 'vendido'
  const dataCompra = veiculo.data_compra
    ? formatarDataCurta(veiculo.data_compra)
    : null
  const temTrocaNaVenda =
    !!venda &&
    ((Number(venda.valor_troca) || 0) > 0 || !!venda.troca_veiculo_id)

  const resumo = resumoFinanceiroVeiculo(veiculo, despesas, venda, vendas)

  const blocoTrocasCompacto = (
    <>
      {temTrocaNaVenda && venda && (
        <TrocaNaVendaInfo
          venda={venda}
          veiculosPorId={veiculosPorId}
          veiculoVendido={veiculo}
          variant="compact"
        />
      )}
      {vendas.length > 0 && (
        <RelacaoOrigemTrocaInfo
          veiculo={veiculo}
          vendas={vendas}
          veiculosPorId={veiculosPorId}
          variant="compact"
        />
      )}
    </>
  )

  const tituloModal = `${veiculo.marca} ${veiculo.modelo}`
  const descModal = [
    veiculo.placa,
    veiculo.ano,
    veiculo.cor,
    vendido ? 'Vendido' : veiculo.status,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={[
          'card card-hover w-full cursor-pointer text-left transition',
          'hover:ring-2 hover:ring-primary/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          compact
            ? 'flex gap-3 overflow-hidden p-3'
            : 'overflow-hidden',
          vendido ? 'opacity-90' : '',
        ].join(' ')}
      >
        {compact ? (
          <>
            <Thumb foto={foto} veiculo={veiculo} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="tabular text-xs font-semibold tracking-wide">
                  {veiculo.placa}
                </span>
                <StatusBadge status={veiculo.status} />
              </div>
              <p className="truncate text-sm font-medium leading-tight">
                {veiculo.marca} {veiculo.modelo}{' '}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  · {veiculo.ano}
                </span>
              </p>
              {dataCompra && (
                <p className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <Calendar size={11} className="shrink-0 opacity-70" />
                  Compra{' '}
                  <span className="tabular font-semibold text-zinc-700 dark:text-zinc-200">
                    {dataCompra}
                  </span>
                </p>
              )}
              <TempoEstoqueResumo metricas={metricas} variant="compact" />
              {blocoTrocasCompacto}
              <RodapeValor
                vendido={vendido}
                venda={venda}
                veiculo={veiculo}
                temTroca={temTrocaNaVenda}
              />
              <p className="flex items-center gap-1 text-[10px] text-primary/80">
                <Expand size={11} />
                Clique para detalhes
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-white/[0.04]">
              {foto ? (
                <img
                  src={foto}
                  alt={`${veiculo.marca} ${veiculo.modelo} — ${veiculo.placa}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600">
                  <Car size={48} strokeWidth={1.15} />
                  <span className="text-[11px] uppercase tracking-wide">
                    Sem foto
                  </span>
                </div>
              )}
              <div className="absolute left-3 top-3">
                <StatusBadge status={veiculo.status} />
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div>
                <span className="tabular inline-block rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                  {veiculo.placa}
                </span>
                <h3 className="mt-2 text-base font-semibold leading-tight">
                  {veiculo.marca}{' '}
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {veiculo.modelo}
                  </span>
                </h3>
                {dataCompra && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar size={12} className="shrink-0 opacity-70" />
                    Comprado em{' '}
                    <span className="tabular font-semibold text-zinc-700 dark:text-zinc-200">
                      {dataCompra}
                    </span>
                  </p>
                )}
              </div>
              <TempoEstoqueResumo metricas={metricas} variant="detalhado" />
              {blocoTrocasCompacto}
              <RodapeValor
                vendido={vendido}
                venda={venda}
                veiculo={veiculo}
                temTroca={temTrocaNaVenda}
              />
              <p className="flex items-center gap-1 text-[10px] text-primary/80">
                <Expand size={11} />
                Clique para detalhes
              </p>
            </div>
          </>
        )}
      </button>

      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        size="lg"
        title={tituloModal}
        description={descModal}
      >
        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border-light bg-zinc-100 dark:border-border-dark dark:bg-white/[0.04]">
            {foto ? (
              <img
                src={foto}
                alt={tituloModal}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400">
                <Car size={48} strokeWidth={1.15} />
                <span className="text-xs">Sem foto</span>
              </div>
            )}
            <div className="absolute left-3 top-3">
              <StatusBadge status={veiculo.status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider dark:border-border-dark dark:bg-white/[0.06]">
              {veiculo.placa}
            </span>
            {veiculo.tipo_propriedade === 'meia' && (
              <span className="badge bg-amber-500/15 text-amber-600 dark:text-amber-400">
                A meia
                {veiculo.socio_parceiro ? ` · ${veiculo.socio_parceiro}` : ''}
              </span>
            )}
            {veiculo.categoria === 'moto' && (
              <span className="badge bg-sky-500/15 text-sky-600 dark:text-sky-400">
                Moto
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <ItemDetalhe
              rotulo="Compra"
              valor={dataCompra ?? '—'}
              icone={<Calendar size={14} />}
            />
            <ItemDetalhe
              rotulo="Valor compra"
              valor={formatarMoeda(veiculo.valor_compra)}
              icone={<Wallet size={14} />}
            />
            {venda ? (
              <ItemDetalhe
                rotulo="Venda"
                valor={formatarDataCurta(venda.data)}
                icone={<Tags size={14} />}
              />
            ) : (
              <ItemDetalhe
                rotulo="Pretendido"
                valor={formatarMoeda(veiculo.valor_venda_pretendido)}
                icone={<Tags size={14} />}
              />
            )}
          </dl>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Tempo no negócio
            </h3>
            <TempoEstoqueResumo metricas={metricas} variant="detalhado" />
          </section>

          {temTrocaNaVenda && venda && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Negócio com troca
              </h3>
              <TrocaNaVendaInfo
                venda={venda}
                veiculosPorId={veiculosPorId}
                veiculoVendido={veiculo}
                variant="relatorio"
              />
            </section>
          )}

          {vendas.length > 0 && (
            <RelacaoOrigemTrocaInfo
              veiculo={veiculo}
              vendas={vendas}
              veiculosPorId={veiculosPorId}
              variant="card"
            />
          )}

          <section className="grid grid-cols-2 gap-3 rounded-xl border border-border-light bg-zinc-50/80 p-3 dark:border-border-dark dark:bg-white/[0.03]">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {resumo.rotuloVenda}
                {temTrocaNaVenda ? ' (dinheiro)' : ''}
              </p>
              <p className="tabular text-lg font-semibold">
                {formatarMoeda(resumo.valorVenda)}
              </p>
              {temTrocaNaVenda && venda && (
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Negócio {formatarMoeda(venda.valor_venda)}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                Lucro {resumo.vendido ? '' : '(est.)'}
              </p>
              <p
                className={[
                  'tabular text-lg font-bold',
                  resumo.lucroLiquido >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                ].join(' ')}
              >
                {resumo.lucroLiquido >= 0 ? '+' : ''}
                {formatarMoeda(resumo.lucroLiquido)}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Gauge size={11} />
                Margem {formatarPercentual(resumo.margemPercentual, 1)}
              </p>
            </div>
            {veiculo.tipo_propriedade === 'meia' && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Sua parte
                  </p>
                  <p className="tabular font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(resumo.lucroMeu)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Sócio
                  </p>
                  <p className="tabular font-semibold text-amber-700 dark:text-amber-300">
                    {formatarMoeda(resumo.lucroSocio)}
                  </p>
                </div>
              </>
            )}
          </section>

          {venda?.comprador_nome && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Comprador:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {venda.comprador_nome}
              </span>
              {venda.forma_recebimento
                ? ` · ${venda.forma_recebimento}`
                : ''}
            </p>
          )}
        </div>
      </Modal>
    </>
  )
}

function Thumb({
  foto,
  veiculo,
}: {
  foto?: string
  veiculo: Veiculo
}) {
  return (
    <div className="relative h-[4.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-lg border border-border-light bg-zinc-100 dark:border-border-dark dark:bg-white/[0.04]">
      {foto ? (
        <img
          src={foto}
          alt={`${veiculo.marca} ${veiculo.modelo}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
          <Car size={22} strokeWidth={1.25} />
        </div>
      )}
    </div>
  )
}

function ItemDetalhe({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string
  valor: string
  icone: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border-light bg-white/60 px-3 py-2 dark:border-border-dark dark:bg-black/20">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
        {icone}
        {rotulo}
      </dt>
      <dd className="tabular mt-0.5 text-sm font-semibold">{valor}</dd>
    </div>
  )
}

function RodapeValor({
  vendido,
  venda,
  veiculo,
  temTroca,
}: {
  vendido: boolean
  venda?: Venda
  veiculo: Veiculo
  temTroca: boolean
}) {
  if (vendido && venda) {
    const dinheiro = receitaRealizadaDaVenda(venda)
    const valorTroca = Number(venda.valor_troca) || 0
    return (
      <div className="space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        <p>
          Vendido em{' '}
          <span className="tabular font-medium text-zinc-700 dark:text-zinc-200">
            {formatarDataCurta(venda.data)}
          </span>
        </p>
        {temTroca ? (
          <>
            <p>
              Dinheiro{' '}
              <span className="tabular font-semibold text-zinc-800 dark:text-zinc-100">
                {formatarMoeda(dinheiro)}
              </span>
              {valorTroca > 0 && (
                <>
                  {' '}
                  + troca{' '}
                  <span className="tabular font-semibold text-amber-700 dark:text-amber-300">
                    {formatarMoeda(valorTroca)}
                  </span>
                </>
              )}
            </p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Negócio total{' '}
              <span className="tabular font-medium">
                {formatarMoeda(venda.valor_venda)}
              </span>
            </p>
          </>
        ) : (
          <p>
            Vendido por{' '}
            <span className="tabular font-semibold text-zinc-800 dark:text-zinc-100">
              {formatarMoeda(dinheiro)}
            </span>
          </p>
        )}
      </div>
    )
  }
  if (vendido) {
    return (
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vendido</p>
    )
  }
  return (
    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
      Pretendido{' '}
      <span className="tabular font-semibold text-zinc-800 dark:text-zinc-100">
        {formatarMoeda(veiculo.valor_venda_pretendido)}
      </span>
    </p>
  )
}
