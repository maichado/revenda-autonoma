// Banco Pessoal — visão simples: números automáticos, devolução só quando
// você marcar (nada é marcado automaticamente na venda).

import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Car, PiggyBank, RotateCcw, Settings, Users, Wallet } from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatarMoeda, formatarDataCurta } from '@/utils/formatadores'
import {
  STATUS_CARRO_META,
  carrosFromSistema,
  detalheMinhaParteCarro,
  detalheVendaCarro,
  lancamentosFromSistema,
  lucroMeuCarro,
  minhaParteInvestida,
  nomeDonoCompleto,
  primeiroNomeDono,
  resumoBancoPessoal,
} from '@/utils/bancoPessoal'
import type { LancamentoBancoPessoal } from '@/types'

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

  const opcoesCaixa = useMemo(
    () => ({ despesas, nomeRevenda, socios }),
    [despesas, nomeRevenda, socios],
  )

  const carros = useMemo(
    () =>
      carrosFromSistema(
        veiculos,
        despesas,
        vendas,
        capitalInicial,
        opcoesCaixa,
      ),
    [veiculos, despesas, vendas, capitalInicial, opcoesCaixa],
  )

  const lancamentos = useMemo(
    () =>
      lancamentosFromSistema(
        despesas,
        veiculos,
        dono,
        capitalInicial,
        vendas,
      ),
    [despesas, veiculos, dono, capitalInicial, vendas],
  )

  const resumo = useMemo(
    () =>
      resumoBancoPessoal(
        carros,
        lancamentos,
        capitalInicial,
        veiculos,
        vendas,
        opcoesCaixa,
      ),
    [carros, lancamentos, capitalInicial, veiculos, vendas, opcoesCaixa],
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
            {dono} · capital {formatarMoeda(capitalInicial)} · solo 100%, meia
            50%
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo={`Caixa ${nomeRevenda}`}
          valor={resumo.caixaRevenda}
          icone={<Wallet size={18} />}
          destaque="primary"
          dica="Vendas menos compras e despesas pagas pelo caixa da loja"
        />
        <Numero
          rotulo="Em carros"
          valor={resumo.minhaParteEstoque}
          icone={<Car size={18} />}
          dica="Sua parte no estoque"
        />
        <Numero
          rotulo="Patrimônio"
          valor={resumo.patrimonioTotal}
          icone={<PiggyBank size={18} />}
          dica="Caixa + estoque"
        />
        <Numero
          rotulo="A devolver"
          valor={resumo.totalADevolver}
          icone={<Wallet size={18} />}
          destaque={resumo.totalADevolver > 0 ? 'alerta' : undefined}
          dica={`Bolso de ${nomeCurto}`}
        />
      </section>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-border-light px-5 py-3 dark:border-border-dark">
          <h2 className="text-sm font-semibold">Carros</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Minha parte = compra + despesas × fração. Revenda / Investimento /
            Pessoal = origem da compra. Venda = valor recebido (total e sua
            parte se 50%).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border-light text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark">
                <th className="px-5 py-2">Carro</th>
                <th className="px-3 py-2 text-right">Minha parte</th>
                <th className="px-3 py-2 text-right">Revenda</th>
                <th className="px-3 py-2 text-right">Investimento</th>
                <th className="px-3 py-2 text-right">Pessoal</th>
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
                      className="border-b border-border-light last:border-0 dark:border-border-dark"
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
        <div className="flex items-center justify-between gap-3 border-b border-border-light bg-red-500/5 px-5 py-3 dark:border-border-dark">
          <div>
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">
              A devolver — edite aqui
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Marque ✓ só quando o negócio te devolver. Desmarque em Despesas
              também (campo reembolsado).
            </p>
          </div>
          <span className="tabular text-lg font-bold text-red-600 dark:text-red-400">
            {formatarMoeda(resumo.totalADevolver)}
          </span>
        </div>

        {lancamentosOrdenados.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            Nada pendente. Se deveria aparecer, use &quot;Nada devolvido
            ainda&quot; acima ou confira &quot;Quem pagou&quot; = {dono} em{' '}
            <Link to="/despesas" className="text-primary hover:underline">
              Despesas
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark">
                  <th className="px-5 py-2">Descrição</th>
                  <th className="px-3 py-2">Carro</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-5 py-2 text-center">Devolvido?</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosOrdenados.map((l) => {
                  const devolvido = l.status === 'devolvido'
                  return (
                    <tr
                      key={l.id}
                      className={[
                        'border-b border-border-light last:border-0 dark:border-border-dark',
                        devolvido ? 'opacity-60' : '',
                      ].join(' ')}
                    >
                      <td className="px-5 py-2.5">
                        <div className="font-medium">{l.descricao}</div>
                        <div className="text-[11px] text-zinc-500 tabular">
                          {l.data ? formatarDataCurta(l.data) : '—'}
                          {l.origem === 'compra_extra' ? ' · compra extra' : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-500">
                        {l.carro_nome}
                      </td>
                      <td
                        className={[
                          'px-3 py-2.5 text-right tabular font-semibold',
                          devolvido
                            ? 'text-zinc-400 line-through'
                            : 'text-red-500',
                        ].join(' ')}
                      >
                        {formatarMoeda(l.valor)}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={devolvido}
                          onChange={(e) =>
                            marcarDevolvido(l, e.target.checked)
                          }
                          className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600"
                          aria-label={
                            devolvido
                              ? 'Desmarcar devolução'
                              : 'Marcar como devolvido'
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Numero({
  rotulo,
  valor,
  icone,
  dica,
  destaque,
}: {
  rotulo: string
  valor: number
  icone: ReactNode
  dica: string
  destaque?: 'primary' | 'alerta'
}) {
  const cor =
    destaque === 'alerta'
      ? 'text-red-600 dark:text-red-400'
      : destaque === 'primary'
        ? 'text-primary'
        : 'text-zinc-800 dark:text-zinc-100'
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        {icone}
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {rotulo}
        </span>
      </div>
      <p className={['tabular mt-1 text-2xl font-bold', cor].join(' ')}>
        {formatarMoeda(valor)}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        {dica}
      </p>
    </div>
  )
}
