import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Calculator,
  Car,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Landmark,
  LogOut,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { LogoRevenda } from '@/components/LogoRevenda'
import { AssinaturaAutor } from '@/components/AssinaturaAutor'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/store/useStore'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/veiculos', label: 'Veículos', icon: Car },
  { to: '/compras', label: 'Compras', icon: ShoppingBag },
  { to: '/vendas', label: 'Vendas', icon: Tags },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
  { to: '/consulta-fipe', label: 'Consulta FIPE', icon: Search },
  { to: '/banco-pessoal', label: 'Banco Pessoal', icon: Landmark },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const colapsada = useStore((s) => s.sidebarColapsada)
  const setColapsada = useStore((s) => s.setSidebarColapsada)
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)
  const { logout, user } = useAuth()

  return (
    <aside
      className={[
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col',
        'material-heavy border-r border-black/[0.06] dark:border-white/[0.08]',
        'transition-[width] duration-300 ease-out',
        colapsada ? 'w-16' : 'w-[232px]',
      ].join(' ')}
      aria-label="Navegação principal"
    >
      <div className="flex w-full items-center justify-center px-3 py-5">
        <LogoRevenda
          height={colapsada ? 32 : 44}
          nomeRevenda={nomeRevenda}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'btn-press group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium tracking-tight',
                    isActive
                      ? 'bg-primary/18 text-primary-800 shadow-sm dark:bg-primary/20 dark:text-primary-100'
                      : 'text-zinc-600 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.06]',
                  ].join(' ')
                }
                title={colapsada ? label : undefined}
              >
                <Icon size={18} className="shrink-0 opacity-90" strokeWidth={1.75} />
                {!colapsada && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-black/[0.06] p-2 dark:border-white/[0.08]">
        {!colapsada && (
          <div className="px-3 pb-1 text-center">
            <AssinaturaAutor />
          </div>
        )}
        {!colapsada && user && (
          <p className="truncate px-3 py-1 text-[10px] tracking-wide text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        )}
        <button
          onClick={logout}
          aria-label="Sair"
          className={[
            'btn-press flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
            'text-zinc-500 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.06]',
            colapsada ? 'justify-center' : '',
          ].join(' ')}
          title="Sair"
        >
          <LogOut size={16} className="shrink-0" />
          {!colapsada && <span>Sair</span>}
        </button>
        <button
          onClick={() => setColapsada(!colapsada)}
          aria-label={colapsada ? 'Expandir menu' : 'Colapsar menu'}
          className={[
            'btn-press flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
            'text-zinc-500 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.06]',
            colapsada ? 'justify-center' : 'justify-between',
          ].join(' ')}
        >
          {colapsada ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <span>Colapsar</span>
              <ChevronLeft size={16} />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
