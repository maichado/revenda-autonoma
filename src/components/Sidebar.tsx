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
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
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
  const rotulo = nomeRevenda?.trim() || NOME_REVENDA_PADRAO

  return (
    <aside
      className={[
        'hidden md:flex fixed inset-y-0 left-0 z-40 flex-col',
        'border-r bg-surface-light border-border-light',
        'dark:bg-surface-dark dark:border-border-dark',
        'transition-[width] duration-200 ease-out',
        colapsada ? 'w-16' : 'w-[220px]',
      ].join(' ')}
      aria-label="Navegação principal"
    >
      {/* Logo / topo */}
      <div
        className={[
          'flex w-full flex-col items-center justify-center gap-1 border-b border-border-light px-3 py-4 dark:border-border-dark',
          colapsada ? '' : 'text-center',
        ].join(' ')}
      >
        <LogoRevenda
          height={colapsada ? 29 : 38}
          nomeRevenda={rotulo}
        />
        {!colapsada && (
          <p className="line-clamp-2 text-xs font-semibold leading-tight tracking-tight text-zinc-700 dark:text-zinc-200">
            {rotulo}
          </p>
        )}
      </div>

      {/* Links */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'btn-press group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                    'transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary dark:text-primary-200'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]',
                  ].join(' ')
                }
                title={colapsada ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!colapsada && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé: usuário + logout + colapso */}
      <div className="space-y-1 border-t border-border-light p-2 dark:border-border-dark">
        {!colapsada && user && (
          <p className="truncate px-3 py-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        )}
        <button
          onClick={logout}
          aria-label="Sair"
          className={[
            'btn-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
            'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]',
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
            'btn-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
            'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]',
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
