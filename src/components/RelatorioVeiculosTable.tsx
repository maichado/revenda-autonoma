// Tabela "Veículos do período" — núcleo do relatório.
//
// Características (spec):
//   • Colunas: Placa, Marca/Modelo, Ano, Compra, Venda, R$ compra, R$ despesas,
//     R$ venda, Lucro, ROI, Dias em estoque, Status.
//   • Ordenação clicável nas colunas principais (data, lucro, ROI, dias).
//   • Lucro/ROI coloridos (verde/vermelho).
//   • Linha de TOTAIS no rodapé.
//   • Zebra + hover (classes utilitárias do projeto).

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { StatusBadge } from '@/components/Badge'
import {
  formatarDataCurta,
  formatarMoeda,
  formatarPercentual,
} from '@/utils/formatadores'
import type { VeiculoLinhaRelatorio } from '@/utils/relatorios'

export type ChaveOrdenacao =
  | 'dataCompra'
  | 'dataVenda'
  | 'compra'
  | 'despesas'
  | 'venda_valor'
  | 'lucro'
  | 'roi'
  | 'diasEmEstoque'

type Direcao = 'asc' | 'desc'

interface Props {
  linhas: VeiculoLinhaRelatorio[]
}

// Ordenação inicial: lucro decrescente (a tabela do relatório foca em
// "quanto rendeu" — faz sentido começar pelos campeões no topo).
const ORDEM_INICIAL: { chave: ChaveOrdenacao; dir: Direcao } = {
  chave: 'lucro',
  dir: 'desc',
}

