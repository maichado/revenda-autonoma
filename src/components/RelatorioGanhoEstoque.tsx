// Relatório de ganho — a meia (caixa + vendidos + estoque) ou só seus (estoque).

import { useMemo } from 'react'
import {
  Car,
  CircleDollarSign,
  History,
  PiggyBank,
  Target,
  Users,
  Wallet,
} from 'lucide-react'

import { KpiCard } from './KpiCard'
import { RelatorioLayout } from './RelatorioLayout'
import {
  PainelTrocasRelatorio,
  TrocaNaVendaInfo,
  TrocaOrigemEstoqueInfo,
} from './TrocaVeiculoInfo'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import {
  calcularGanhoEstoque,
  calcularRelatorioGanhoMeia,
  formatarDataBR,
  formatarMoedaBR,
  formatarPercentualBR,
  type EscopoGanhoEstoque,
} from '@/utils/relatorios'
import {
  gerarTextoRelatorioGanhoEstoque,
  type EstadoRelatorio,
} from '@/utils/relatoriosTexto'
import {
  resumirTrocasPeriodo,
  vendaOrigemDaTroca,
} from '@/utils/trocaVenda'

interface Props {
  estado: EstadoRelatorio
  escopo: EscopoGanhoEstoque
}

export function RelatorioGanhoEstoque({ estado, escopo }: Props) {
  const isMeia = escopo === 'meia'

  const meia = useMemo(
    () =>
      isMeia
        ? calcularRelatorioGanhoMeia(
            estado.veiculos,
            estado.vendas,
            estado.despesas,
            estado.configuracoes,
          )
        : null,
    [isMeia, estado],
  )

  const potencial = useMemo(
    () =>
      meia?.potencial ??
      calcularGanhoEstoque(estado.veiculos, estado.despesas, escopo),
    [meia, estado.veiculos, estado.despesas, escopo],
  )

  const veiculosPorId = useMemo(() => {
    const map: Record<string, (typeof estado.veiculos)[number]> = {}
    for (const v of estado.veiculos) map[v.id] = v
    return map
  }, [estado.veiculos])

  const resumoTrocasMeia = useMemo(() => {
    if (!meia) return null
    const vendasMeia = meia.realizado.linhas.map((l) => l.venda)
    return resumirTrocasPeriodo(vendasMeia, veiculosPorId)
  }, [meia, veiculosPorId])

  const texto = useMemo(
    () => gerarTextoRelatorioGanhoEstoque(estado, escopo),
    [estado, escopo],
  )

  const titulo = isMeia
    ? 'Ganho a meia — caixa, vendidos e estoque'
    : 'Ganho potencial — Meus'
  const descricao = isMeia
    ? 'Caixa do giro a meia, lucro dos carros já vendidos e projeção do que ainda está em estoque.'
    : 'Projeção com os veículos 100% seus em estoque. Valores pretendidos − custo investido.'

  return (
    <RelatorioLayout
      titulo={titulo}
      periodoLabel={isMeia ? 'Histórico completo + estoque' : 'Estoque atual'}
      descricao={descricao}
      slug={isMeia ? 'ganho-meia' : 'ganho-meus'}
      texto={texto}
      habilitarPdf
      nomeRevenda={estado.configuracoes.nome_revenda || NOME_REVENDA_PADRAO}
      visual={
        <div className="space-y-6">
          {isMeia && meia ? (
            <>
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Caixa revenda (a meia)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Dinheiro líquido no giro compartilhado — mesmos números do
                    Banco Pessoal.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiCard
                    titulo="Em caixa"
                    valor={formatarMoedaBR(meia.caixa.saldo)}
                    icone={<Wallet size={16} />}
                    detalhe={
                      <span className="text-[11px] text-zinc-500">
                        Giro total {formatarMoedaBR(meia.caixa.totalNoGiro)}
                      </span>
                    }
                  />
                  <KpiCard
                    titulo={`Sua metade (${meia.nomeDono})`}
                    valor={formatarMoedaBR(meia.caixa.parteDono)}
                    icone={<PiggyBank size={16} />}
                  />
                  <KpiCard
                    titulo={`Sócio (${meia.nomeSocio || 'parceiro'})`}
                    valor={formatarMoedaBR(meia.caixa.parteSocio)}
                    icone={<Users size={16} />}
                  />
                  <KpiCard
                    titulo="Em carros (giro)"
                    valor={formatarMoedaBR(meia.caixa.emCarros)}
                    icone={<Car size={16} />}
                    detalhe={
                      meia.caixa.totalDespesas > 0 ? (
                        <span className="text-[11px] text-zinc-500">
                          Despesas já gastas:{' '}
                          {formatarMoedaBR(meia.caixa.totalDespesas)}
                        </span>
                      ) : undefined
                    }
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
                    <History size={14} />
                    Histórico — carros a meia vendidos
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Lucro realizado de todas as vendas a meia (não só o estoque
                    atual).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KpiCard
                    titulo="Vendidos"
                    valor={String(meia.realizado.qtd)}
                    icone={<History size={16} />}
                  />
                  <KpiCard
                    titulo="Lucro bruto"
                    valor={formatarMoedaBR(meia.realizado.lucroBruto)}
                    icone={<CircleDollarSign size={16} />}
                  />
                  <KpiCard
                    titulo="Sua parte"
                    valor={formatarMoedaBR(meia.realizado.lucroMeu)}
                    icone={<PiggyBank size={16} />}
                  />
                  <KpiCard
                    titulo="Parte do sócio"
                    valor={formatarMoedaBR(meia.realizado.lucroSocio)}
                    icone={<Users size={16} />}
                  />
                </div>

                {resumoTrocasMeia && resumoTrocasMeia.quantidade > 0 && (
                  <PainelTrocasRelatorio
                    resumo={resumoTrocasMeia}
                    veiculosPorId={veiculosPorId}
                    titulo="Trocas nas vendas a meia"
                    subtitulo="Como cada negócio foi feito: dinheiro + bem que entrou no estoque"
                  />
                )}

                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        <th className="px-3 py-2 font-medium">Data</th>
                        <th className="px-3 py-2 font-medium">
                          Veículo / Troca
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Caixa na venda
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Lucro
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Sua parte
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Sócio
                        </th>
                      </tr>
                    </thead>
                    <tbody className="table-row-zebra table-row-hover">
                      {meia.realizado.linhas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            Nenhum carro a meia vendido ainda.
                          </td>
                        </tr>
                      ) : (
                        meia.realizado.linhas.map((l) => {
                          const cor =
                            l.lucroBruto >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          const temTroca =
                            (Number(l.venda.valor_troca) || 0) > 0 ||
                            !!l.venda.troca_veiculo_id
                          return (
                            <tr
                              key={l.venda.id}
                              className="border-t border-border-light dark:border-border-dark"
                            >
                              <td className="tabular px-3 py-2 text-xs text-zinc-500 align-top">
                                {formatarDataBR(l.data)}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <p className="tabular font-semibold">
                                  {l.veiculo.placa}
                                </p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {l.veiculo.marca} {l.veiculo.modelo}
                                  {l.veiculo.socio_parceiro
                                    ? ` · ${l.veiculo.socio_parceiro}`
                                    : ''}
                                </p>
                                {temTroca && (
                                  <TrocaNaVendaInfo
                                    venda={l.venda}
                                    veiculosPorId={veiculosPorId}
                                    variant="compact"
                                    veiculoVendido={l.veiculo}
                                  />
                                )}
                              </td>
                              <td className="tabular px-3 py-2 text-right align-top">
                                <div>{formatarMoedaBR(l.valorCaixa)}</div>
                                {temTroca && (
                                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                    só dinheiro
                                  </span>
                                )}
                              </td>
                              <td
                                className={[
                                  'tabular px-3 py-2 text-right font-semibold align-top',
                                  cor,
                                ].join(' ')}
                              >
                                {formatarMoedaBR(l.lucroBruto)}
                              </td>
                              <td className="tabular px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300 align-top">
                                {formatarMoedaBR(l.lucroMeu)}
                              </td>
                              <td className="tabular px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300 align-top">
                                {formatarMoedaBR(l.lucroSocio)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                    {meia.realizado.linhas.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-border-light bg-zinc-50/60 text-sm dark:border-border-dark dark:bg-white/[0.03]">
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                          >
                            Totais ({meia.realizado.qtd})
                          </td>
                          <td
                            className={[
                              'tabular px-3 py-2 text-right font-semibold',
                              meia.realizado.lucroBruto >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400',
                            ].join(' ')}
                          >
                            {formatarMoedaBR(meia.realizado.lucroBruto)}
                          </td>
                          <td className="tabular px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                            {formatarMoedaBR(meia.realizado.lucroMeu)}
                          </td>
                          <td className="tabular px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">
                            {formatarMoedaBR(meia.realizado.lucroSocio)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </section>
            </>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Snapshot do estoque agora — independente do período selecionado.
              O ganho só se concretiza na venda pelo preço pretendido.
            </p>
          )}

          <section className="space-y-3">
            {isMeia && meia ? (
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Potencial — caixa + o que vai ser vendido
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Em caixa hoje + venda pretendida do estoque a meia (50/50).
                </p>
              </div>
            ) : null}

            {isMeia && meia && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <KpiCard
                    titulo="Em caixa"
                    valor={formatarMoedaBR(meia.potencialComCaixa.emCaixa)}
                    icone={<Wallet size={16} />}
                  />
                  <KpiCard
                    titulo="Valor no negócio"
                    valor={formatarMoedaBR(
                      meia.potencialComCaixa.valorColocado,
                    )}
                    icone={<CircleDollarSign size={16} />}
                    detalhe={
                      <span className="text-[11px] text-zinc-500">
                        compra + despesas
                      </span>
                    }
                  />
                  <KpiCard
                    titulo="Vai ser vendido"
                    valor={formatarMoedaBR(
                      meia.potencialComCaixa.vendaPretendida,
                    )}
                    icone={<Target size={16} />}
                    detalhe={
                      <span className="text-[11px] text-zinc-500">
                        {potencial.qtd} em estoque
                      </span>
                    }
                  />
                  <KpiCard
                    titulo="Potencial total"
                    valor={formatarMoedaBR(meia.potencialComCaixa.total)}
                    icone={<PiggyBank size={16} />}
                    detalhe={
                      <span className="text-[11px] text-zinc-500">
                        caixa + pretendido
                      </span>
                    }
                  />
                  <KpiCard
                    titulo="Sua metade"
                    valor={formatarMoedaBR(meia.potencialComCaixa.parteDono)}
                    icone={<Users size={16} />}
                    detalhe={
                      <span className="text-[11px] text-zinc-500">
                        Sócio:{' '}
                        {formatarMoedaBR(meia.potencialComCaixa.parteSocio)}
                      </span>
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Sua metade (caixa + vendas)
                    </p>
                    <p className="tabular text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatarMoedaBR(meia.potencialComCaixa.parteDono)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3">
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      <Users size={11} /> Metade do sócio
                    </p>
                    <p className="tabular text-lg font-semibold text-amber-700 dark:text-amber-300">
                      {formatarMoedaBR(meia.potencialComCaixa.parteSocio)}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Detalhe do estoque (ganho = pretendido − compra − despesas):
                  bruto {formatarMoedaBR(potencial.ganhoBruto)} · você{' '}
                  {formatarMoedaBR(potencial.ganhoMeu)} · sócio{' '}
                  {formatarMoedaBR(potencial.ganhoSocio)}
                </p>
              </>
            )}

            {!isMeia && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  titulo="Em estoque"
                  valor={String(potencial.qtd)}
                  icone={<Car size={16} />}
                />
                <KpiCard
                  titulo="Investido"
                  valor={formatarMoedaBR(potencial.investido)}
                  icone={<Wallet size={16} />}
                />
                <KpiCard
                  titulo="Venda pretendida"
                  valor={formatarMoedaBR(potencial.vendaPretendida)}
                  icone={<Target size={16} />}
                />
                <KpiCard
                  titulo="Ganho potencial"
                  valor={formatarMoedaBR(potencial.ganhoMeu)}
                  icone={<PiggyBank size={16} />}
                  detalhe={
                    <span className="text-[11px] text-zinc-500">100% seu</span>
                  }
                />
              </div>
            )}

            <div className="card overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="px-3 py-2 font-medium">Veículo</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Investido
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Pretendido
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Ganho bruto
                    </th>
                    {isMeia && (
                      <>
                        <th className="px-3 py-2 text-right font-medium">
                          Sua parte
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Sócio
                        </th>
                      </>
                    )}
                    <th className="px-3 py-2 text-right font-medium">Margem</th>
                  </tr>
                </thead>
                <tbody className="table-row-zebra table-row-hover">
                  {potencial.linhas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isMeia ? 7 : 5}
                        className="px-3 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400"
                      >
                        {isMeia
                          ? 'Nenhum veículo a meia em estoque no momento.'
                          : 'Nenhum veículo 100% seu em estoque no momento.'}
                      </td>
                    </tr>
                  ) : (
                    potencial.linhas.map((l) => {
                      const cor =
                        l.ganhoBruto >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      const origemTroca = vendaOrigemDaTroca(
                        l.veiculo.id,
                        estado.vendas,
                      )
                      const vendidoOrigem = origemTroca
                        ? veiculosPorId[origemTroca.veiculo_id]
                        : undefined
                      return (
                        <tr
                          key={l.veiculo.id}
                          className="border-t border-border-light dark:border-border-dark"
                        >
                          <td className="px-3 py-2">
                            <p className="tabular font-semibold">
                              {l.veiculo.placa}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {l.veiculo.marca} {l.veiculo.modelo}
                              {l.veiculo.categoria === 'moto' ? ' · moto' : ''}
                              {isMeia && l.veiculo.socio_parceiro
                                ? ` · ${l.veiculo.socio_parceiro}`
                                : ''}
                            </p>
                            {origemTroca && (
                              <TrocaOrigemEstoqueInfo
                                veiculo={l.veiculo}
                                vendaOrigem={origemTroca}
                                veiculoVendido={vendidoOrigem}
                                variant="compact"
                              />
                            )}
                          </td>
                          <td className="tabular px-3 py-2 text-right">
                            {formatarMoedaBR(l.investido)}
                          </td>
                          <td className="tabular px-3 py-2 text-right font-medium">
                            {formatarMoedaBR(l.vendaPretendida)}
                          </td>
                          <td
                            className={[
                              'tabular px-3 py-2 text-right font-semibold',
                              cor,
                            ].join(' ')}
                          >
                            {formatarMoedaBR(l.ganhoBruto)}
                          </td>
                          {isMeia && (
                            <>
                              <td className="tabular px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                                {formatarMoedaBR(l.ganhoMeu)}
                              </td>
                              <td className="tabular px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">
                                {formatarMoedaBR(l.ganhoSocio)}
                              </td>
                            </>
                          )}
                          <td
                            className={[
                              'tabular px-3 py-2 text-right',
                              cor,
                            ].join(' ')}
                          >
                            {formatarPercentualBR(l.margemPercentual, 1)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {potencial.linhas.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border-light bg-zinc-50/60 text-sm dark:border-border-dark dark:bg-white/[0.03]">
                      <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        Totais ({potencial.qtd})
                      </td>
                      <td className="tabular px-3 py-2 text-right font-semibold">
                        {formatarMoedaBR(potencial.investido)}
                      </td>
                      <td className="tabular px-3 py-2 text-right font-semibold">
                        {formatarMoedaBR(potencial.vendaPretendida)}
                      </td>
                      <td
                        className={[
                          'tabular px-3 py-2 text-right font-semibold',
                          potencial.ganhoBruto >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400',
                        ].join(' ')}
                      >
                        {formatarMoedaBR(potencial.ganhoBruto)}
                      </td>
                      {isMeia && (
                        <>
                          <td className="tabular px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                            {formatarMoedaBR(potencial.ganhoMeu)}
                          </td>
                          <td className="tabular px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300">
                            {formatarMoedaBR(potencial.ganhoSocio)}
                          </td>
                        </>
                      )}
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>

          <p className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <CircleDollarSign size={14} className="mt-0.5 shrink-0" />
            {isMeia
              ? 'Potencial total = caixa atual + venda pretendida do estoque (50/50). Lucro dos vendidos é o histórico de resultado.'
              : 'Ganho = venda pretendida − (compra + despesas do veículo). Não inclui despesas gerais da loja.'}
          </p>
        </div>
      }
    />
  )
}
