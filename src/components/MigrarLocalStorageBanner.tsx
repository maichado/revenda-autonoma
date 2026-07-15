import { Link } from 'react-router-dom'

import { AlertTriangle, Database } from 'lucide-react'

import {

  lerLocalStorageAntigo,

  podeMigrarLocalStorage,

  temDadosMigracao,

} from '@/utils/migracaoLocal'



/** Banner global quando há dados legados no localStorage ainda não migrados. */

export function MigrarLocalStorageBanner() {

  if (!podeMigrarLocalStorage()) return null



  const estado = lerLocalStorageAntigo()

  if (!estado || !temDadosMigracao(estado)) return null



  return (

    <div

      role="alert"

      className={[

        'flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 text-sm',

        'border-b border-amber-500/40 bg-amber-500/15 text-amber-900',

        'dark:text-amber-100',

      ].join(' ')}

    >

      <AlertTriangle size={16} className="shrink-0" />

      <Database size={16} className="shrink-0 opacity-70" />

      <span>

        <strong>Dados antigos no navegador</strong> ({estado.veiculos.length}{' '}

        veículos) ainda não foram enviados ao PocketBase.{' '}

        <Link to="/configuracoes" className="font-medium underline">

          Migrar em Configurações

        </Link>

      </span>

    </div>

  )

}


