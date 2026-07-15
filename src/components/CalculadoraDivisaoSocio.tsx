import { useEffect, useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import type { Despesa, Veiculo, Venda } from '@/types'
import {
  calcularDivisaoMeiaCarro,
  despesasDoVeiculo,
  sugerirParticipantesDivisao,
} from '@/utils/calculos'
import { gerarTextoDivisaoSocio } from '@/utils/calculadoraTexto'
import { formatarMoeda } from '@/utils/formatadores'
import { formatarMoedaBR } from '@/utils/relatorios'
import { useStore } from '@/store/useStore'
import { MoedaInput } from './MoedaInput'
import { RelatorioLayout } from './RelatorioLayout'

interface Props {
  veiculos: Veiculo[]
  despesas: Despesa[]
  vendas: Venda[]
  socios: string[]
}

function rotuloVeiculo(v: Veiculo): string {
  return `${v.marca} ${v.modelo} — ${v.placa}`
}

export function CalculadoraDivisaoSocio({
  veiculos,
  despesas,
  vendas,
  socios,
}: Props) {
  const [veiculoId, setVeiculoId] = useState('')
  const [valorTotal, setValorTotal] = useState(0)
  const [socio1, setSocio1] = useState('')
  const [socio2, setSocio2] = useState('')
  const [valorEditadoManual, setValorEditadoManual] = useState(false)

  const nomeRevenda = useStore(
    (s) => s.configuracoes.nome_revenda || NOME_REVENDA_PADRAO,
  )

  const veiculo = useMemo(
    () => veiculos.find((v) => v.id === veiculoId),
    [veiculos, veiculoId],
  )

  const despesasVeiculo = useMemo(
    () => despesas.filter((d) => d.veiculo_id === veiculoId),
    [despesas, veiculoId],
  )

  const vendaVeiculo = useMemo(
    () => vendas.find((v) => v.veiculo_id === veiculoId),
    [vendas, veiculoId],
  )

  // Ao trocar o veículo, sugere valor da venda e nomes dos sócios.
  useEffect(() => {
    if (!veiculoId) return
    const [p1, p2] = sugerirParticipantesDivisao(socios, despesasVeiculo)
    setSocio1(p1)
    // Se o carro está marcado como "a meia" com um sócio definido, prioriza-o.
    setSocio2(
      veiculo?.tipo_propriedade === 'meia' && veiculo.socio_parceiro
        ? veiculo.socio_parceiro
        : p2,
    )
    if (!valorEditadoManual) {
      if (vendaVeiculo) {
        setValorTotal(vendaVeiculo.valor_venda)
      } else if (veiculo) {
        setValorTotal(veiculo.valor_venda_pretendido)
      }
    }
  }, [
    veiculoId,
    socios,
    despesasVeiculo,
    vendaVeiculo,
    veiculo,
    valorEditadoManual,
  ])

  const resultado = useMemo(() => {
    if (!veiculoId || valorTotal <= 0) return null
    return calcularDivisaoMeiaCarro(
      valorTotal,
      veiculoId,
      despesas,
      [socio1, socio2],
    )
  }, [valorTotal, veiculoId, despesas, socio1, socio2])

  const totalDespesasVeiculo = veiculoId
    ? despesasDoVeiculo(veiculoId, despesas)
    : 0

  const textoCompartilhamento = useMemo(() => {
    if (!resultado || !veiculo) return ''
    return gerarTextoDivisaoSocio({
      veiculoLabel: rotuloVeiculo(veiculo),
      resultado,
      nomeRevenda,
    })
  }, [resultado, veiculo, nomeRevenda])

  return (
    <section
      className="card space-y-5 border-l-4 border-l-primary p-5"
      aria-label="Calculadora de divisão entre sócios"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Calculator size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">
            Calculadora de divisão 50/50
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Recebe o valor da venda, resgata as despesas de cada sócio e divide
            o que sobrar em partes iguais (50/50).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label
            htmlFor="calc-veiculo"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Veículo
          </label>
          <select
            id="calc-veiculo"
            value={veiculoId}
            onChange={(e) => {
              setVeiculoId(e.target.value)
              setValorEditadoManual(false)
            }}
            className="input w-full"
          >
            <option value="">Selecione o veículo...</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {rotuloVeiculo(v)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="calc-valor"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Valor total recebido
          </label>
          <MoedaInput
            id="calc-valor"
            value={valorTotal}
            onChange={(v) => {
              setValorTotal(v)
              setValorEditadoManual(true)
            }}
            className="input w-full"
            disabled={!veiculoId}
          />
          {veiculoId && vendaVeiculo && !valorEditadoManual && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Preenchido com o valor da venda registrada.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-1">
          <div className="space-y-1.5">
            <label
              htmlFor="calc-socio1"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Sócio 1
            </label>
            <input
              id="calc-socio1"
              type="text"
              value={socio1}
              onChange={(e) => setSocio1(e.target.value)}
              className="input w-full"
              disabled={!veiculoId}
              placeholder="Nome"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="calc-socio2"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Sócio 2
            </label>
            <input
              id="calc-socio2"
              type="text"
              value={socio2}
              onChange={(e) => setSocio2(e.target.value)}
              className="input w-full"
              disabled={!veiculoId}
              placeholder="Nome"
            />
          </div>
        </div>
      </div>

      {veiculoId && (
        <div className="flex flex-wrap gap-4 rounded-lg bg-zinc-50/80 px-4 py-3 text-sm dark:bg-white/[0.04]">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">
              Despesas do veículo:{' '}
            </span>
            <span className="tabular font-semibold">
              {formatarMoeda(totalDespesasVeiculo)}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {' '}
              ({despesasVeiculo.length}{' '}
              {despesasVeiculo.length === 1 ? 'lançamento' : 'lançamentos'})
            </span>
          </div>
          {veiculo && (
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                Compra:{' '}
              </span>
              <span className="tabular font-semibold">
                {formatarMoeda(veiculo.valor_compra)}
              </span>
            </div>
          )}
        </div>
      )}

      {!veiculoId ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Info size={16} className="shrink-0" />
          Selecione um veículo para calcular a divisão.
        </p>
      ) : valorTotal <= 0 ? (
        <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <Info size={16} className="shrink-0" />
          Informe o valor total recebido na venda.
        </p>
      ) : resultado ? (
        <>
          {/* Passo a passo da conta */}
          <div className="grid gap-2 rounded-lg bg-zinc-50/80 px-4 py-3 text-sm dark:bg-white/[0.04] sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                1. Valor recebido
              </p>
              <p className="tabular mt-0.5 font-semibold">
                {formatarMoeda(resultado.valorTotal)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                2. (−) Despesas do carro
              </p>
              <p className="tabular mt-0.5 font-semibold text-amber-600 dark:text-amber-400">
                {formatarMoeda(resultado.totalDespesas)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                3. (=) Sobra para dividir
              </p>
              <p className="tabular mt-0.5 font-semibold text-primary">
                {formatarMoeda(resultado.valorRestante)}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatarMoeda(resultado.valorRestante / 2)} para cada sócio
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border-light bg-zinc-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-white/[0.04] dark:text-zinc-400">
                  <th className="px-4 py-2.5">Sócio</th>
                  <th className="px-4 py-2.5 text-right">Reembolso despesas</th>
                  <th className="px-4 py-2.5 text-right">Metade do lucro</th>
                  <th className="px-4 py-2.5 text-right">Total a receber</th>
                </tr>
              </thead>
              <tbody>
                {resultado.linhas.map((linha) => (
                  <tr
                    key={linha.participante}
                    className="border-b border-border-light last:border-0 dark:border-border-dark"
                  >
                    <td className="px-4 py-3 font-medium">
                      {linha.participante}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                      + {formatarMoeda(linha.despesasPagas)}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      + {formatarMoeda(linha.metadeLucro)}
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatarMoeda(linha.valorAReceber)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50/80 text-sm font-semibold dark:bg-white/[0.04]">
                  <td className="px-4 py-3">Total distribuído</td>
                  <td className="tabular px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                    {formatarMoeda(
                      resultado.linhas.reduce(
                        (acc, l) => acc + l.despesasPagas,
                        0,
                      ),
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    {formatarMoeda(
                      resultado.linhas.reduce(
                        (acc, l) => acc + l.metadeLucro,
                        0,
                      ),
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {formatarMoeda(resultado.somaLiquido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {resultado.despesasNaoAtribuidas > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Info size={14} className="mt-0.5 shrink-0" />
              {formatarMoeda(resultado.despesasNaoAtribuidas)} em despesas não
              foram atribuídas aos nomes dos sócios acima — confira o campo
              &quot;Quem pagou&quot; nos lançamentos.
            </p>
          )}

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Fórmula: do valor recebido, descontam-se todas as despesas do
            veículo; o que sobrar é dividido em duas partes iguais. Cada sócio
            recebe o reembolso do que pagou + sua metade do lucro. Os nomes
            devem coincidir com &quot;Quem pagou&quot; nas despesas.
          </p>

          <RelatorioLayout
            titulo="Divisão 50/50"
            descricao={veiculo ? rotuloVeiculo(veiculo) : undefined}
            slug="divisao-5050"
            texto={textoCompartilhamento}
            habilitarPdf
            nomeRevenda={nomeRevenda}
            visual={
              <div className="space-y-4">
                <section className="grid gap-2 rounded-lg bg-zinc-50/80 px-4 py-3 text-sm dark:bg-white/[0.04] sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      1. Valor recebido
                    </p>
                    <p className="tabular mt-0.5 font-semibold">
                      {formatarMoedaBR(resultado.valorTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      2. (−) Despesas do carro
                    </p>
                    <p className="tabular mt-0.5 font-semibold text-amber-600 dark:text-amber-400">
                      {formatarMoedaBR(resultado.totalDespesas)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      3. (=) Sobra para dividir
                    </p>
                    <p className="tabular mt-0.5 font-semibold text-primary">
                      {formatarMoedaBR(resultado.valorRestante)}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatarMoedaBR(resultado.valorRestante / 2)} para cada
                      sócio
                    </p>
                  </div>
                </section>

                <div className="overflow-x-auto rounded-lg border border-border-light dark:border-border-dark">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-border-light bg-zinc-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:bg-white/[0.04] dark:text-zinc-400">
                        <th className="px-4 py-2.5">Sócio</th>
                        <th className="px-4 py-2.5 text-right">
                          Reembolso despesas
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          Metade do lucro
                        </th>
                        <th className="px-4 py-2.5 text-right">
                          Total a receber
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.linhas.map((linha) => (
                        <tr
                          key={linha.participante}
                          className="border-b border-border-light last:border-0 dark:border-border-dark"
                        >
                          <td className="px-4 py-3 font-medium">
                            {linha.participante}
                          </td>
                          <td className="tabular px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                            {formatarMoedaBR(linha.despesasPagas)}
                          </td>
                          <td className="tabular px-4 py-3 text-right">
                            {formatarMoedaBR(linha.metadeLucro)}
                          </td>
                          <td className="tabular px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatarMoedaBR(linha.valorAReceber)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {resultado.despesasNaoAtribuidas > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {formatarMoedaBR(resultado.despesasNaoAtribuidas)} em
                    despesas não atribuídas aos sócios.
                  </p>
                )}
              </div>
            }
          />
        </>
      ) : null}
    </section>
  )
}
