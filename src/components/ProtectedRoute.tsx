import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/Button'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const dadosCarregados = useStore((s) => s.dadosCarregados)
  const servidorOnline = useStore((s) => s.servidorOnline)
  const location = useLocation()
  const [aguardandoDemais, setAguardandoDemais] = useState(false)

  useEffect(() => {
    if (loading || dadosCarregados || !user) {
      setAguardandoDemais(false)
      return
    }
    const t = window.setTimeout(() => setAguardandoDemais(true), 12_000)
    return () => window.clearTimeout(t)
  }, [loading, dadosCarregados, user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Carregando...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!dadosCarregados) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light px-4 dark:bg-bg-dark">
        <div className="flex max-w-md flex-col items-center gap-4 text-center text-sm text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Sincronizando dados...</p>
          {aguardandoDemais && (
            <div className="card space-y-3 p-4 text-left text-sm">
              <p className="text-zinc-600 dark:text-zinc-300">
                {servidorOnline
                  ? 'A sincronização está demorando. O PocketBase pode estar iniciando ou o schema precisa de atualização.'
                  : 'O PocketBase não está respondendo em http://127.0.0.1:8090'}
              </p>
              <ul className="list-inside list-disc text-xs text-zinc-500">
                <li>Rode <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">Iniciar-RVD-Autonoma.bat</code></li>
                <li>Ou: <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">.\scripts\start-pocketbase.ps1</code></li>
              </ul>
              <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <Outlet />
}
