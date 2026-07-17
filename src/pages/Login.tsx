import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { LogIn, Mail, Lock, WifiOff, UserPlus, User } from 'lucide-react'
import { LogoRevenda } from '@/components/LogoRevenda'
import { AssinaturaAutor } from '@/components/AssinaturaAutor'
import { Button } from '@/components/Button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ClientResponseError } from 'pocketbase'
import { checkPbHealth, PbCollectionMissingError } from '@/lib/pbApi'

type ModoAuth = 'entrar' | 'cadastro'

function mensagemErroAuth(err: unknown, cadastro: boolean): string {
  if (err instanceof PbCollectionMissingError) {
    return err.message
  }
  if (err instanceof ClientResponseError) {
    if (err.status === 400) {
      const emailErr = err.data?.email
      if (emailErr?.code === 'validation_not_unique') {
        return 'Este e-mail já está cadastrado. Use Entrar ou outro e-mail.'
      }
      if (cadastro) {
        return err.message || 'Não foi possível criar a conta. Verifique os dados.'
      }
      return 'E-mail ou senha incorretos. Verifique e tente novamente.'
    }
    if (err.status === 401) {
      return 'E-mail ou senha incorretos. Verifique e tente novamente.'
    }
    if (err.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique se o PocketBase está rodando.'
    }
    return err.message || (cadastro ? 'Erro ao criar conta.' : 'Erro ao entrar.')
  }
  if (err instanceof Error) {
    return err.message
  }
  if (err instanceof TypeError) {
    return 'Servidor indisponível. Inicie o PocketBase (porta 8090) e tente novamente.'
  }
  return 'Erro inesperado. Tente novamente.'
}

export default function Login() {
  useTheme()
  const { login, register, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/'

  const [modo, setModo] = useState<ModoAuth>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
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

  const cadastro = modo === 'cadastro'
  const senhasConferem = !cadastro || senha === confirmarSenha
  const senhaValida = senha.length >= 6
  const nomeValido = !cadastro || nome.trim().length >= 2
  const formValido =
    email.trim().length > 0 &&
    senhaValida &&
    senhasConferem &&
    nomeValido

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (cadastro && !senhasConferem) {
      setErro('As senhas não coincidem.')
      return
    }
    if (!senhaValida) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    try {
      if (cadastro) {
        await register(nome, email, senha)
      } else {
        await login(email, senha)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setErro(mensagemErroAuth(err, cadastro))
    } finally {
      setCarregando(false)
    }
  }

  function alternarModo(novo: ModoAuth) {
    setModo(novo)
    setErro('')
    setConfirmarSenha('')
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-bg-light p-4 dark:bg-bg-dark">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="card w-full max-w-md p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <LogoRevenda height={64} />
          </div>

          <div
            className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border-light bg-zinc-100/80 p-1 dark:border-border-dark dark:bg-white/[0.04]"
            role="tablist"
            aria-label="Entrar ou criar conta"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!cadastro}
              className={[
                'btn-press rounded-md px-3 py-2 text-sm font-medium transition-colors',
                !cadastro
                  ? 'bg-surface-light text-zinc-900 shadow-sm dark:bg-surface-dark dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
              ].join(' ')}
              onClick={() => alternarModo('entrar')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cadastro}
              className={[
                'btn-press rounded-md px-3 py-2 text-sm font-medium transition-colors',
                cadastro
                  ? 'bg-surface-light text-zinc-900 shadow-sm dark:bg-surface-dark dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
              ].join(' ')}
              onClick={() => alternarModo('cadastro')}
            >
              Criar conta
            </button>
          </div>

          {pbOnline === false && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
            >
              <WifiOff size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>PocketBase offline.</strong> Inicie o servidor antes de
                continuar:{' '}
                <code className="rounded bg-amber-500/10 px-1">
                  .\scripts\start-pocketbase.ps1
                </code>
              </span>
            </div>
          )}

          {cadastro && (
            <p className="mb-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Nova conta = revenda zerada, só seus dados. Não compartilha o
              estoque dos logins da equipe.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {cadastro && (
              <div>
                <label
                  htmlFor="nome"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Seu nome
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    id="nome"
                    type="text"
                    autoComplete="name"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Cristiano"
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                {cadastro ? 'E-mail' : 'Usuário ou e-mail'}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  id="email"
                  type={cadastro ? 'email' : 'text'}
                  autoComplete={cadastro ? 'email' : 'username'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    cadastro ? 'seu@email.com' : 'adminmaicon'
                  }
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
                  autoComplete={cadastro ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
              {cadastro && (
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Mínimo de 6 caracteres.
                </span>
              )}
            </div>

            {cadastro && (
              <div>
                <label
                  htmlFor="confirmarSenha"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Confirmar senha
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    id="confirmarSenha"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10"
                    aria-invalid={!senhasConferem && confirmarSenha.length > 0}
                  />
                </div>
              </div>
            )}

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
              leftIcon={cadastro ? <UserPlus size={18} /> : <LogIn size={18} />}
              disabled={carregando || !formValido}
            >
              {carregando
                ? cadastro
                  ? 'Criando conta...'
                  : 'Entrando...'
                : cadastro
                  ? 'Criar conta'
                  : 'Entrar'}
            </Button>
          </form>

          {!cadastro && (
            <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Equipe interna? Use seu login existente. Quem é cliente novo deve
              ir em <strong>Criar conta</strong>.
            </p>
          )}
        </div>
      </div>

      <footer className="py-4 text-center">
        <AssinaturaAutor />
      </footer>
    </div>
  )
}
