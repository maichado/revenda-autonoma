// Relatório de Despesas — totais, distribuição por categoria e top 10.



import { useMemo } from 'react'

import {

  Cell,

  Pie,

  PieChart,

  ResponsiveContainer,

  Tooltip,

} from 'recharts'

import { AlertCircle, CheckCircle2, Receipt, Wallet } from 'lucide-react'



import { KpiCard } from './KpiCard'

import { RelatorioLayout } from './RelatorioLayout'

import { rotuloExibicaoPagoPor } from '@/utils/despesaOrigem'

import {

  agruparDespesasPorTipoResumo,

  filtrarDespesasRelatorio,

  formatarDataBR,

  formatarMoedaBR,

  labelPeriodo,

  labelVeiculoSelect,

  resumirDespesas,

  type Periodo,

} from '@/utils/relatorios'

import {

  gerarTextoRelatorio,

  type EstadoRelatorio,

} from '@/utils/relatoriosTexto'



interface Props {

  estado: EstadoRelatorio

  periodo: Periodo

  veiculoId?: string

}



const PALETA = ['#C8A96E', '#22C55E', '#0EA5E9', '#F59E0B', '#A855F7', '#EF4444', '#14B8A6']

const MAX_LINHAS_TABELA = 30



export function RelatorioDespesas({ estado, periodo, veiculoId }: Props) {

  const { despesas, veiculos, configuracoes } = estado

  const nomeRevenda = configuracoes.nome_revenda

  const socios = configuracoes.socios



  const veiculo = useMemo(

    () => (veiculoId ? veiculos.find((v) => v.id === veiculoId) : undefined),

    [veiculos, veiculoId],

  )



  const despesasPeriodo = useMemo(() => {
    return filtrarDespesasRelatorio(despesas, periodo, veiculoId).sort(
      (a, b) => (a.data < b.data ? 1 : -1),
    )
  }, [despesas, periodo, veiculoId])



  const resumo = useMemo(

    () => resumirDespesas(despesasPeriodo),

    [despesasPeriodo],

  )



  const porTipo = useMemo(

    () => agruparDespesasPorTipoResumo(despesasPeriodo),

    [despesasPeriodo],

  )



  const totalCategorias = useMemo(

    () => porTipo.reduce((acc, g) => acc + g.total, 0),

    [porTipo],

  )



  const texto = useMemo(

    () => gerarTextoRelatorio('despesas', estado, periodo, veiculoId),

    [estado, periodo, veiculoId],

  )



  const descricao = veiculo
    ? `Todas as despesas de ${labelVeiculoSelect(veiculo)} — histórico completo (igual ao módulo Despesas com filtro por veículo).`
    : `Gastos do período ${labelPeriodo(periodo)} — totais, status de pagamento e categorias.`



  return (

    <RelatorioLayout

      titulo={

        veiculo

          ? `Despesas — ${veiculo.placa}`

          : 'Relatório de Despesas'

      }

      periodoLabel={veiculo ? 'Histórico completo' : labelPeriodo(periodo)}

      descricao={descricao}

      slug="despesas"

      texto={texto}

      visual={

        <div className="space-y-4">

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            <KpiCard

              titulo="Lançamentos"

              valor={String(resumo.qtd)}

              icone={<Receipt size={16} />}

            />

            <KpiCard

              titulo="Total"

              valor={formatarMoedaBR(resumo.total)}

              icone={<Wallet size={16} />}

            />

            <KpiCard

              titulo="Pago"

              valor={formatarMoedaBR(resumo.pago)}

              icone={<CheckCircle2 size={16} />}

            />

            <div className={resumo.aberto > 0 ? 'rounded-2xl ring-2 ring-amber-500/40' : ''}>

              <KpiCard

                titulo="Em aberto"

                valor={formatarMoedaBR(resumo.aberto)}

                icone={<AlertCircle size={16} />}

              />

            </div>

          </section>



          {porTipo.length > 0 && (

            <section className="card p-4 sm:p-5">

              <div className="mb-2">

                <h3 className="text-sm font-semibold">Totais por categoria</h3>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">

                  Soma das categorias: {formatarMoedaBR(totalCategorias)}

                  {Math.abs(totalCategorias - resumo.total) > 0.009 && (

                    <span className="ml-1 text-amber-600 dark:text-amber-400">

                      (divergência detectada)

                    </span>

                  )}

                </p>

              </div>

              <div className="grid items-center gap-3 sm:grid-cols-2">

                <div className="h-56 w-full">

                  <ResponsiveContainer width="100%" height="100%">

                    <PieChart>

                      <Tooltip

                        formatter={(v: number | string) =>

                          formatarMoedaBR(Number(v))

                        }

                        contentStyle={{

                          borderRadius: 8,

                          fontSize: 12,

                          border: '1px solid rgba(120,120,120,0.2)',

                        }}

                      />

                      <Pie

                        data={porTipo}

                        dataKey="total"

                        nameKey="tipo"

                        innerRadius={50}

                        outerRadius={80}

                        paddingAngle={3}

                        stroke="none"

                      >

                        {porTipo.map((d, i) => (

                          <Cell

                            key={String(d.tipo)}

                            fill={PALETA[i % PALETA.length]}

                          />

                        ))}

                      </Pie>

                    </PieChart>

                  </ResponsiveContainer>

                </div>

                <ul className="space-y-1 text-xs">

                  {porTipo.map((d, i) => (

                    <li

                      key={String(d.tipo)}

                      className="flex items-center justify-between gap-2 rounded-md border border-border-light px-2 py-1 dark:border-border-dark"

                    >

                      <span className="inline-flex items-center gap-2 capitalize">

                        <span

                          className="h-2 w-2 rounded-full"

                          style={{ background: PALETA[i % PALETA.length] }}

                        />

                        {String(d.tipo)}

                      </span>

                      <span className="tabular font-semibold">

                        {formatarMoedaBR(d.total)}

                        <span className="ml-1 text-[10px] font-normal text-zinc-500 dark:text-zinc-400">

                          ({d.qtd})

                        </span>

                      </span>

                    </li>

                  ))}

                </ul>

              </div>

            </section>

          )}



          <section className="card overflow-x-auto">

            <table className="w-full min-w-[680px] text-sm">

              <thead>

                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">

                  <th className="px-3 py-2 font-medium">Data</th>

                  <th className="px-3 py-2 font-medium">Tipo</th>

                  <th className="px-3 py-2 font-medium">Descrição</th>

                  <th className="px-3 py-2 font-medium">Quem pagou</th>

                  <th className="px-3 py-2 text-right font-medium">Valor</th>

                  <th className="px-3 py-2 font-medium">Status</th>

                </tr>

              </thead>

              <tbody className="table-row-zebra table-row-hover">

                {despesasPeriodo.length === 0 ? (

                  <tr>

                    <td

                      colSpan={6}

                      className="px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400"

                    >

                      {veiculo

                        ? `Nenhuma despesa de ${veiculo.placa} no período.`

                        : 'Nenhuma despesa registrada no período.'}

                    </td>

                  </tr>

                ) : (

                  despesasPeriodo.slice(0, MAX_LINHAS_TABELA).map((d) => (

                    <tr

                      key={d.id}

                      className="border-t border-border-light dark:border-border-dark"

                    >

                      <td className="tabular px-3 py-2">

                        {formatarDataBR(d.data)}

                      </td>

                      <td className="px-3 py-2 capitalize">{d.tipo}</td>

                      <td className="px-3 py-2">{d.descricao || '—'}</td>

                      <td className="px-3 py-2 text-xs">

                        {rotuloExibicaoPagoPor(d.pago_por, nomeRevenda, socios)}

                      </td>

                      <td className="tabular px-3 py-2 text-right font-semibold">

                        {formatarMoedaBR(d.valor)}

                      </td>

                      <td className="px-3 py-2 text-xs">

                        {d.pago ? (

                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">

                            <CheckCircle2 size={12} /> pago

                          </span>

                        ) : (

                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">

                            <AlertCircle size={12} /> em aberto

                          </span>

                        )}

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

              {despesasPeriodo.length > 0 && (

                <tfoot>

                  <tr className="border-t-2 border-border-light bg-zinc-50/80 font-semibold dark:border-border-dark dark:bg-white/[0.03]">

                    <td className="px-3 py-2.5" colSpan={4}>

                      Total ({resumo.qtd}{' '}

                      {resumo.qtd === 1 ? 'lançamento' : 'lançamentos'})

                    </td>

                    <td className="tabular px-3 py-2.5 text-right">

                      {formatarMoedaBR(resumo.total)}

                    </td>

                    <td className="px-3 py-2.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">

                      {formatarMoedaBR(resumo.pago)} pago ·{' '}

                      {formatarMoedaBR(resumo.aberto)} aberto

                    </td>

                  </tr>

                </tfoot>

              )}

            </table>

            {despesasPeriodo.length > MAX_LINHAS_TABELA && (

              <p className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">

                Exibindo {MAX_LINHAS_TABELA} de {despesasPeriodo.length}{' '}

                despesas. O total no rodapé inclui todas.

              </p>

            )}

          </section>

        </div>

      }

    />

  )

}


