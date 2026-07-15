import { useEffect } from 'react'

import { AlertTriangle, Database, WifiOff } from 'lucide-react'

import { useStore } from '@/store/useStore'

import { checkPbHealth } from '@/lib/pbApi'



const INTERVALO_MS = 15_000



export function ServerStatusBanner() {

  const servidorOnline = useStore((s) => s.servidorOnline)

  const colecoesFaltando = useStore((s) => s.colecoesFaltando)

  const setServidorOnline = useStore((s) => s.setServidorOnline)



  useEffect(() => {

    let ativo = true



    async function verificar() {

      const ok = await checkPbHealth()

      if (ativo) setServidorOnline(ok)

    }



    void verificar()

    const id = setInterval(() => void verificar(), INTERVALO_MS)

    return () => {

      ativo = false

      clearInterval(id)

    }

  }, [setServidorOnline])



  if (colecoesFaltando) {

    return (

      <div

        role="alert"

        className={[

          'flex items-center justify-center gap-2 px-4 py-2 text-sm',

          'border-b border-red-500/30 bg-red-500/10 text-red-800',

          'dark:text-red-200',

        ].join(' ')}

      >

        <Database size={16} className="shrink-0" />

        <span>

          <strong>Collections não importadas.</strong> Rode{' '}

          <code className="rounded bg-red-500/10 px-1">

            .\scripts\setup-pocketbase.ps1

          </code>{' '}

          ou importe{' '}

          <code className="rounded bg-red-500/10 px-1">

            pocketbase/pb_schema.json

          </code>{' '}

          em Settings → Import collections no painel admin (

          <a

            href="http://127.0.0.1:8090/_/"

            target="_blank"

            rel="noreferrer"

            className="underline"

          >

            http://127.0.0.1:8090/_/

          </a>

          ).

        </span>

      </div>

    )

  }



  if (servidorOnline) return null



  return (

    <div

      role="status"

      className={[

        'flex items-center justify-center gap-2 px-4 py-2 text-sm',

        'border-b border-amber-500/30 bg-amber-500/10 text-amber-800',

        'dark:text-amber-200',

      ].join(' ')}

    >

      <WifiOff size={16} className="shrink-0" />

      <span>

        <strong>Servidor desconectado.</strong> Não é possível salvar nem
        carregar dados até o PocketBase voltar (
        <code className="rounded bg-amber-500/10 px-1">.\scripts\start-pocketbase.ps1</code>
        ).

      </span>

      <AlertTriangle size={14} className="hidden sm:block opacity-60" />

    </div>

  )

}


