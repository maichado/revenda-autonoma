import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { LogIn, Mail, Lock, WifiOff } from 'lucide-react'
import { LogoMgRevenda } from '@/components/LogoMgRevenda'
import { Button } from '@/components/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ClientResponseError } from 'pocketbase'
import { checkPbHealth, PbCollectionMissingError } from '@/lib/pbApi'

function mensagemErroLogin(err: unknown): string {
  if (err instanceof PbCollectionMissingError) {
    return err.message
  }
  if (err instanceof ClientResponseError) {
    if (err.status === 400 || err.status === 401) {
      return 'E-mail ou senha incorretos. Verifique e tente novamente.'
    }
    if (err.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique se o PocketBase está rodando.'
    }
    return err.message || 'Erro ao entrar. Tente novamente.'
  }
  if (err instanceof TypeError) {
    return 'Servidor indisponível. Inicie o PocketBase (porta 8090) e tente novamente.'
  }
  return 'Erro inesperado. Tente novamente.'
}

export default function Login() {
  useTheme()
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [pbOnline, setPbOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let ativo = true
    async function verificar() {
      const ok = await checkPbHealth()
      if (ativo) setPbOnline(ok)
    }
    void verificar()
    const id = setInterval(() => void verificar(), 10_000)
    return () => {
      ativo = false
      clearInterval(id)
    }
  }, [])

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate(from, { replace: true })
    } catch (err) {
      setErro(mensagemErroLogin(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-light p-4 dark:bg-bg-dark">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="card w-full max-w-md p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoMgRevenda height={52} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">MG Revenda</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Gestão de compra e venda de veículos
            </p>
          </div>
        </div>

        {pbOnline === false && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
          >
            <WifiOff size={16} className="mt-0.5 shrink-0" />
            <span>
              <strong>PocketBase offline.</strong> Inicie o servidor antes de
              entrar:{' '}
              <code className="rounded bg-amber-500/10 px-1">
                .\scripts\start-pocketbase.ps1
              </code>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              E-mail
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="senha"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Senha
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="input pl-10"
              />
            </div>
          </div>

          {erro && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {erro}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            leftIcon={<LogIn size={18} />}
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Primeira vez? Rode{' '}
          <code className="rounded bg-zinc-500/10 px-1">
            .\scripts\setup-pocketbase.ps1
          </code>{' '}
          com o PocketBase ativo. Login:{' '}
          <code className="rounded bg-zinc-500/10 px-1">
            maicon@gmrevenda.local
          </code>
        </p>
      </div>
    </div>
  )
}
