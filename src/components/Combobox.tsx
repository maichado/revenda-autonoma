import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import type { FipeItem } from '@/lib/fipe'

function normalizar(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const MAX_VISIVEL = 80

interface Props {
  items: FipeItem[]
  /** Código do item selecionado (''=nenhum). */
  value: string
  onSelect: (codigo: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  /** Texto quando não há itens carregados. */
  emptyText?: string
}

/**
 * Campo de busca com sugestões filtradas conforme você digita.
 * Substitui o `<select>` para listas grandes (marcas/modelos FIPE).
 */
export function Combobox({
  items,
  value,
  onSelect,
  placeholder = 'Digite para buscar...',
  disabled,
  loading,
  emptyText = 'Nada encontrado',
}: Props) {
  const selecionado = useMemo(
    () => items.find((i) => i.codigo === value) ?? null,
    [items, value],
  )

  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Enquanto fechado, o campo mostra o item selecionado (ou vazio).
  useEffect(() => {
    if (!aberto) setQuery(selecionado ? selecionado.nome : '')
  }, [selecionado, aberto])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  const q = normalizar(query)
  const filtrados = useMemo(() => {
    // Quando o texto é igual ao item já selecionado, mostramos tudo
    // (o usuário abriu para trocar, não para confirmar o atual).
    const mesmoSelecionado = selecionado && normalizar(selecionado.nome) === q
    const base =
      q && !mesmoSelecionado
        ? items.filter((i) => normalizar(i.nome).includes(q))
        : items
    return base.slice(0, MAX_VISIVEL)
  }, [items, q, selecionado])

  function escolher(item: FipeItem) {
    onSelect(item.codigo)
    setAberto(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!aberto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setAberto(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtrados[ativo]
      if (item) escolher(item)
    } else if (e.key === 'Escape') {
      setAberto(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="input pr-9"
          value={query}
          placeholder={loading ? 'Carregando...' : placeholder}
          disabled={disabled || loading}
          onChange={(e) => {
            setQuery(e.target.value)
            setAtivo(0)
            setAberto(true)
          }}
          onFocus={(e) => {
            setAberto(true)
            e.target.select()
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-zinc-400">
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ChevronDown size={16} />
          )}
        </span>
      </div>

      {aberto && !disabled && !loading && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border-light bg-surface-light py-1 shadow-card dark:border-border-dark dark:bg-surface-dark dark:shadow-card-dark"
        >
          {filtrados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {items.length === 0 ? emptyText : 'Nada encontrado'}
            </li>
          ) : (
            filtrados.map((item, idx) => {
              const isSel = item.codigo === value
              return (
                <li key={item.codigo}>
                  <button
                    type="button"
                    onMouseEnter={() => setAtivo(idx)}
                    onClick={() => escolher(item)}
                    className={[
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                      idx === ativo
                        ? 'bg-primary/10 text-primary'
                        : 'text-zinc-700 dark:text-zinc-200',
                    ].join(' ')}
                  >
                    <span className="truncate">{item.nome}</span>
                    {isSel && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
