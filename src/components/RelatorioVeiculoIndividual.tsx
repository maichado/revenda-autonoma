// Relatório consolidado de um veículo específico — compra, despesas, venda e lucro.

import { useMemo } from 'react'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import {
  Car,
  CircleDollarSign,
  Clock,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Tags,
  TrendingUp,
} from 'lucide-react'

import { StatusBadge } from './Badge'
import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import {
  calcularDadosVeiculoIndividual,
  formatarDataBR,
  formatarMoedaBR,
  formatarPercentualBR,
  labelPeriodo,
  resumirDespesas,
  type Periodo,
} from '@/utils/relatorios'
import { rotuloExibicaoPagoPor } from '@/utils/despesaOrigem'
import {
  gerarTextoRelatorioVeiculoIndividual,
  type EstadoRelatorio,
} from '@/utils/relatoriosTexto'

interface Props {
  estado: EstadoRelatorio
  veiculoId: string
  periodo: Periodo
}

export function RelatorioVeiculoIndividual({
  estado,
  veiculoId,
  periodo,
}: Props) {
  const dados = useMemo(
    () =>
      calcularDadosVeiculoIndividual(
        veiculoId,
        estado.veiculos,
        estado.compras,
        estado.vendas,
        estado.despesas,
      ),
    [veiculoId, estado],
  )

  const texto = useMemo(
    () =>
      dados
        ? gerarTextoRelatorioVeiculoIndividual(estado, dados)
        : 'Veículo não encontrado.',
    [estado, dados],
  )

  if (!dados) {
    return (
      <div className="card mx-auto max-w-4xl p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Veículo não encontrado.
      </div>
    )
  }

  const { veiculo, compra, venda, despesasPorTipo, totalDespesas, custoTotal, lucro, roi, diasEmEstoque, receita, despesas } =
    dados
  const resumoDespesas = resumirDespesas(despesas)
  const nomeRevenda = estado.configuracoes.nome_revenda
  const socios = estado.configuracoes.socios
  const foto = veiculo.fotos?.[0]
  const statusExibicao = venda ? 'vendido' : veiculo.status

  return (
    <RelatorioLayout
      titulo={`Relatório do Veículo — ${veiculo.placa}`}
      periodoLabel={labelPeriodo(periodo)}
      descricao="Visão consolidada — compra, despesas, venda e resultado financeiro."
      slug={`veiculo-${veiculo.placa.toLowerCase()}`}
      texto={texto}
      habilitarPdf
      nomeRevenda={estado.configuracoes.nome_revenda || NOME_REVENDA_PADRAO}
      visual={
        <div className="space-y-6">
          {/* Identificação */}
          <section data-pdf-section="identificacao" className="card overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {foto ? (
                <div className="aspect-video w-full shrink-0 bg-zinc-100 sm:aspect-auto sm:h-40 sm:w-48 dark:bg-zinc-900">
                  <img
                    src={foto}
                    alt={`${veiculo.marca} ${veiculo.modelo}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="grid h-32 w-full place-items-center bg-zinc-100 sm:h-auto sm:w-48 dark:bg-zinc-900">
                  <Car size={32} className="text-zinc-400" />
                </div>
              )}
              <div className="flex flex-1 flex-col justify-center gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-bold tracking-wide">
                    {veiculo.placa}
                  </span>
                  <StatusBadge
                    status={
                      statusExibicao === 'vendido'
                        ? 'vendido'
                        : veiculo.status
                    }
                  />
                </div>
                <p className="text-sm font-medium">
                  {veiculo.marca} {veiculo.modelo} {veiculo.ano}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {veiculo.cor} ·{' '}
                  {veiculo.quilometragem.toLocaleString('pt-BR')} km
                </p>
              </div>
            </div>
          </section>

          {/* Compra */}
          <Secao pdfSection="compra" titulo="Compra" icone={<ShoppingBag size={14} />}>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Item label="Data">
                {formatarDataBR(compra?.data ?? veiculo.data_compra)}
              </Item>
              <Item label="Valor">{formatarMoedaBR(veiculo.valor_compra)}</Item>
              <Item label="Forma">
                {compra?.forma_pagamento ?? '—'}
              </Item>
              <Item label="Origem">{compra?.origem ?? '—'}</Item>
              <Item label="Vendedor" className="sm:col-span-2">
                {compra?.vendedor_nome ?? '—'}
              </Item>
            </dl>
          </Secao>

          {/* Despesas */}
          <Secao
            pdfSection="despesas"
            titulo={`Despesas (${formatarMoedaBR(totalDespesas)})`}
            icone={<Receipt size={14} />}
          >
            {despesasPorTipo.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhuma despesa vinculada a este veículo.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Todas as despesas vinculadas ao veículo (histórico completo).
                  Pago: {formatarMoedaBR(resumoDespesas.pago)} · Em aberto:{' '}
                  {formatarMoedaBR(resumoDespesas.aberto)}
                </p>
                {despesasPorTipo.map((grupo) => (
                  <div key={grupo.tipo}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide capitalize text-zinc-500 dark:text-zinc-400">
                        {grupo.tipo}
                      </span>
                      <span className="tabular text-sm font-semibold">
                        {formatarMoedaBR(grupo.total)}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {grupo.items.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-md border border-border-light px-3 py-1.5 text-xs dark:border-border-dark"
                        >
                          <span className="min-w-0 truncate">
                            <span className="tabular text-zinc-500 dark:text-zinc-400">
                              {formatarDataBR(d.data)}
                            </span>
                            {' · '}
                            {d.descricao || '—'}
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {' '}
                              ·{' '}
                              {rotuloExibicaoPagoPor(
                                d.pago_por,
                                nomeRevenda,
                                socios,
                              )}
                            </span>
                          </span>
                          <span className="tabular shrink-0 font-medium">
                            {formatarMoedaBR(d.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border-light pt-3 text-sm font-semibold dark:border-border-dark">
                  <span>
                    Total ({resumoDespesas.qtd}{' '}
                    {resumoDespesas.qtd === 1 ? 'lançamento' : 'lançamentos'})
                  </span>
                  <span className="tabular">{formatarMoedaBR(totalDespesas)}</span>
                </div>
              </div>
            )}
          </Secao>

          {/* Venda */}
          {venda ? (
            <Secao pdfSection="venda" titulo="Venda" icone={<Tags size={14} />}>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Item label="Data">{formatarDataBR(venda.data)}</Item>
                <Item label="Valor">{formatarMoedaBR(venda.valor_venda)}</Item>
                <Item label="Forma">{venda.forma_recebimento || '—'}</Item>
                <Item label="Comprador">{venda.comprador_nome || '—'}</Item>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
                <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Lucro: {formatarMoedaBR(lucro)} (ROI{' '}
                  {formatarPercentualBR(roi, 1)})
                </span>
              </div>
            </Secao>
          ) : (
            <Secao pdfSection="venda" titulo="Venda" icone={<Tags size={14} />}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Veículo ainda não vendido — margem pretendida:{' '}
                {formatarMoedaBR(veiculo.valor_venda_pretendido)}
              </p>
            </Secao>
          )}

          {/* Resumo financeiro */}
          <section
            data-pdf-section="resumo"
            className="relatorio-kpi-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            <KpiCard
              titulo="Custo total"
              valor={formatarMoedaBR(custoTotal)}
              icone={<CircleDollarSign size={16} />}
            />
            <KpiCard
              titulo="Despesas"
              valor={formatarMoedaBR(totalDespesas)}
              icone={<Receipt size={16} />}
            />
            <KpiCard
              titulo="Receita"
              valor={formatarMoedaBR(receita)}
              icone={<Tags size={16} />}
            />
            <KpiCard
              titulo="Lucro"
              valor={formatarMoedaBR(lucro)}
              icone={<PiggyBank size={16} />}
            />
            <KpiCard
              titulo="Dias em estoque"
              valor={String(diasEmEstoque)}
              icone={<Clock size={16} />}
            />
          </section>
        </div>
      }
    />
  )
}

function Secao({
  titulo,
  icone,
  children,
  pdfSection,
}: {
  titulo: string
  icone: React.ReactNode
  children: React.ReactNode
  pdfSection?: string
}) {
  return (
    <section data-pdf-section={pdfSection} className="card p-5">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <span className="text-primary">{icone}</span>
        <h3 className="font-semibold">{titulo}</h3>
      </div>
      {children}
    </section>
  )
}

function Item({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium capitalize">{children}</dd>
    </div>
  )
}
