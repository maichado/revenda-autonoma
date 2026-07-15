import { NavLink } from 'react-router-dom'
import { navItems } from './Sidebar'

// Bottom nav exibida apenas em telas < 768px (spec).
// Mantemos os 5 primeiros itens para caber bem em mobile.
export function BottomNav() {
  const items = navItems.slice(0, 5)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface-light/95 backdrop-blur border-border-light pb-[env(safe-area-inset-bottom,0px)] dark:bg-surface-dark/95 dark:border-border-dark md:hidden"
      aria-label="Navegação inferior"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium',
                  'btn-press',
                  isActive
                    ? 'text-primary'
                    : 'text-zinc-500 dark:text-zinc-400',
                ].join(' ')
              }
            >
              <Icon size={20} />
              <span className="truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
