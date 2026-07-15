import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { ServerStatusBanner } from './ServerStatusBanner'
import { MigrarLocalStorageBanner } from './MigrarLocalStorageBanner'
import { useStore } from '@/store/useStore'

// Layout global: sidebar (desktop), bottom nav (mobile), header e <Outlet/>.
export function Layout() {
  const colapsada = useStore((s) => s.sidebarColapsada)

  return (
    <div className="min-h-screen">
      <Sidebar />

      <div
        className={[
          'flex min-h-screen flex-col transition-[padding] duration-200',
          colapsada ? 'md:pl-16' : 'md:pl-[220px]',
        ].join(' ')}
      >
        <MigrarLocalStorageBanner />
        <ServerStatusBanner />
        <Header />

        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
