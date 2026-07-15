import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, Car, Fuel, Loader2, Search, Tag } from 'lucide-react'
import {
  buscarValorPorCodigos,
  listarAnos,
  listarMarcas,
  listarModelos,
  type FipeItem,
  type FipeResultado,
} from '@/lib/fipe'
import { Combobox } from '@/components/Combobox'
import { formatarMoeda } from '@/utils/formatadores'

export default function ConsultaFipe() {
  const [marcas, setMarcas] = useState<FipeItem[]>([])
  const [modelos, setModelos] = useState<FipeItem[]>([])
  const [anos, setAnos] = useState<FipeItem[]>([])

  const [codMarca, setCodMarca] = useState('')
  const [codModelo, setCodModelo] = useState('')
  const [codAno, setCodAno] = useState('')

  const [loadingMarcas, setLoadingMarcas] = useState(false)
  const [loadingModelos, setLoadingModelos] = useState(false)
  const [loadingAnos, setLoadingAnos] = useState(false)
  const [loadingValor, setLoadingValor] = useState(false)

  const [resultado, setResultado] = useState<FipeResultado | null>(null)
  const [erro, setErro] = useState('')

  // Carrega as marcas uma única vez.
  useEffect(() => {
    let ativo = true
    setLoadingMarcas(true)
    setErro('')
    listarMarcas()
      .then((m) => {
        if (ativo) setMarcas(m)
      })
      .catch((e: Error) => {
        if (ativo) setErro(e.message)
      })
      .finally(() => {
        if (ativo) setLoadingMarcas(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  function reset(nivel: 'marca' | 'modelo' | 'ano') {
    setResultado(null)
    setErro('')
    if (nivel === 'marca') {
      setCodModelo('')
      setCodAno('')
      setModelos([])
      setAnos([])
    } else if (nivel === 'modelo') {
      setCodAno('')
      setAnos([])
    }
  }

  async function handleMarca(cod: string) {
    setCodMarca(cod)
    reset('marca')
    if (!cod) return
    setLoadingModelos(true)
    try {
      setModelos(await listarModelos(cod))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoadingModelos(false)
    }
  }

  async function handleModelo(cod: string) {
    setCodModelo(cod)
    reset('modelo')
    if (!cod) return
    setLoadingAnos(true)
    try {
      setAnos(await listarAnos(codMarca, cod))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoadingAnos(false)
    }
  }

  async function handleAno(cod: string) {
    setCodAno(cod)
    setResultado(null)
    setErro('')
    if (!cod) return
    setLoadingValor(true)
    try {
      setResultado(await buscarValorPorCodigos(codMarca, codModelo, cod))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setLoadingValor(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consulta FIPE</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Escolha marca, modelo e ano. O valor de mercado vem da Tabela FIPE
            oficial.
          </p>
        </div>
      </div>

      {/* Formulário de seleção */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Marca" icon={<Car size={14} />} loading={loadingMarcas}>
            <Combobox
              items={marcas}
              value={codMarca}
              onSelect={(cod) => void handleMarca(cod)}
              loading={loadingMarcas}
              placeholder="Buscar marca..."
              emptyText="Marcas indisponíveis"
            />
          </Campo>

          <Campo label="Modelo" icon={<Tag size={14} />} loading={loadingModelos}>
            <Combobox
              items={modelos}
              value={codModelo}
              onSelect={(cod) => void handleModelo(cod)}
              loading={loadingModelos}
              disabled={!codMarca}
              placeholder={codMarca ? 'Buscar modelo...' : 'Escolha a marca'}
              emptyText="Escolha a marca primeiro"
            />
          </Campo>

          <Campo label="Ano" icon={<Calendar size={14} />} loading={loadingAnos}>
            <Combobox
              items={anos}
              value={codAno}
              onSelect={(cod) => void handleAno(cod)}
              loading={loadingAnos}
              disabled={!codModelo}
              placeholder={codModelo ? 'Buscar ano...' : 'Escolha o modelo'}
              emptyText="Escolha o modelo primeiro"
            />
          </Campo>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Resultado */}
      {loadingValor && (
        <div className="card flex items-center gap-3 p-6 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          Consultando valor na tabela FIPE...
        </div>
      )}

      {!loadingValor && resultado && (
        <div className="card overflow-hidden">
          <div className="bg-primary/10 px-5 py-6 sm:px-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
              Valor FIPE
            </p>
            <p className="tabular mt-1 text-3xl font-bold text-primary sm:text-4xl">
              {formatarMoeda(resultado.valor)}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {resultado.marca} {resultado.modelo}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-border-light dark:bg-border-dark sm:grid-cols-4">
            <Detalhe rotulo="Ano" valor={String(resultado.ano)} icon={<Calendar size={14} />} />
            <Detalhe
              rotulo="Combustível"
              valor={resultado.combustivel || '—'}
              icon={<Fuel size={14} />}
            />
            <Detalhe
              rotulo="Código FIPE"
              valor={resultado.codigoFipe || '—'}
              icon={<Tag size={14} />}
            />
            <Detalhe
              rotulo="Referência"
              valor={resultado.mesReferencia || '—'}
              icon={<Search size={14} />}
            />
          </dl>
        </div>
      )}

      {!loadingValor && !resultado && !erro && (
        <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center text-zinc-500 dark:text-zinc-400">
          <Search size={28} className="opacity-60" />
          <p className="text-sm">
            Selecione marca, modelo e ano para ver o valor FIPE.
          </p>
        </div>
      )}
    </div>
  )
}

function Campo({
  label,
  icon,
  loading,
  children,
}: {
  label: string
  icon: React.ReactNode
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {icon}
        {label}
        {loading && <Loader2 size={12} className="animate-spin" />}
      </span>
      {children}
    </label>
  )
}

function Detalhe({
  rotulo,
  valor,
  icon,
}: {
  rotulo: string
  valor: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-surface-light px-4 py-3 dark:bg-surface-dark">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {icon}
        {rotulo}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold" title={valor}>
        {valor}
      </p>
    </div>
  )
}
