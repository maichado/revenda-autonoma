import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Save, Trash2, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import type { Despesa, SimulacaoNegocio, Veiculo, Venda } from '@/types'
import { calcularSimulacaoNegocio, despesasDoVeiculo } from '@/utils/calculos'
import { gerarTextoSimulacaoNegocio } from '@/utils/calculadoraTexto'
import { formatarMoeda, formatarPercentual } from '@/utils/formatadores'
import { formatarMoedaBR, formatarPercentualBR } from '@/utils/relatorios'
import { novoIdPb } from '@/lib/pbIds'
import { MoedaInput } from './MoedaInput'
import { Button } from './Button'
import { RelatorioLayout } from './RelatorioLayout'
import { useStore } from '@/store/useStore'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatPbError } from '@/lib/pbApi'
import { useToast } from '@/hooks/useToast'

interface Props {
  veiculos: Veiculo[]
  despesas: Despesa[]
  vendas: Venda[]
}

function hojeIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function rotuloVeiculo(v: Veiculo): string {
  return `${v.marca} ${v.modelo} — ${v.placa}`
}

export function SimuladorNegocioPanel({ veiculos, despesas, vendas }: Props) {
  const simulacoes = useStore((s) => s.simulacoes)
  const simulacoesColecaoOk = useStore((s) => s.simulacoesColecaoOk)
  const nomeRevenda = useStore(
    (s) => s.configuracoes.nome_revenda || NOME_REVENDA_PADRAO,
  )
  const addSimulacao = useStore((s) => s.addSimulacao)
  const deleteSimulacao = useStore((s) => s.deleteSimulacao)
  const salvarServidor = useSalvarServidor()
  const toast = useToast()

  const [veiculoId, setVeiculoId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [precoCompra, setPrecoCompra] = useState(0)
  const [valorFipe, setValorFipe] = useState(0)
  const [precoVenda, setPrecoVenda] = useState(0)
  const [despesasEstimadas, setDespesasEstimadas] = useState(0)
  const [despesasEditadasManual, setDespesasEditadasManual] = useState(false)
  const [observacoes, setObservacoes] = useState('')

  const despesasVeiculo = useMemo(
    () => despesas.filter((d) => d.veiculo_id === veiculoId),
    [despesas, veiculoId],
  )

  const totalDespesasVeiculo = useMemo(
    () => (veiculoId ? despesasDoVeiculo(veiculoId, despesas) : 0),
    [veiculoId, despesas],
  )

  // Mantém despesas sincronizadas com o módulo Despesas enquanto o usuário não editar manualmente.
  useEffect(() => {
    if (!veiculoId || despesasEditadasManual) return
    setDespesasEstimadas(totalDespesasVeiculo)
  }, [veiculoId, totalDespesasVeiculo, despesasEditadasManual])

  function preencherDoVeiculo(id: string) {
    setVeiculoId(id)
    setDespesasEditadasManual(false)

    if (!id) return

    const v = veiculos.find((x) => x.id === id)
    if (!v) return

    const venda = vendas.find((x) => x.veiculo_id === id)

    setTitulo(rotuloVeiculo(v))
    setPrecoCompra(v.valor_compra)
    setValorFipe(v.valor_fipe ?? 0)
    setPrecoVenda(venda?.valor_venda ?? v.valor_venda_pretendido)
    setDespesasEstimadas(despesasDoVeiculo(id, despesas))
  }

  const resultado = useMemo(() => {
    if (precoCompra <= 0 && precoVenda <= 0) return null
    return calcularSimulacaoNegocio(
      precoCompra,
      valorFipe,
      precoVenda,
      despesasEstimadas,
    )
  }, [precoCompra, valorFipe, precoVenda, despesasEstimadas])

  const textoCompartilhamento = useMemo(() => {
    if (!resultado) return ''
    return gerarTextoSimulacaoNegocio({
      titulo: titulo,
      precoCompra,
      valorFipe,
      precoVenda,
      despesasEstimadas,
      observacoes,
      resultado,
      nomeRevenda,
    })
  }, [
    resultado,
    titulo,
    precoCompra,
    valorFipe,
    precoVenda,
    despesasEstimadas,
    observacoes,
    nomeRevenda,
  ])

  async function salvar() {
    if (precoCompra <= 0 || precoVenda <= 0) {
      toast.error('Preencha preço de compra e preço de venda.')
      return
    }
    const sim: SimulacaoNegocio = {
      id: novoIdPb(),
      titulo: titulo.trim(),
      data: hojeIso(),
      preco_compra: precoCompra,
      valor_fipe: valorFipe,
      preco_venda: precoVenda,
      despesas_estimadas: despesasEstimadas,
      observacoes: observacoes.trim(),
    }
    const ok = await salvarServidor(() => addSimulacao(sim), 'Simulação salva')
    if (!ok) return
  }

  async function excluir(id: string) {
    try {
      await deleteSimulacao(id)
      toast.success('Simulação excluída', 'Salvo no servidor.')
    } catch (err) {
      toast.error('Falha ao excluir', formatPbError(err))
    }
  }

  return (
    <div className="space-y-6">
      {!simulacoesColecaoOk && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Banco precisa ser atualizado</p>
            <p className="mt-1 text-amber-800 dark:text-amber-200/90">
              A collection <code className="rounded bg-amber-500/15 px-1">simulacoes</code> ainda
              não existe no PocketBase. Rode no terminal:{' '}
              <code className="rounded bg-amber-500/15 px-1">
                .\scripts\atualizar-schema.ps1
              </code>{' '}
              e recarregue a página.
            </p>
          </div>
        </div>
      )}

      {/* Entradas (largura total) */}
      <div className="card space-y-4 p-5">
        <h3 className="text-sm font-semibold">Dados da simulação</h3>

        {veiculos.length > 0 && (
          <div className="space-y-1.5">
            <label
              htmlFor="sim-veiculo"
              className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Preencher do estoque (opcional)
            </label>
            <select
              id="sim-veiculo"
              value={veiculoId}
              onChange={(e) => preencherDoVeiculo(e.target.value)}
              className="input w-full"
            >
              <option value="">Digitar manualmente...</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {rotuloVeiculo(v)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="sim-titulo"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Título (opcional)
          </label>
          <input
            id="sim-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="input w-full"
            placeholder="Ex.: Gol 2020 — negociação leilão"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoMoeda
            id="sim-compra"
            label="Preço de compra"
            value={precoCompra}
            onChange={setPrecoCompra}
          />
          <CampoMoeda
            id="sim-fipe"
            label="Preço FIPE"
            value={valorFipe}
            onChange={setValorFipe}
          />
          <CampoMoeda
            id="sim-venda"
            label="Preço de venda"
            value={precoVenda}
            onChange={setPrecoVenda}
          />
          <CampoMoeda
            id="sim-despesas"
            label="Despesas do veículo"
            value={despesasEstimadas}
            onChange={(v) => {
              setDespesasEstimadas(v)
              setDespesasEditadasManual(true)
            }}
            hint={
              veiculoId
                ? despesasVeiculo.length > 0
                  ? `${despesasVeiculo.length} lançamento(s) no módulo Despesas — total ${formatarMoeda(totalDespesasVeiculo)}`
                  : 'Nenhuma despesa vinculada a este veículo no módulo Despesas'
                : undefined
            }
          />
        </div>

        {veiculoId && despesasVeiculo.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border-light bg-zinc-50/60 px-3 py-2 text-xs dark:border-border-dark dark:bg-white/[0.03]">
            {despesasVeiculo.map((d) => (
              <li
                key={d.id}
                className="flex justify-between gap-2 text-zinc-600 dark:text-zinc-300"
              >
                <span className="truncate">{d.descricao}</span>
                <span className="tabular shrink-0 font-medium">
                  {formatarMoeda(d.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="sim-obs"
            className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
          >
            Observações
          </label>
          <textarea
            id="sim-obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="input min-h-[72px] w-full resize-y"
            placeholder="Notas sobre o negócio..."
          />
        </div>

        <Button
          variant="primary"
          leftIcon={<Save size={16} />}
          onClick={salvar}
          disabled={!simulacoesColecaoOk || precoCompra <= 0 || precoVenda <= 0}
        >
          Salvar simulação no servidor
        </Button>
      </div>

      {!resultado ? (
        <div className="card space-y-2 p-5">
          <h3 className="text-sm font-semibold">Resultados</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Informe compra e venda para ver os cálculos.
          </p>
        </div>
      ) : (
        <RelatorioLayout
          titulo="Resultados da simulação"
          descricao={
            titulo.trim()
              ? titulo.trim()
              : 'Resultado da simulação atual — pronto para compartilhar.'
          }
          slug="simulacao-negocio"
          texto={textoCompartilhamento}
          habilitarPdf
          nomeRevenda={nomeRevenda}
          visual={
            <div className="space-y-5">
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <VisualMetrica titulo="Compra" valor={formatarMoedaBR(precoCompra)} />
                {valorFipe > 0 && (
                  <VisualMetrica titulo="FIPE" valor={formatarMoedaBR(valorFipe)} />
                )}
                <VisualMetrica titulo="Venda" valor={formatarMoedaBR(precoVenda)} />
                <VisualMetrica titulo="Despesas" valor={formatarMoedaBR(despesasEstimadas)} />
                <VisualMetrica
                  titulo="Custo total do carro"
                  valor={formatarMoedaBR(resultado.custoTotal)}
                  destaque
                />
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <ResultadoCard
                  titulo="Lucro bruto"
                  valor={formatarMoeda(resultado.lucroBruto)}
                  positivo={resultado.lucroBruto >= 0}
                  subtitulo="Venda − compra"
                />
                <ResultadoCard
                  titulo="Lucro líquido"
                  valor={formatarMoeda(resultado.lucroLiquido)}
                  positivo={resultado.lucroLiquido >= 0}
                  subtitulo="Venda − compra − despesas"
                />
                <ResultadoCard
                  titulo="Margem"
                  valor={formatarPercentual(resultado.margemPercentual)}
                  positivo={resultado.margemPercentual >= 0}
                  subtitulo="Sobre o preço de compra"
                />
                <ResultadoCard
                  titulo="ROI"
                  valor={formatarPercentual(resultado.roiPercentual)}
                  positivo={resultado.roiPercentual >= 0}
                  subtitulo="Sobre custo total"
                />
                <ResultadoCard
                  titulo="Compra vs FIPE"
                  valor={formatarMoeda(resultado.diffCompraFipe)}
                  positivo={resultado.diffCompraFipe >= 0}
                  subtitulo="FIPE − compra (positivo = abaixo da FIPE)"
                />
                <ResultadoCard
                  titulo="Venda vs FIPE"
                  valor={formatarMoeda(resultado.diffVendaFipe)}
                  positivo={resultado.diffVendaFipe >= 0}
                  subtitulo="Venda − FIPE"
                />
              </section>

              {observacoes.trim() && (
                <p className="rounded-lg border border-border-light bg-zinc-50/60 px-4 py-3 text-sm text-zinc-600 dark:border-border-dark dark:bg-white/[0.03] dark:text-zinc-300">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Observações
                  </span>
                  <br />
                  {observacoes.trim()}
                </p>
              )}
            </div>
          }
        />
      )}

      {/* Histórico salvo no servidor */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold">
          Simulações salvas ({simulacoes.length})
        </h3>
        {simulacoes.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhuma simulação salva ainda. Os registros ficam no PocketBase.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-border-dark dark:text-zinc-400">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2 text-right">Compra</th>
                  <th className="px-3 py-2 text-right">FIPE</th>
                  <th className="px-3 py-2 text-right">Venda</th>
                  <th className="px-3 py-2 text-right">Custo total</th>
                  <th className="px-3 py-2 text-right">Lucro líq.</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {simulacoes.map((s) => {
                  const r = calcularSimulacaoNegocio(
                    s.preco_compra,
                    s.valor_fipe,
                    s.preco_venda,
                    s.despesas_estimadas,
                  )
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border-light last:border-0 dark:border-border-dark"
                    >
                      <td className="px-3 py-2.5 tabular text-zinc-500">
                        {s.data.split('-').reverse().join('/')}
                      </td>
                      <td className="px-3 py-2.5 font-medium">
                        {s.titulo || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatarMoeda(s.preco_compra)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatarMoeda(s.valor_fipe)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatarMoeda(s.preco_venda)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular">
                        {formatarMoeda(r.custoTotal)}
                      </td>
                      <td
                        className={[
                          'px-3 py-2.5 text-right tabular font-semibold',
                          r.lucroLiquido >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500',
                        ].join(' ')}
                      >
                        {formatarMoeda(r.lucroLiquido)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => excluir(s.id)}
                          className="btn-press rounded-lg p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                          aria-label="Excluir simulação"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CampoMoeda({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      <MoedaInput id={id} value={value} onChange={onChange} className="input w-full" />
      {hint && (
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  )
}

function ResultadoCard({
  titulo,
  valor,
  subtitulo,
  positivo,
  neutro = false,
}: {
  titulo: string
  valor: string
  subtitulo: string
  positivo: boolean
  neutro?: boolean
}) {
  return (
    <div className="rounded-lg border border-border-light bg-zinc-50/60 p-3 dark:border-border-dark dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {titulo}
        </p>
        {!neutro &&
          (positivo ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          ))}
      </div>
      <p
        className={[
          'tabular mt-1 text-lg font-semibold',
          neutro
            ? 'text-zinc-800 dark:text-zinc-100'
            : positivo
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400',
        ].join(' ')}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        {subtitulo}
      </p>
    </div>
  )
}

function VisualMetrica({
  titulo,
  valor,
  destaque = false,
  positivo,
}: {
  titulo: string
  valor: string
  destaque?: boolean
  positivo?: boolean
}) {
  return (
    <div
      className={[
        'rounded-lg border p-3',
        destaque
          ? 'border-primary/30 bg-primary/5'
          : 'border-border-light bg-zinc-50/60 dark:border-border-dark dark:bg-white/[0.03]',
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {titulo}
      </p>
      <p
        className={[
          'tabular mt-1 text-base font-semibold',
          positivo === undefined
            ? 'text-zinc-800 dark:text-zinc-100'
            : positivo
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500 dark:text-red-400',
        ].join(' ')}
      >
        {valor}
      </p>
    </div>
  )
}
