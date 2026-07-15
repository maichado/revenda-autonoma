import { Pencil, Tag, Trash2 } from 'lucide-react'
import type { Veiculo } from '@/types'
import { StatusBadge } from './Badge'
import { formatarMoeda, formatarNumero, formatarPercentual } from '@/utils/formatadores'

interface Props {
  veiculos: Veiculo[]
  margensPorId: Record<string, number>
  onEditar: (v: Veiculo) => void
  onExcluir: (v: Veiculo) => void
  onRegistrarVenda: (v: Veiculo) => void
}

// Visualização em tabela: zebra + hover + ações por linha.
export function VeiculoTable({
  veiculos,
  margensPorId,
  onEditar,
  onExcluir,
  onRegistrarVenda,
}: Props) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <th className="px-3 py-3 font-medium">Placa</th>
            <th className="px-3 py-3 font-medium">Marca / Modelo</th>
            <th className="px-3 py-3 font-medium">Ano</th>
            <th className="px-3 py-3 text-right font-medium">KM</th>
            <th className="px-3 py-3 font-medium">Cor</th>
            <th className="px-3 py-3 text-right font-medium">Compra</th>
            <th className="px-3 py-3 text-right font-medium">Venda prev.</th>
            <th className="px-3 py-3 text-right font-medium">Margem</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="table-row-zebra table-row-hover">
          {veiculos.map((v) => {
            const margem = margensPorId[v.id] ?? 0
            let corMargem = 'text-emerald-600 dark:text-emerald-400'
            if (margem < 0) corMargem = 'text-red-600 dark:text-red-400'
            else if (margem < 10)
              corMargem = 'text-amber-600 dark:text-amber-400'
            const podeVender = v.status === 'disponível'
            return (
              <tr
                key={v.id}
                className="border-t border-border-light dark:border-border-dark"
              >
                <td className="px-3 py-3">
                  <span className="tabular rounded-md border border-border-light bg-zinc-50 px-2 py-0.5 text-xs font-semibold tracking-wider text-zinc-700 dark:border-border-dark dark:bg-white/[0.06] dark:text-zinc-200">
                    {v.placa}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">
                    {v.marca}
                    {v.tipo_propriedade === 'meia' && (
                      <span
                        className="badge ml-2 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        title={
                          v.socio_parceiro
                            ? `Carro a meia com ${v.socio_parceiro}`
                            : 'Carro a meia — lucro dividido 50/50'
                        }
                      >
                        A meia
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {v.modelo}
                  </p>
                </td>
                <td className="tabular px-3 py-3">{v.ano}</td>
                <td className="tabular px-3 py-3 text-right">
                  {formatarNumero(v.quilometragem)}
                </td>
                <td className="px-3 py-3">{v.cor}</td>
                <td className="tabular px-3 py-3 text-right">
                  {formatarMoeda(v.valor_compra)}
                </td>
                <td className="tabular px-3 py-3 text-right font-semibold">
                  {formatarMoeda(v.valor_venda_pretendido)}
                </td>
                <td
                  className={['tabular px-3 py-3 text-right font-semibold', corMargem].join(
                    ' ',
                  )}
                >
                  {formatarPercentual(margem, 1)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditar(v)}
                      title="Editar"
                      aria-label={`Editar ${v.placa}`}
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.08]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => podeVender && onRegistrarVenda(v)}
                      disabled={!podeVender}
                      title={
                        podeVender
                          ? 'Registrar venda'
                          : 'Somente veículos disponíveis podem ser vendidos'
                      }
                      aria-label={`Registrar venda de ${v.placa}`}
                      className={[
                        'btn-press grid h-8 w-8 place-items-center rounded-md',
                        podeVender
                          ? 'text-primary hover:bg-primary/15'
                          : 'cursor-not-allowed text-zinc-300 dark:text-zinc-700',
                      ].join(' ')}
                    >
                      <Tag size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExcluir(v)}
                      title="Excluir"
                      aria-label={`Excluir ${v.placa}`}
                      className="btn-press grid h-8 w-8 place-items-center rounded-md text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
