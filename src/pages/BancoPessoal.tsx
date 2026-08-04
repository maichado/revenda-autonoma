// Banco Pessoal — visão simples: números automáticos, devolução só quando
// você marcar (nada é marcado automaticamente na venda).

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  Car,
  Expand,
  PiggyBank,
  Receipt,
  RotateCcw,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { Modal } from '@/components/Modal'
import { formatarMoeda, formatarDataCurta } from '@/utils/formatadores'
import {
  detalheMinhaParteCarro,
  detalheVendaCarro,
  lucroMeuCarro,
  minhaParteInvestida,
  montarEstadoBancoPessoal,
  montarFluxosGiroRevenda,
  montarVisaoPatrimonioRevenda,
  nomeDonoCompleto,
  primeiroNomeDono,
  resumoCaixaRevendaCard,
  resumoPatrimonioCard,
  visaoCaixaInvestimentoCard,
  STATUS_CARRO_META,
  type ResumoCaixaRevendaCard,
  type ResumoPatrimonioCard,
  type ResumoBancoPessoal,
  type VisaoCaixaInvestimentoCard,
  type FluxoGiroRevenda,
  type EtapaGiroRevenda,
  type VisaoPatrimonioRevenda,
} from '@/utils/bancoPessoal'
import type {
  CarroBancoPessoal,
  LancamentoBancoPessoal,
  MovimentacaoPool,
  Veiculo,
} from '@/types'

import { Button } from '@/components/Button'

