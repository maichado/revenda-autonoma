import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LogOut, MoreHorizontal, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { navItems, type NavItem } from './Sidebar'

/** Atalhos fixos na barra — o restante fica em "Mais". */
const PRIMARIOS = new Set(['/', '/veiculos', '/compras', '/vendas'])

// Bottom nav só em < md. Os 4 primeiros + "Mais" com o restante das seções.
export function BottomNav() {
  const location = useLocation()
  const { logout, user } = useAuth()
  const [maisAberto, setMaisAberto] = useState(false)

  const { principais, extras } = useMemo(() => {
    const principais: NavItem[] = []
    const extras: NavItem[] = []
    for (const item of navItems) {
      if (PRIMARIOS.has(item.to)) principais.push(item)
      else extras.push(item)
    }
    return { principais, extras }
  }, [])

  const rotaNoMais = extras.some(
    (i) =>
      location.pathname === i.to ||
      (i.to !== '/' && location.pathname.startsWith(i.to)),
  )

  useEffect(() => {
    setMaisAberto(false)
  }, [location.pathname])

  useEffect(() => {
    if (!maisAberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaisAberto(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [maisAberto])

  return (
    <>
      <nav
        className={[
          'fixed inset-x-0 bottom-0 z-40 md:hidden',
          'material chrome-edge-t pb-[env(safe-area-inset-bottom,0px)]',
        ].join(' ')}
        aria-label="Navegação inferior"
      >
        <ul className="grid grid-cols-5">
          {principais.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium tracking-wide',
                    'btn-press',
                    isActive
                      ? 'text-primary'
                      : 'text-zinc-500 dark:text-zinc-400',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-expanded={maisAberto}
              aria-controls="menu-mais-secoes"
              onClick={() => setMaisAberto((v) => !v)}
              className={[
                'flex w-full flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium tracking-wide',
                'btn-press',
                maisAberto || rotaNoMais
                  ? 'text-primary'
                  : 'text-zinc-500 dark:text-zinc-400',
              ].join(' ')}
            >
              <MoreHorizontal size={20} strokeWidth={1.75} />
              <span className="truncate">Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40 animate-fade-in backdrop-blur-[2px]"
            onClick={() => setMaisAberto(false)}
          />
          <div
            id="menu-mais-secoes"
            role="dialog"
            aria-modal="true"
            aria-label="Mais seções"
            className={[
              'absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto',
              'animate-sheet-in rounded-t-[22px] material-heavy',
              'border border-black/[0.06] shadow-elevated dark:border-white/[0.08] dark:shadow-elevated-dark',
              'pb-[env(safe-area-inset-bottom,0px)]',
            ].join(' ')}
          >
            <div className="px-4 pt-3">
              <div className="sheet-handle" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <div>
                <p className="text-[15px] font-semibold tracking-tight">
                  Mais seções
                </p>
                <p className="text-[11px] tracking-wide text-zinc-500 dark:text-zinc-400">
                  Tudo que não cabe na barra inferior
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMaisAberto(false)}
                className="btn-press grid h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
              {extras.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setMaisAberto(false)}
                    className={({ isActive }) =>
                      [
                        'btn-press flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center text-xs font-medium tracking-tight',
                        isActive
                          ? 'bg-primary/18 text-primary-800 dark:bg-primary/20 dark:text-primary-100'
                          : 'bg-black/[0.03] text-zinc-700 hover:bg-black/[0.05] dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.07]',
                      ].join(' ')
                    }
                  >
                    <Icon size={22} strokeWidth={1.75} />
                    <span className="leading-tight">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="border-t border-black/[0.06] px-3 py-3 dark:border-white/[0.08]">
              {user?.email && (
                <p className="mb-2 truncate px-1 text-[11px] tracking-wide text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setMaisAberto(false)
                  logout()
                }}
                className="btn-press flex w-full items-center justify-center gap-2 rounded-2xl bg-black/[0.03] px-3 py-3 text-sm font-medium text-zinc-600 hover:bg-black/[0.05] dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.07]"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
