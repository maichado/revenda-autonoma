import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { AssinaturaAutor } from './AssinaturaAutor'
import { ServerStatusBanner } from './ServerStatusBanner'
import { MigrarLocalStorageBanner } from './MigrarLocalStorageBanner'
import { useStore } from '@/store/useStore'

// Layout global: sidebar (desktop), bottom nav (mobile), header e <Outlet/>.
export function Layout() {
  const colapsada = useStore((s) => s.sidebarColapsada)

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Sidebar />

      <div
        className={[
          'flex min-h-screen flex-col transition-[padding] duration-300 ease-out',
          colapsada ? 'md:pl-16' : 'md:pl-[232px]',
        ].join(' ')}
      >
        <MigrarLocalStorageBanner />
        <ServerStatusBanner />
        <Header />

        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-6 md:pb-8 md:pt-7">
          <Outlet />
        </main>

        <footer className="px-4 pb-24 text-center md:hidden">
          <AssinaturaAutor />
        </footer>
      </div>

      <BottomNav />
    </div>
  )
}