export default function BancoPessoal() {
  const veiculos = useStore((s) => s.veiculos)
  const despesas = useStore((s) => s.despesas)
  const vendas = useStore((s) => s.vendas)
  const capitalInicial = useStore(
    (s) => s.configuracoes.capital_inicial_pessoal,
  )
  const socios = useStore((s) => s.configuracoes.socios)
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const updateDespesa = useStore((s) => s.updateDespesa)
  const updateVeiculo = useStore((s) => s.updateVeiculo)
  const resetTodasDevolucoesPessoais = useStore(
    (s) => s.resetTodasDevolucoesPessoais,
  )
  const salvarServidor = useSalvarServidor()

  const dono = nomeDonoCompleto(socios)
  const nomeCurto = primeiroNomeDono(socios)

  const estado = useMemo(
    () =>
      montarEstadoBancoPessoal(
        despesas,
        veiculos,
        vendas,
        capitalInicial,
        dono,
        nomeRevenda,
        socios,
      ),
    [
      despesas,
      veiculos,
      vendas,
      capitalInicial,
      dono,
      nomeRevenda,
      socios,
    ],
  )

  const { lancamentos, carros, resumo, sim: simulacao } = estado

  const extrato = simulacao.movimentacoes

  const extratoRevenda = simulacao.movimentacoesRevenda

  const revendaCard = useMemo(
    () =>
      resumoCaixaRevendaCard(
        carros,
        veiculos,
        resumo.caixaRevenda,
        socios,
      ),
    [carros, veiculos, resumo.caixaRevenda, socios],
  )

  const visaoRevenda = useMemo(
    () =>
      montarVisaoPatrimonioRevenda(
        resumo.caixaRevenda,
        revendaCard.todosCarros,
        despesas,
        nomeRevenda,
        socios,
      ),
    [
      resumo.caixaRevenda,
      revendaCard.todosCarros,
      despesas,
      nomeRevenda,
      socios,
    ],
  )

  const fluxosGiro = useMemo(
    () =>
      montarFluxosGiroRevenda(
        extratoRevenda,
        revendaCard.todosCarros,
        despesas,
        nomeRevenda,
        socios,
        resumo.caixaRevenda,
      ),
    [
      extratoRevenda,
      revendaCard.todosCarros,
      despesas,
      nomeRevenda,
      socios,
      resumo.caixaRevenda,
    ],
  )

  const patrimonioCard = useMemo(
    () => resumoPatrimonioCard(resumo, socios, veiculos, vendas),
    [resumo, socios, veiculos, vendas],
  )

  const visaoCaixaInvestimento = useMemo(
    () => visaoCaixaInvestimentoCard(resumo, carros, lancamentos),
    [resumo, carros, lancamentos],
  )

  const lancamentosOrdenados = useMemo(
    () =>
      [...lancamentos].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'a_devolver' ? -1 : 1
        }
        return b.data.localeCompare(a.data)
      }),
    [lancamentos],
  )

  async function marcarDevolvido(l: LancamentoBancoPessoal, devolvido: boolean) {
    if (l.origem === 'compra_extra' && l.veiculo_id) {
      await salvarServidor(
        () =>
          updateVeiculo(l.veiculo_id!, {
            compra_pessoal_reembolsada: devolvido,
            ...(devolvido ? {} : { investimento_pessoal_devolvido: false }),
          }),
        devolvido ? 'Marcado como devolvido' : 'Voltou para a devolver',
      )
      return
    }
    if (l.despesa_id) {
      await salvarServidor(
        () => updateDespesa(l.despesa_id!, { reembolsado: devolvido }),
        devolvido ? 'Marcado como devolvido' : 'Voltou para a devolver',
      )
    }
  }

  async function restaurarNadaDevolvido() {
    await salvarServidor(
      () => resetTodasDevolucoesPessoais(),
      'Pendentes restaurados',
      'Nenhum item marcado como devolvido. Marque manualmente quando receber.',
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Banco Pessoal
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {dono} · capital {formatarMoeda(capitalInicial)} · reinvestimento
            com giros · devolução manual
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={restaurarNadaDevolvido}
          >
            Nada devolvido ainda
          </Button>
          <Link
            to="/configuracoes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 dark:border-border-dark"
          >
            <Settings size={15} />
            Capital inicial
          </Link>
        </div>
      </header>

      <SumarioBancoPessoal
        capitalInicial={capitalInicial}
        nomeCurto={nomeCurto}
        disponivelInvestimento={resumo.caixaInvestimento}
        caixaRevendaEmCaixa={visaoRevenda.emCaixa}
        caixaRevendaTotalGiro={visaoRevenda.totalNoGiro}
        aDevolver={resumo.totalADevolver}
        carros={carros}
        veiculos={veiculos}
      />

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <CardCaixaInvestimento
            resumo={resumo}
            extrato={extrato}
            nomeCurto={nomeCurto}
            visao={visaoCaixaInvestimento}
          />
          <CardADevolver
            totalADevolver={resumo.totalADevolver}
            totalDevolvido={resumo.totalDevolvido}
            caixaInvestimentoBruto={resumo.caixaInvestimentoBruto}
            caixaInvestimento={resumo.caixaInvestimento}
            lancamentos={lancamentosOrdenados}
            dono={dono}
            onMarcarDevolvido={marcarDevolvido}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <CardCaixaRevenda
            resumo={revendaCard}
            subtitulo={nomeRevenda.trim() || 'loja'}
            visao={visaoRevenda}
            fluxos={fluxosGiro}
          />
          <CardPatrimonio resumo={patrimonioCard} />
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-border-light px-5 py-3 dark:border-border-dark">
          <h2 className="text-sm font-semibold">Carros</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <strong>Revenda</strong> = caixa da loja (giro a meia).{' '}
            <strong>Do investimento</strong> = saiu do seu caixa (capital +
            vendas seus); em carro a meia pode ser <strong>aporte</strong> que
            entra na revenda antes da compra. <strong>Do bolso</strong> = a
            devolver.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border-light text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark">
                <th className="px-5 py-2">Carro</th>
                <th className="px-3 py-2 text-right" title="Custo do carro × sua fração">
                  Minha parte
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Quanto saiu do caixa revenda nesta compra"
                >
                  Revenda
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Quanto saiu do seu caixa investimento nesta compra"
                >
                  Do investimento
                </th>
                <th
                  className="px-3 py-2 text-right"
                  title="Do bolso — entra em A devolver"
                >
                  Do bolso
                </th>
                <th className="px-3 py-2 text-right">Venda</th>
              </tr>
            </thead>
            <tbody>
              {carros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
                    Nenhum veículo —{' '}
                    <Link to="/veiculos" className="text-primary hover:underline">
                      cadastrar
                    </Link>
                  </td>
                </tr>
              ) : (
                carros.map((c) => {
                  const meta = STATUS_CARRO_META[c.status]
                  const lucroMeu = lucroMeuCarro(c)
                  const detalhe = detalheMinhaParteCarro(c)
                  const venda = detalheVendaCarro(c)
                  return (
                    <tr
                      key={c.id}
                      id={`carro-${c.veiculo_id}`}
                      className="border-b border-border-light last:border-0 scroll-mt-24 dark:border-border-dark"
                    >
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{c.nome}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-zinc-500">{c.placa}</span>
                          <span
                            className={[
                              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                              meta.badge,
                            ].join(' ')}
                          >
                            {meta.label}
                          </span>
                          {c.tipo_propriedade === 'meia' && (
                            <span className="text-[10px] text-violet-500">
                              <Users size={10} className="mr-0.5 inline" />
                              50%
                            </span>
                          )}
                        </div>
                        {c.status === 'vendido' && lucroMeu != null && (
                          <div className="mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Lucro meu: {formatarMoeda(lucroMeu)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="tabular font-semibold">
                          {formatarMoeda(minhaParteInvestida(c))}
                        </div>
                        <div
                          className="mt-0.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400"
                          title={`Compra ${formatarMoeda(detalhe.valorCompra)} + despesas ${formatarMoeda(detalhe.custoReforma)} = ${formatarMoeda(detalhe.totalNegocio)} (${detalhe.rotuloFracao})`}
                        >
                          {formatarMoeda(detalhe.valorCompra)} compra
                          {detalhe.custoReforma > 0 && (
                            <>
                              {' '}
                              + {formatarMoeda(detalhe.custoReforma)} despesas
                            </>
                          )}
                          {c.tipo_propriedade === 'meia' && (
                            <> · {detalhe.rotuloFracao}</>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-primary">
                        {c.do_revenda > 0 || c.do_revenda_socio > 0 ? (
                          <div>
                            <div>{formatarMoeda(c.do_revenda)}</div>
                            {c.do_revenda_socio > 0 && (
                              <div className="text-[10px] text-violet-500">
                                + {formatarMoeda(c.do_revenda_socio)} sócio
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular text-zinc-600 dark:text-zinc-300">
                        {c.do_investimento > 0 ? (
                          <div>
                            <div>{formatarMoeda(c.do_investimento)}</div>
                            {c.tipo_propriedade === 'meia' &&
                              c.do_revenda <= 0 &&
                              c.do_investimento_socio <= 0 && (
                                <div className="text-[10px] text-primary">
                                  aporte → revenda
                                </div>
                              )}
                            {c.do_investimento_socio > 0 && (
                              <div className="text-[10px] text-violet-500">
                                + {formatarMoeda(c.do_investimento_socio)} sócio
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {c.extrapessoal_compra > 0 || c.do_pessoal_socio > 0 ? (
                          <div>
                            {c.extrapessoal_compra > 0 && (
                              <span className="font-semibold text-amber-600">
                                {formatarMoeda(c.extrapessoal_compra)}
                              </span>
                            )}
                            {c.do_pessoal_socio > 0 && (
                              <div className="text-[10px] text-violet-500">
                                + {formatarMoeda(c.do_pessoal_socio)} sócio
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {venda.vendido && venda.valorTotal != null ? (
                          <div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatarMoeda(venda.valorTotal)}
                            </div>
                            {venda.fracao < 1 && venda.minhaParte != null && (
                              <div className="text-[10px] text-violet-500">
                                {formatarMoeda(venda.minhaParte)} · 50% seu
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-violet-500/20 bg-violet-500/5 px-5 py-3 dark:border-violet-500/30">
          <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
            Giro — caixa revenda (a meia)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Onde está o dinheiro: em caixa ou em carros.
          </p>
        </div>
        <div className="px-5 py-4">
          <VisaoGiroRevenda
            visao={visaoRevenda}
            fluxos={fluxosGiro}
            resumo={revendaCard}
            onIrCarro={() => {}}
          />
        </div>
      </section>
    </div>
  )
}

function SumarioBancoPessoal({
  capitalInicial,
  nomeCurto,
  disponivelInvestimento,
  caixaRevendaEmCaixa,
  caixaRevendaTotalGiro,
  aDevolver,
  carros,
  veiculos,
}: {
  capitalInicial: number
  nomeCurto: string
  disponivelInvestimento: number
  caixaRevendaEmCaixa: number
  caixaRevendaTotalGiro: number
  aDevolver: number
  carros: CarroBancoPessoal[]
  veiculos: Veiculo[]
}) {
  const estoque = carros
    .filter((c) => c.status !== 'vendido')
    .map((c) => {
      const v = veiculos.find((x) => x.id === c.veiculo_id)
      const pretendido = Number(v?.valor_venda_pretendido) || 0
      return {
        id: c.id,
        nome: c.nome,
        placa: c.placa,
        compra: Number(c.valor_compra) || 0,
        vale: pretendido > 0 ? pretendido : Number(c.valor_compra) || 0,
        meia: c.fracao_maicon < 1,
      }
    })
    .sort((a, b) => b.vale - a.vale)

  const totalVale = estoque.reduce((s, c) => s + c.vale, 0)

  return (
    <section className="rounded-xl border border-border-light bg-zinc-50/80 px-4 py-4 text-sm dark:border-border-dark dark:bg-zinc-900/40">
      <p className="font-medium text-zinc-800 dark:text-zinc-200">
        Sumário — {nomeCurto}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Comecei com{' '}
        <span className="font-semibold tabular text-zinc-800 dark:text-zinc-200">
          {formatarMoeda(capitalInicial)}
        </span>{' '}
        de investimento
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border-light bg-white/60 px-3 py-2 dark:border-border-dark dark:bg-zinc-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Caixa investimento
          </p>
          <p className="tabular mt-0.5 text-lg font-bold text-primary">
            {formatarMoeda(disponivelInvestimento)}
          </p>
          <p className="text-[11px] text-zinc-500">disponível para comprar</p>
        </div>
        <div className="rounded-lg border border-border-light bg-white/60 px-3 py-2 dark:border-border-dark dark:bg-zinc-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Caixa revenda
          </p>
          <p className="tabular mt-0.5 text-lg font-bold text-violet-700 dark:text-violet-300">
            {formatarMoeda(caixaRevendaEmCaixa)}
          </p>
          <p className="text-[11px] text-zinc-500">
            em caixa · giro {formatarMoeda(caixaRevendaTotalGiro)}
          </p>
        </div>
        <div className="rounded-lg border border-border-light bg-white/60 px-3 py-2 dark:border-border-dark dark:bg-zinc-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            A devolver
          </p>
          <p
            className={[
              'tabular mt-0.5 text-lg font-bold',
              aDevolver > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-800 dark:text-zinc-100',
            ].join(' ')}
          >
            {formatarMoeda(aDevolver)}
          </p>
          <p className="text-[11px] text-zinc-500">bolso pendente</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Carros em estoque
          </p>
          {estoque.length > 0 && (
            <p className="text-[11px] tabular text-zinc-500">
              {estoque.length} carro{estoque.length !== 1 ? 's' : ''} · vale{' '}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {formatarMoeda(totalVale)}
              </span>
            </p>
          )}
        </div>
        {estoque.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Nenhum carro em estoque.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border-light dark:divide-border-dark">
            {estoque.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <Link
                    to={`#carro-${c.id}`}
                    className="font-medium text-zinc-800 hover:text-primary dark:text-zinc-100"
                  >
                    {c.nome}
                  </Link>
                  <span className="ml-1.5 text-zinc-400">
                    {c.placa}
                    {c.meia ? ' · meia' : ''}
                  </span>
                </div>
                <div className="shrink-0 text-right tabular">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {formatarMoeda(c.vale)}
                  </span>
                  {c.vale !== c.compra && c.compra > 0 && (
                    <span className="ml-2 text-[11px] text-zinc-500">
                      compra {formatarMoeda(c.compra)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ResumoCaixaInvestimentoVisao({
  visao,
}: {
  visao: VisaoCaixaInvestimentoCard
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-primary/15 bg-primary/5 px-3 py-3 text-xs">
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 tabular font-medium text-zinc-800 dark:text-zinc-200">
        <span>Disponível: {formatarMoeda(visao.disponivel)}</span>
        {visao.totalNoEstoque > 0 && (
          <span>No estoque: {formatarMoeda(visao.totalNoEstoque)}</span>
        )}
      </div>
      {(visao.reservado > 0 || visao.livre !== visao.disponivel) && (
        <p className="tabular text-zinc-500 dark:text-zinc-400">
          Extrato {formatarMoeda(visao.livre)}
          {visao.reservado > 0
            ? ` · reservado ${formatarMoeda(visao.reservado)} (A devolver)`
            : ''}
        </p>
      )}
      {visao.itensEstoque.length > 0 && (
        <ul className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
          {visao.itensEstoque.map((item) => (
            <li
              key={item.veiculo_id}
              className="flex justify-between gap-2 tabular"
            >
              <span className="min-w-0 truncate">
                {item.placa} · {item.nome}
              </span>
              <span className="shrink-0 font-medium">
                {formatarMoeda(item.do_investimento)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {visao.alertasPendentes.map((texto) => (
        <p
          key={texto}
          className="leading-snug text-amber-800 dark:text-amber-200"
        >
          {texto}
        </p>
      ))}
    </div>
  )
}

function CardCaixaInvestimento({
  resumo,
  extrato,
  nomeCurto,
  visao,
}: {
  resumo: ResumoBancoPessoal
  extrato: MovimentacaoPool[]
  nomeCurto: string
  visao: VisaoCaixaInvestimentoCard
}) {
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="card flex w-full cursor-pointer flex-col p-4 text-left transition hover:ring-2 hover:ring-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <PiggyBank size={18} className="shrink-0 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
            Caixa investimento
            <span className="ml-1 font-normal normal-case text-zinc-400">
              · {nomeCurto}
            </span>
          </span>
        </div>

        <p className="tabular mt-1 text-2xl font-bold text-primary">
          {formatarMoeda(visao.disponivel)}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          Disponível para comprar
          {visao.totalNoEstoque > 0
            ? ` · ${formatarMoeda(visao.totalNoEstoque)} nos carros`
            : ''}
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-primary/80">
          <Expand size={11} />
          Clique para ver o extrato
        </p>
      </button>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        size="2xl"
        title="Caixa investimento — histórico"
        description={`${nomeCurto} · disponível ${formatarMoeda(resumo.caixaInvestimento)} · capital ${formatarMoeda(resumo.saldoCapitalInicial)} + reinvestimento ${formatarMoeda(resumo.saldoReinvestimento)}`}
      >
        <ModalCaixaInvestimentoConteudo
          resumo={resumo}
          extrato={extrato}
          visao={visao}
        />
      </Modal>
    </>
  )
}

function ModalCaixaInvestimentoConteudo({
  resumo,
  extrato,
  visao,
}: {
  resumo: ResumoBancoPessoal
  extrato: MovimentacaoPool[]
  visao: VisaoCaixaInvestimentoCard
}) {
  return (
    <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
      <ResumoCaixaInvestimentoVisao visao={visao} />
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Disponível para comprar
        </p>
        <p className="tabular mt-1 text-3xl font-bold text-primary">
          {formatarMoeda(visao.disponivel)}
        </p>
        <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <p>
            Extrato técnico:{' '}
            <span className="font-semibold tabular">
              {formatarMoeda(visao.livre)}
            </span>
          </p>
          <p>
            Reservado (A devolver):{' '}
            <span className="font-semibold tabular text-amber-700 dark:text-amber-300">
              {formatarMoeda(visao.reservado)}
            </span>
          </p>
          <p>
            Capital inicial livre:{' '}
            <span className="font-semibold tabular">
              {formatarMoeda(resumo.saldoCapitalInicial)}
            </span>
          </p>
          <p>
            Reinvestimento (vendas seus):{' '}
            <span className="font-semibold tabular text-emerald-700 dark:text-emerald-300">
              {formatarMoeda(resumo.saldoReinvestimento)}
            </span>
          </p>
        </div>
        {resumo.totalDevolvidoDebitado > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Já devolvido e debitado:{' '}
            {formatarMoeda(resumo.totalDevolvidoDebitado)}. Pendências
            (gasolina etc.) ficam fora desse total até marcar devolvido.
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Só entram capital, compras/vendas 100% seus, aportes para revenda e
          devoluções marcadas. Venda a meia não passa por este caixa.
        </p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Extrato completo</h3>
        <ExtratoInvestimentoTabela extrato={extrato} />
      </section>
    </div>
  )
}

function ExtratoInvestimentoTabela({
  extrato,
}: {
  extrato: MovimentacaoPool[]
}) {
  if (extrato.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        Nenhum movimento ainda.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border-light bg-zinc-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-zinc-900/40">
            <th className="px-4 py-2">Data</th>
            <th className="px-3 py-2">Movimento</th>
            <th className="px-3 py-2 text-right">Valor</th>
            <th className="px-4 py-2 text-right">Saldo após</th>
          </tr>
        </thead>
        <tbody>
          {extrato.map((m) => (
            <tr
              key={m.id}
              className="border-b border-border-light last:border-0 dark:border-border-dark"
            >
              <td className="px-4 py-2 tabular text-zinc-500">
                {m.data ? formatarDataCurta(m.data) : '—'}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{m.carro_nome ?? m.tipo}</div>
                <div className="text-[11px] text-zinc-500">{m.detalhe}</div>
              </td>
              <td
                className={[
                  'px-3 py-2 text-right tabular font-semibold',
                  m.valor === 0
                    ? 'text-zinc-500'
                    : m.valor >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500',
                ].join(' ')}
              >
                {m.valor === 0
                  ? '—'
                  : `${m.valor >= 0 ? '+' : ''}${formatarMoeda(m.valor)}`}
              </td>
              <td className="px-4 py-2 text-right tabular font-medium">
                {formatarMoeda(m.saldo_apos)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CardADevolver({
  totalADevolver,
  totalDevolvido,
  caixaInvestimentoBruto,
  caixaInvestimento,
  lancamentos,
  dono,
  onMarcarDevolvido,
}: {
  totalADevolver: number
  totalDevolvido: number
  caixaInvestimentoBruto: number
  caixaInvestimento: number
  lancamentos: LancamentoBancoPessoal[]
  dono: string
  onMarcarDevolvido: (
    l: LancamentoBancoPessoal,
    devolvido: boolean,
  ) => Promise<void>
}) {
  const [modalAberto, setModalAberto] = useState(false)
  const pendentes = lancamentos.filter((l) => l.status === 'a_devolver')
  const qtdDevolvidos = lancamentos.length - pendentes.length
  const alerta = totalADevolver > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="card flex w-full cursor-pointer flex-col p-4 text-left transition hover:ring-2 hover:ring-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
      >
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Wallet
            size={18}
            className={
              alerta
                ? 'shrink-0 text-red-600 dark:text-red-400'
                : 'shrink-0 text-zinc-400'
            }
          />
          <span
            className={[
              'text-[11px] font-semibold uppercase tracking-wide',
              alerta
                ? 'text-red-800 dark:text-red-200'
                : 'text-zinc-600 dark:text-zinc-300',
            ].join(' ')}
          >
            A devolver
          </span>
        </div>

        <p
          className={[
            'tabular mt-1 text-2xl font-bold',
            alerta
              ? 'text-red-600 dark:text-red-400'
              : 'text-zinc-800 dark:text-zinc-100',
          ].join(' ')}
        >
          {formatarMoeda(totalADevolver)}
        </p>

        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
          {qtdDevolvidos > 0
            ? ` · ${qtdDevolvidos} devolvido${qtdDevolvidos !== 1 ? 's' : ''}`
            : ''}
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-red-600/80 dark:text-red-400/80">
          <Expand size={11} />
          Clique para marcar devoluções
        </p>
      </button>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        size="2xl"
        title="A devolver — detalhado"
        description={`Bolso usado acima do investimento · pendente ${formatarMoeda(totalADevolver)}`}
      >
        <ModalADevolverConteudo
          totalADevolver={totalADevolver}
          totalDevolvido={totalDevolvido}
          caixaInvestimentoBruto={caixaInvestimentoBruto}
          caixaInvestimento={caixaInvestimento}
          lancamentos={lancamentos}
          dono={dono}
          onMarcarDevolvido={onMarcarDevolvido}
        />
      </Modal>
    </>
  )
}

function ModalADevolverConteudo({
  totalADevolver,
  totalDevolvido,
  caixaInvestimentoBruto,
  caixaInvestimento,
  lancamentos,
  dono,
  onMarcarDevolvido,
}: {
  totalADevolver: number
  totalDevolvido: number
  caixaInvestimentoBruto: number
  caixaInvestimento: number
  lancamentos: LancamentoBancoPessoal[]
  dono: string
  onMarcarDevolvido: (
    l: LancamentoBancoPessoal,
    devolvido: boolean,
  ) => Promise<void>
}) {
  return (
    <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
      <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Pendente a devolver
        </p>
        <p className="tabular mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
          {formatarMoeda(totalADevolver)}
        </p>
        {totalDevolvido > 0 && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Já devolvido ao bolso:{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {formatarMoeda(totalDevolvido)}
            </span>
            {' · '}
            Caixa investimento{' '}
            {formatarMoeda(caixaInvestimentoBruto)} →{' '}
            {formatarMoeda(caixaInvestimento)}
          </p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Marque ✓ quando receber no bolso — o valor sai do caixa investimento e
          some da pendência.
        </p>
      </div>

      {lancamentos.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">
          Nada pendente. Se deveria aparecer, use &quot;Nada devolvido
          ainda&quot; no topo ou confira &quot;Quem pagou&quot; = {dono} em{' '}
          <Link to="/despesas" className="text-primary hover:underline">
            Despesas
          </Link>
          .
        </p>
      ) : (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Itens</h3>
          <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border-light bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-zinc-900/50">
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Carro</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                  <th className="px-4 py-2 text-center">Devolvido?</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <LinhaADevolver
                    key={l.id}
                    lancamento={l}
                    onMarcarDevolvido={onMarcarDevolvido}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function LinhaADevolver({
  lancamento: l,
  onMarcarDevolvido,
}: {
  lancamento: LancamentoBancoPessoal
  onMarcarDevolvido: (
    l: LancamentoBancoPessoal,
    devolvido: boolean,
  ) => Promise<void>
}) {
  const devolvido = l.status === 'devolvido'

  return (
    <tr
      className={[
        'border-b border-border-light last:border-0 dark:border-border-dark',
        devolvido ? 'opacity-60' : '',
      ].join(' ')}
    >
      <td className="px-4 py-2.5">
        <div className="font-medium">{l.descricao}</div>
        <div className="text-[11px] text-zinc-500 tabular">
          {l.data ? formatarDataCurta(l.data) : '—'}
          {l.origem === 'compra_extra' ? ' · compra extra' : ''}
        </div>
      </td>
      <td className="px-4 py-2.5 text-zinc-500">{l.carro_nome}</td>
      <td
        className={[
          'px-4 py-2.5 text-right tabular font-semibold',
          devolvido ? 'text-zinc-400 line-through' : 'text-red-500',
        ].join(' ')}
      >
        {formatarMoeda(l.valor)}
      </td>
      <td className="px-4 py-2.5 text-center">
        <input
          type="checkbox"
          checked={devolvido}
          onChange={(e) => onMarcarDevolvido(l, e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600"
          aria-label={
            devolvido ? 'Desmarcar devolução' : 'Marcar como devolvido'
          }
        />
      </td>
    </tr>
  )
}

function CardPatrimonio({ resumo }: { resumo: ResumoPatrimonioCard }) {
  const [modalAberto, setModalAberto] = useState(false)
  const crescimentoPositivo = resumo.crescimento >= 0

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="card flex w-full cursor-pointer flex-col p-4 text-left transition hover:ring-2 hover:ring-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <CardPatrimonioPreview
          resumo={resumo}
          crescimentoPositivo={crescimentoPositivo}
        />
        <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
          <Expand size={11} />
          Clique para ver detalhes
        </p>
      </button>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        size="lg"
        title="Patrimônio — detalhado"
        description={`${resumo.nomeDono} · investimento + 50% revenda + FIPE estoque`}
      >
        <ModalPatrimonioConteudo
          resumo={resumo}
          crescimentoPositivo={crescimentoPositivo}
          onIrCarro={() => setModalAberto(false)}
        />
      </Modal>
    </>
  )
}

function CardPatrimonioPreview({
  resumo,
  crescimentoPositivo,
}: {
  resumo: ResumoPatrimonioCard
  crescimentoPositivo: boolean
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <TrendingUp
            size={18}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Patrimônio
            <span className="ml-1 font-normal normal-case text-zinc-400">
              · {resumo.nomeDono}
            </span>
          </span>
        </div>
        <PiggyBank size={14} className="text-emerald-400" aria-hidden />
      </div>

      <p className="tabular mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
        {formatarMoeda(resumo.total)}
      </p>

      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        Vs capital {formatarMoeda(resumo.capitalInicial)}:{' '}
        <span
          className={[
            'font-semibold tabular',
            crescimentoPositivo
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500',
          ].join(' ')}
        >
          {crescimentoPositivo ? '+' : ''}
          {formatarMoeda(resumo.crescimento)}
        </span>
      </p>
    </>
  )
}

function ModalPatrimonioConteudo({
  resumo,
  crescimentoPositivo,
  onIrCarro,
}: {
  resumo: ResumoPatrimonioCard
  crescimentoPositivo: boolean
  onIrCarro: () => void
}) {
  return (
    <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Total patrimônio
        </p>
        <p className="tabular mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
          {formatarMoeda(resumo.total)}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Investimento {formatarMoeda(resumo.caixaInvestimento)} + 50% revenda{' '}
          {formatarMoeda(resumo.minhaParteRevenda)}
          {resumo.valorFipeEstoqueMeu > 0 && (
            <> + FIPE {formatarMoeda(resumo.valorFipeEstoqueMeu)}</>
          )}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Vs capital {formatarMoeda(resumo.capitalInicial)}:{' '}
          <span
            className={
              crescimentoPositivo
                ? 'font-semibold text-emerald-600'
                : 'font-semibold text-red-500'
            }
          >
            {crescimentoPositivo ? '+' : ''}
            {formatarMoeda(resumo.crescimento)}
          </span>
        </p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Composição</h3>
        <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-zinc-900/50">
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Detalhe</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {resumo.composicao.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border-light last:border-0 dark:border-border-dark"
                >
                  <td className="px-4 py-2.5 font-medium">{item.rotulo}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {item.detalhe}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatarMoeda(item.valor)}
                  </td>
                </tr>
              ))}
              <tr className="bg-emerald-500/5 font-semibold">
                <td className="px-4 py-2.5" colSpan={2}>
                  Total patrimônio
                </td>
                <td className="px-4 py-2.5 text-right tabular text-emerald-700 dark:text-emerald-300">
                  {formatarMoeda(resumo.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {resumo.todosCarrosFipe.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Carros em estoque (FIPE)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-zinc-900/50">
                  <th className="px-4 py-2">Carro</th>
                  <th className="px-4 py-2 text-right">FIPE total</th>
                  <th className="px-4 py-2 text-right">Sua parte</th>
                </tr>
              </thead>
              <tbody>
                {resumo.todosCarrosFipe.map((c) => (
                  <tr
                    key={c.veiculo_id}
                    className="border-b border-border-light last:border-0 dark:border-border-dark"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to={`#carro-${c.veiculo_id}`}
                        onClick={onIrCarro}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.nome}
                      </Link>
                      <span className="ml-1 text-xs text-zinc-400">
                        {c.placa}
                        {c.fracao < 1 ? ' · 50%' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {formatarMoeda(c.valorFipe)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatarMoeda(c.minhaParte)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-500">
        &quot;A devolver&quot; não entra no patrimônio. Carros vendidos não
        entram via FIPE.
      </p>
    </div>
  )
}

function CardCaixaRevenda({
  resumo,
  subtitulo,
  visao,
  fluxos,
}: {
  resumo: ResumoCaixaRevendaCard
  subtitulo: string
  visao: VisaoPatrimonioRevenda
  fluxos: FluxoGiroRevenda[]
}) {
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="card flex w-full cursor-pointer flex-col p-4 text-left transition hover:ring-2 hover:ring-violet-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <Wallet
              size={18}
              className="shrink-0 text-violet-600 dark:text-violet-400"
            />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
              Caixa revenda
              {subtitulo ? (
                <span className="ml-1 font-normal normal-case text-zinc-400">
                  · {subtitulo}
                </span>
              ) : null}
            </span>
          </div>
          <Users size={14} className="text-violet-400" aria-hidden />
        </div>

        <p className="tabular mt-1 text-2xl font-bold text-violet-700 dark:text-violet-300">
          {formatarMoeda(visao.totalNoGiro)}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          Total no giro a meia · {formatarMoeda(visao.emCaixa)} em caixa
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-violet-600/80 dark:text-violet-400/80">
          <Expand size={11} />
          Clique para ver o giro
        </p>
      </button>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        size="2xl"
        title="Caixa revenda"
        description={`${subtitulo || 'Loja'} · ${formatarMoeda(visao.emCaixa)} caixa + ${formatarMoeda(visao.emCarros)} carros${visao.totalDespesas > 0 ? ` + ${formatarMoeda(visao.totalDespesas)} despesas` : ''}`}
      >
        <ModalCaixaRevendaConteudo
          resumo={resumo}
          visao={visao}
          fluxos={fluxos}
          onIrCarro={() => setModalAberto(false)}
        />
      </Modal>
    </>
  )
}

function ModalCaixaRevendaConteudo({
  resumo,
  visao,
  fluxos,
  onIrCarro,
}: {
  resumo: ResumoCaixaRevendaCard
  visao: VisaoPatrimonioRevenda
  fluxos: FluxoGiroRevenda[]
  onIrCarro: () => void
}) {
  const temLucro =
    resumo.lucroVendidosMeu !== 0 || resumo.lucroVendidosSocio !== 0

  return (
    <div className="space-y-5 overflow-y-auto p-4 sm:p-5">
      <VisaoGiroRevenda
        visao={visao}
        fluxos={fluxos}
        resumo={resumo}
        onIrCarro={onIrCarro}
        expandido
      />

      {temLucro && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
          Lucro já realizado (vendidos a meia):{' '}
          <span className="font-semibold text-emerald-600">
            {resumo.nomeDono} {formatarMoeda(resumo.lucroVendidosMeu)}
          </span>
          {' · '}
          <span className="font-semibold text-emerald-600">
            {resumo.nomeSocio} {formatarMoeda(resumo.lucroVendidosSocio)}
          </span>
        </p>
      )}
    </div>
  )
}

function textoResumoFluxo(fluxo: FluxoGiroRevenda): string {
  return fluxo.etapas
    .map((e) => {
      if (e.tipo === 'venda') return `Vendemos ${e.nome} (${formatarMoeda(e.valor)})`
      if (e.tipo === 'compra') return `Compramos ${e.nome} (${formatarMoeda(e.valor)})`
      if (e.tipo === 'despesas') return `Despesas ${e.nome} (${formatarMoeda(e.valor)})`
      if (e.tipo === 'caixa_atual') return `${e.nome} ${formatarMoeda(e.valor)}`
      return e.nome
    })
    .join(' → ')
}

function VisaoGiroRevenda({
  visao,
  fluxos,
  resumo,
  onIrCarro,
  expandido = false,
}: {
  visao: VisaoPatrimonioRevenda
  fluxos: FluxoGiroRevenda[]
  resumo: ResumoCaixaRevendaCard
  onIrCarro: () => void
  expandido?: boolean
}) {
  const pctCaixa =
    visao.totalNoGiro > 0 ? (visao.emCaixa / visao.totalNoGiro) * 100 : 100
  const pctCarros =
    visao.totalNoGiro > 0 ? (visao.emCarros / visao.totalNoGiro) * 100 : 0
  const pctDespesas =
    visao.totalNoGiro > 0 ? (visao.totalDespesas / visao.totalNoGiro) * 100 : 0
  const colsDespesas = visao.totalDespesas > 0 ? 3 : 2

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Onde está o dinheiro da revenda
        </p>
        <p className="tabular mt-1 text-3xl font-bold text-violet-700 dark:text-violet-300">
          {formatarMoeda(visao.totalNoGiro)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Só a parte do caixa revenda (giro a meia)
        </p>

        {visao.totalNoGiro > 0 && (
          <div className="mt-4">
            <div className="flex h-4 overflow-hidden rounded-lg">
              {visao.emCaixa > 0 && (
                <div
                  className="flex items-center justify-center bg-violet-600 text-[10px] font-semibold text-white transition-all"
                  style={{
                    width: `${Math.max(pctCaixa, pctCaixa > 0 ? 8 : 0)}%`,
                  }}
                >
                  {pctCaixa >= 15 ? formatarMoeda(visao.emCaixa) : ''}
                </div>
              )}
              {visao.emCarros > 0 && (
                <div
                  className="flex items-center justify-center bg-violet-400 text-[10px] font-semibold text-violet-900 transition-all dark:bg-violet-500 dark:text-white"
                  style={{
                    width: `${Math.max(pctCarros, pctCarros > 0 ? 8 : 0)}%`,
                  }}
                >
                  {pctCarros >= 15 ? formatarMoeda(visao.emCarros) : ''}
                </div>
              )}
              {visao.totalDespesas > 0 && (
                <div
                  className="flex items-center justify-center bg-violet-200 text-[10px] font-semibold text-violet-800 transition-all dark:bg-violet-700 dark:text-violet-100"
                  style={{
                    width: `${Math.max(pctDespesas, pctDespesas > 0 ? 8 : 0)}%`,
                  }}
                >
                  {pctDespesas >= 15
                    ? formatarMoeda(visao.totalDespesas)
                    : ''}
                </div>
              )}
            </div>
            <div
              className={[
                'mt-2 grid gap-3',
                colsDespesas === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2',
              ].join(' ')}
            >
              <div className="rounded-lg border border-violet-500/30 bg-white/60 p-3 dark:bg-black/20">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Banknote size={16} />
                  <span className="text-xs font-semibold uppercase">
                    Em caixa
                  </span>
                </div>
                <p className="tabular mt-1 text-xl font-bold text-violet-800 dark:text-violet-200">
                  {formatarMoeda(visao.emCaixa)}
                </p>
                <p className="text-[11px] text-zinc-500">Disponível agora</p>
              </div>
              <div className="rounded-lg border border-violet-500/30 bg-white/60 p-3 dark:bg-black/20">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Car size={16} />
                  <span className="text-xs font-semibold uppercase">
                    Em carros
                  </span>
                </div>
                <p className="tabular mt-1 text-xl font-bold text-violet-800 dark:text-violet-200">
                  {formatarMoeda(visao.emCarros)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Revenda na compra (estoque)
                </p>
              </div>
              {visao.totalDespesas > 0 && (
                <div className="rounded-lg border border-violet-500/30 bg-white/60 p-3 dark:bg-black/20">
                  <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                    <Receipt size={16} />
                    <span className="text-xs font-semibold uppercase">
                      Despesas
                    </span>
                  </div>
                  <p className="tabular mt-1 text-xl font-bold text-violet-800 dark:text-violet-200">
                    {formatarMoeda(visao.totalDespesas)}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Em carros em estoque · caixa revenda
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {expandido && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-violet-500/20 pt-3 text-sm">
            <div>
              <span className="text-zinc-500">{resumo.nomeDono} (50% caixa)</span>
              <p className="tabular font-semibold">
                {formatarMoeda(resumo.parteDono)}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">{resumo.nomeSocio} (50% caixa)</span>
              <p className="tabular font-semibold">
                {formatarMoeda(resumo.parteSocio)}
              </p>
            </div>
          </div>
        )}
      </div>

      {visao.carrosEstoque.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Valor em carros agora</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {visao.carrosEstoque.map((c) => (
              <div
                key={c.veiculo_id}
                className="flex items-center gap-3 rounded-xl border border-violet-500/25 bg-violet-500/5 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600">
                  <Car size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`#carro-${c.veiculo_id}`}
                    onClick={onIrCarro}
                    className="truncate font-semibold text-primary hover:underline"
                  >
                    {c.nome}
                  </Link>
                  <p className="text-[11px] text-zinc-500">{c.placa}</p>
                </div>
                <p className="tabular shrink-0 text-sm font-bold text-violet-700 dark:text-violet-300">
                  {formatarMoeda(c.revendaTotal)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold">Como foi o giro</h3>
        {fluxos.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            Nenhum giro ainda — vendas a meia alimentam este caixa.
          </p>
        ) : (
          <ul className="space-y-4">
            {fluxos.map((fluxo) => (
              <li
                key={fluxo.id}
                className="rounded-xl border border-border-light bg-zinc-50/50 p-4 dark:border-border-dark dark:bg-zinc-900/30"
              >
                {fluxo.data ? (
                  <p className="mb-3 text-[11px] tabular text-zinc-500">
                    {formatarDataCurta(fluxo.data)}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {fluxo.etapas.map((etapa, i) => (
                    <div key={etapa.id} className="flex items-center gap-2">
                      <CaixaEtapaGiro etapa={etapa} onIrCarro={onIrCarro} />
                      {i < fluxo.etapas.length - 1 && (
                        <ArrowRight
                          size={16}
                          className="shrink-0 text-violet-400"
                          aria-hidden
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {textoResumoFluxo(fluxo)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CaixaEtapaGiro({
  etapa,
  onIrCarro,
}: {
  etapa: EtapaGiroRevenda
  onIrCarro: () => void
}) {
  const configs = {
    venda: {
      rotulo: 'Vendemos',
      cor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
      icone: TrendingUp,
    },
    compra: {
      rotulo: 'Compramos',
      cor: 'border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200',
      icone: Car,
    },
    despesas: {
      rotulo: 'Despesas',
      cor: 'border-zinc-500/35 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200',
      icone: Receipt,
    },
    caixa_atual: {
      rotulo: 'Hoje',
      cor: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
      icone: Banknote,
    },
  } as const

  const cfg = configs[etapa.tipo]
  const Icone = cfg.icone

  return (
    <div
      className={[
        'flex min-w-[7.5rem] flex-col rounded-xl border px-3 py-2.5',
        cfg.cor,
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5">
        <Icone size={14} className="shrink-0 opacity-80" />
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {cfg.rotulo}
        </span>
      </div>
      {etapa.veiculo_id && etapa.tipo !== 'caixa_atual' ? (
        <Link
          to={`#carro-${etapa.veiculo_id}`}
          onClick={onIrCarro}
          className="mt-1 truncate text-sm font-bold hover:underline"
        >
          {etapa.nome}
        </Link>
      ) : (
        <p className="mt-1 truncate text-sm font-bold">{etapa.nome}</p>
      )}
      <p className="tabular mt-0.5 text-base font-bold">
        {formatarMoeda(etapa.valor)}
      </p>
    </div>
  )
}