export function RelatorioVeiculosTable({ linhas }: Props) {
  const [ordem, setOrdem] = useState(ORDEM_INICIAL)

  const linhasOrdenadas = useMemo(() => {
    const arr = [...linhas]
    const fator = ordem.dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const va = obterValor(a, ordem.chave)
      const vb = obterValor(b, ordem.chave)
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * fator
      }
      return String(va).localeCompare(String(vb)) * fator
    })
    return arr
  }, [linhas, ordem])

  // Totais: soma só do que faz sentido somar (custos + receita + lucro).
  const totais = useMemo(() => {
    return linhas.reduce(
      (acc, l) => ({
        compra: acc.compra + l.compra,
        despesas: acc.despesas + l.despesas,
        venda_valor: acc.venda_valor + l.venda_valor,
        lucro: acc.lucro + l.lucro,
      }),
      { compra: 0, despesas: 0, venda_valor: 0, lucro: 0 },
    )
  }, [linhas])

  function trocarOrdem(chave: ChaveOrdenacao) {
    setOrdem((atual) => {
      if (atual.chave !== chave) return { chave, dir: 'desc' }
      return { chave, dir: atual.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  if (linhas.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium">
          Nenhum veículo relevante no período selecionado.
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          A tabela considera veículos COMPRADOS ou VENDIDOS dentro do intervalo.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto print-table">
      <table className="w-full min-w-[1200px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 py-3 font-medium">Placa</th>
            <th className="px-3 py-3 font-medium">Marca / Modelo</th>
            <th className="px-3 py-3 font-medium">Ano</th>
            <ThOrden chave="dataCompra" ordem={ordem} onClick={trocarOrdem}>
              Data Compra
            </ThOrden>
            <ThOrden chave="dataVenda" ordem={ordem} onClick={trocarOrdem}>
              Data Venda
            </ThOrden>
            <ThOrden
              chave="compra"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              Compra
            </ThOrden>
            <ThOrden
              chave="despesas"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              Despesas
            </ThOrden>
            <ThOrden
              chave="venda_valor"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              Venda
            </ThOrden>
            <ThOrden
              chave="lucro"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              Lucro
            </ThOrden>
            <ThOrden
              chave="roi"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              ROI
            </ThOrden>
            <ThOrden
              chave="diasEmEstoque"
              align="right"
              ordem={ordem}
              onClick={trocarOrdem}
            >
              Dias estoque
            </ThOrden>
            <th className="px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="table-row-zebra table-row-hover">
          {linhasOrdenadas.map((l) => {
            const lucroCor =
              l.lucro > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : l.lucro < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-400'

            const dataCompra = l.veiculo.data_compra
            const dataVenda = l.venda?.data ?? ''

            return (
              <tr
                key={l.veiculo.id}
                className="border-t border-border-light dark:border-border-dark"
              >
                <td className="px-3 py-3">
                  <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                    {l.veiculo.placa}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">
                    {l.veiculo.marca} {l.veiculo.modelo}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {l.veiculo.cor}
                  </p>
                </td>
                <td className="tabular px-3 py-3">{l.veiculo.ano}</td>
                <td className="tabular px-3 py-3 whitespace-nowrap">
                  {dataCompra ? formatarDataCurta(dataCompra) : '—'}
                </td>
                <td className="tabular px-3 py-3 whitespace-nowrap">
                  {dataVenda ? (
                    formatarDataCurta(dataVenda)
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="tabular px-3 py-3 text-right">
                  {formatarMoeda(l.compra)}
                </td>
                <td className="tabular px-3 py-3 text-right">
                  {formatarMoeda(l.despesas)}
                </td>
                <td className="tabular px-3 py-3 text-right font-medium">
                  {l.venda ? (
                    formatarMoeda(l.venda_valor)
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td
                  className={[
                    'tabular px-3 py-3 text-right font-semibold',
                    lucroCor,
                  ].join(' ')}
                  title={
                    l.venda
                      ? 'lucro = valor venda − valor compra − despesas vinculadas'
                      : 'Veículo sem venda no período — lucro indisponível.'
                  }
                >
                  {l.venda ? formatarMoeda(l.lucro) : '—'}
                </td>
                <td
                  className={[
                    'tabular px-3 py-3 text-right font-semibold',
                    lucroCor,
                  ].join(' ')}
                >
                  {l.venda ? formatarPercentual(l.roi, 1) : '—'}
                </td>
                <td className="tabular px-3 py-3 text-right">
                  {l.diasEmEstoque}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={l.veiculo.status} />
                </td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr className="border-t-2 border-border-light bg-zinc-50/60 text-sm dark:border-border-dark dark:bg-white/[0.03]">
            <td
              className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              colSpan={5}
            >
              Totais ({linhas.length}{' '}
              {linhas.length === 1 ? 'veículo' : 'veículos'})
            </td>
            <td className="tabular px-3 py-3 text-right font-semibold">
              {formatarMoeda(totais.compra)}
            </td>
            <td className="tabular px-3 py-3 text-right font-semibold">
              {formatarMoeda(totais.despesas)}
            </td>
            <td className="tabular px-3 py-3 text-right font-semibold">
              {formatarMoeda(totais.venda_valor)}
            </td>
            <td
              className={[
                'tabular px-3 py-3 text-right font-semibold',
                totais.lucro >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              ].join(' ')}
            >
              {formatarMoeda(totais.lucro)}
            </td>
            <td className="px-3 py-3" colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Auxiliares
// -----------------------------------------------------------------------------

function obterValor(
  linha: VeiculoLinhaRelatorio,
  chave: ChaveOrdenacao,
): number | string {
  switch (chave) {
    case 'dataCompra':
      return linha.veiculo.data_compra
    case 'dataVenda':
      return linha.venda?.data || '\uFFFF' // sem venda fica no fim no asc
    case 'compra':
      return linha.compra
    case 'despesas':
      return linha.despesas
    case 'venda_valor':
      return linha.venda_valor
    case 'lucro':
      return linha.lucro
    case 'roi':
      return linha.roi
    case 'diasEmEstoque':
      return linha.diasEmEstoque
  }
}

function ThOrden({
  chave,
  ordem,
  onClick,
  align = 'left',
  children,
}: {
  chave: ChaveOrdenacao
  ordem: { chave: ChaveOrdenacao; dir: Direcao }
  onClick: (c: ChaveOrdenacao) => void
  align?: 'left' | 'right'
  children: React.ReactNode
}) {
  const ativo = ordem.chave === chave
  const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      className={[
        'px-3 py-3 font-medium',
        align === 'right' ? 'text-right' : 'text-left',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onClick(chave)}
        className={[
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors',
          'hover:bg-zinc-100 dark:hover:bg-white/[0.05]',
          ativo ? 'text-primary' : '',
        ].join(' ')}
        aria-label={`Ordenar por ${typeof children === 'string' ? children : chave}`}
        aria-pressed={ativo}
      >
        {align === 'right' ? (
          <>
            <Icone size={11} /> <span>{children}</span>
          </>
        ) : (
          <>
            <span>{children}</span> <Icone size={11} />
          </>
        )}
      </button>
    </th>
  )
}
