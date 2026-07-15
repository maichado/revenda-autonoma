import {



  createContext,



  useCallback,



  useContext,



  useEffect,



  useMemo,



  useState,



  type ReactNode,



} from 'react'



import type { AuthRecord } from 'pocketbase'



import { pb } from '@/lib/pocketbase'



import {



  checkPbHealth,



  fetchAllData,



  formatPbError,



  isCollectionMissingError,



  PbCollectionMissingError,



} from '@/lib/pbApi'



import { useStore } from '@/store/useStore'



import { useToast } from '@/hooks/useToast'
import { CONFIGURACOES_PADRAO } from '@/constants/configuracoesPadrao'



import {



  setPbOfflineCallback,



  setPbSyncEnabled,



} from '@/store/pbSyncBridge'







interface AuthContextValue {



  user: AuthRecord | null



  loading: boolean



  login: (email: string, password: string) => Promise<void>



  logout: () => void



}







const AuthContext = createContext<AuthContextValue | null>(null)














type CarregarDadosResult = 'ok' | 'offline' | 'missing_collections'







export function AuthProvider({ children }: { children: ReactNode }) {



  const [user, setUser] = useState<AuthRecord | null>(pb.authStore.record)



  const [loading, setLoading] = useState(true)



  const toast = useToast()







  const hydrateFromServer = useStore((s) => s.hydrateFromServer)



  const setServidorOnline = useStore((s) => s.setServidorOnline)



  const setColecoesFaltando = useStore((s) => s.setColecoesFaltando)

  const setSimulacoesColecaoOk = useStore((s) => s.setSimulacoesColecaoOk)

  const setDadosCarregados = useStore((s) => s.setDadosCarregados)







  const carregarDados = useCallback(async (): Promise<CarregarDadosResult> => {
    try {
      const online = await checkPbHealth()
      setServidorOnline(online)

      if (!online) {
        setColecoesFaltando(false)
        toast.error(
          'PocketBase offline',
          'Inicie o servidor e recarregue a página para carregar seus dados.',
        )
        hydrateFromServer({
          veiculos: [],
          compras: [],
          vendas: [],
          despesas: [],
          simulacoes: [],
          configuracoes: CONFIGURACOES_PADRAO,
        })
        return 'offline'
      }

      if (!pb.authStore.isValid) return 'ok'

      const dados = await fetchAllData()
      const { simulacoesColecaoOk, ...estado } = dados
      hydrateFromServer(estado)
      setSimulacoesColecaoOk(simulacoesColecaoOk)
      setColecoesFaltando(false)
      return 'ok'
    } catch (err) {
      console.error('[Auth] Falha ao carregar dados:', err)

      if (isCollectionMissingError(err)) {
        setColecoesFaltando(true)
        setSimulacoesColecaoOk(false)
        setServidorOnline(true)
        hydrateFromServer({
          veiculos: [],
          compras: [],
          vendas: [],
          despesas: [],
          simulacoes: [],
          configuracoes: CONFIGURACOES_PADRAO,
        })
        return 'missing_collections'
      }

      setColecoesFaltando(false)
      setServidorOnline(false)
      toast.error('Falha ao carregar dados', formatPbError(err))
      hydrateFromServer({
        veiculos: [],
        compras: [],
        vendas: [],
        despesas: [],
        simulacoes: [],
        configuracoes: CONFIGURACOES_PADRAO,
      })
      return 'offline'
    } finally {
      setDadosCarregados(true)
    }
  }, [
    hydrateFromServer,
    setColecoesFaltando,
    setDadosCarregados,
    setServidorOnline,
    setSimulacoesColecaoOk,
    toast,
  ])







  useEffect(() => {
    setPbOfflineCallback(() => setServidorOnline(false))
    return () => setPbOfflineCallback(null)
  }, [setServidorOnline])

  useEffect(() => {
    let ativo = true

    async function aplicarAuth(token: string, record: typeof pb.authStore.record) {
      setUser(record)

      if (token && record) {
        setPbSyncEnabled(true)
        await carregarDados()
      } else {
        setPbSyncEnabled(false)
        setColecoesFaltando(false)
        setDadosCarregados(false)
      }

      if (ativo) setLoading(false)
    }

    // fireImmediately=true — sem isso a tela fica em "Carregando..." para sempre
    const unsub = pb.authStore.onChange((token, record) => {
      void aplicarAuth(token, record)
    }, true)

    const fallback = window.setTimeout(() => {
      if (ativo) setLoading(false)
    }, 10_000)

    return () => {
      ativo = false
      window.clearTimeout(fallback)
      unsub()
    }
  }, [carregarDados, setColecoesFaltando, setDadosCarregados])







  const login = useCallback(



    async (email: string, password: string) => {



      await pb.collection('users').authWithPassword(email.trim(), password)



      setPbSyncEnabled(true)



      const result = await carregarDados()



      if (result === 'missing_collections') {



        pb.authStore.clear()



        setPbSyncEnabled(false)



        setUser(null)



        throw new PbCollectionMissingError()



      }



    },



    [carregarDados],



  )







  const logout = useCallback(() => {



    pb.authStore.clear()



    setPbSyncEnabled(false)



    setColecoesFaltando(false)



    setUser(null)



    setDadosCarregados(false)



    useStore.getState().limparDadosNegocio()



  }, [setColecoesFaltando, setDadosCarregados])







  const value = useMemo(



    () => ({ user, loading, login, logout }),



    [user, loading, login, logout],



  )







  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>



}







export function useAuth(): AuthContextValue {



  const ctx = useContext(AuthContext)



  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')



  return ctx



}




