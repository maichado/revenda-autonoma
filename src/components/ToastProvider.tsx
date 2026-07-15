import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'

export type ToastTipo = 'success' | 'info' | 'warning' | 'error'

export interface Toast {
  id: string
  tipo: ToastTipo
  titulo: string
  mensagem?: string
}

export interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void
  success: (titulo: string, mensagem?: string) => void
  info: (titulo: string, mensagem?: string) => void
  warning: (titulo: string, mensagem?: string) => void
  error: (titulo: string, mensagem?: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

const icones: Record<ToastTipo, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  info: <Info size={18} className="text-sky-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  error: <XCircle size={18} className="text-red-500" />,
}

const cores: Record<ToastTipo, string> = {
  success: 'border-l-emerald-500',
  info: 'border-l-sky-500',
  warning: 'border-l-amber-500',
  error: 'border-l-red-500',
}

interface ProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const ultimoToastRef = useRef<{ chave: string; em: number } | null>(null)

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const chave = `${t.tipo}|${t.titulo}|${t.mensagem ?? ''}`
      const agora = Date.now()
      const ultimo = ultimoToastRef.current
      if (ultimo && ultimo.chave === chave && agora - ultimo.em < 3000) {
        return
      }
      ultimoToastRef.current = { chave, em: agora }

      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...t, id }])
      // Auto-dismiss em 4s.
      window.setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (titulo, mensagem) =>
        push({ tipo: 'success', titulo, mensagem }),
      info: (titulo, mensagem) => push({ tipo: 'info', titulo, mensagem }),
      warning: (titulo, mensagem) =>
        push({ tipo: 'warning', titulo, mensagem }),
      error: (titulo, mensagem) => push({ tipo: 'error', titulo, mensagem }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'card pointer-events-auto flex items-start gap-3 border-l-4 p-3 pr-2 animate-slide-up',
              cores[t.tipo],
            ].join(' ')}
            role="status"
          >
            <div className="mt-0.5">{icones[t.tipo]}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t.titulo}</p>
              {t.mensagem && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {t.mensagem}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              aria-label="Fechar notificação"
              className="rounded p-1 text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
