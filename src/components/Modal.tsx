import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface Props {
  open: boolean
  title?: string
  description?: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

// Modal genérico — focado em uso sem navegação de página.
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: Props) {
  // ESC fecha o modal.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquear scroll do body quando aberto.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <button
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <div
        className={[
          'card relative flex w-full max-h-[92dvh] flex-col animate-slide-up overflow-hidden',
          'rounded-t-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl',
          sizeClasses[size],
        ].join(' ')}
      >
        {(title || description) && (
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-light p-4 sm:p-5 dark:border-border-dark">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-semibold tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0"
            >
              <X size={16} />
            </Button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border-light bg-zinc-50/60 p-3 sm:p-4 dark:border-border-dark dark:bg-white/[0.02]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
