import { Moon, Sun } from 'lucide-react'
import { useStore } from '@/store/useStore'

export function ThemeToggle() {
  const tema = useStore((s) => s.tema)
  const toggleTema = useStore((s) => s.toggleTema)
  const isDark = tema === 'dark'

  return (
    <button
      onClick={toggleTema}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={[
        'btn-press inline-flex h-9 w-9 items-center justify-center rounded-lg',
        'border border-border-light bg-white hover:bg-zinc-50',
        'dark:border-border-dark dark:bg-surface-dark dark:hover:bg-white/[0.04]',
      ].join(' ')}
    >
      {isDark ? (
        <Sun size={16} className="text-primary" />
      ) : (
        <Moon size={16} className="text-zinc-700" />
      )}
    </button>
  )
}
