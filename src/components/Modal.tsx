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
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

// Modal genérico — sheet no mobile, centro no desktop (Apple spatial consistency).
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

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
        className="absolute inset-0 bg-black/45 animate-fade-in backdrop-blur-[2px]"
      />
      <div
        className={[
          'relative flex w-full max-h-[92dvh] flex-col overflow-hidden',
          'material-heavy border border-black/[0.06] dark:border-white/[0.08]',
          'rounded-t-[22px] sm:max-h-[calc(100vh-2rem)] sm:rounded-[20px]',
          'animate-sheet-in sm:animate-modal-in',
          'shadow-elevated dark:shadow-elevated-dark',
          sizeClasses[size],
        ].join(' ')}
      >
        <div className="px-4 pt-3 sm:hidden" aria-hidden>
          <div className="sheet-handle" />
        </div>
        {(title || description) && (
          <header className="flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-1 sm:p-5 sm:pb-4">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[17px] font-semibold tracking-tight sm:text-lg">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 rounded-full"
            >
              <X size={16} />
            </Button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5 sm:pb-5">
          {children}
        </div>
        {footer && (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] bg-black/[0.02] p-3 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
