import { useState } from 'react'

import { Database, Upload } from 'lucide-react'

import { Button } from '@/components/Button'

import { Modal } from '@/components/Modal'

import { useToast } from '@/hooks/useToast'

import { useStore } from '@/store/useStore'

import { fetchAllData, formatPbError, importarParaPb } from '@/lib/pbApi'

import { setPbSyncEnabled } from '@/store/pbSyncBridge'

import {

  lerLocalStorageAntigo,

  MIGRACAO_KEY,

  podeMigrarLocalStorage,

  temDadosMigracao,

} from '@/utils/migracaoLocal'



export function MigrarLocalStoragePainel() {

  const toast = useToast()

  const hydrateFromServer = useStore((s) => s.hydrateFromServer)

  const [modalAberto, setModalAberto] = useState(false)

  const [carregando, setCarregando] = useState(false)



  const estadoAntigo = lerLocalStorageAntigo()

  const podeMigrar =

    podeMigrarLocalStorage() &&

    estadoAntigo != null &&

    temDadosMigracao(estadoAntigo)



  if (!podeMigrar || !estadoAntigo) return null



  async function confirmarMigracao() {

    setCarregando(true)

    try {

      setPbSyncEnabled(true)

      await importarParaPb(estadoAntigo!)

      const dados = await fetchAllData()

      hydrateFromServer(dados)

      localStorage.setItem(MIGRACAO_KEY, '1')

      toast.success(

        'Migração concluída',

        `${dados.veiculos.length} veículo(s) agora estão no PocketBase. Salvo no servidor.`,

      )

      setModalAberto(false)

    } catch (err) {

      toast.error('Erro na migração', formatPbError(err))

    } finally {

      setCarregando(false)

    }

  }



  return (

    <>

      <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-5 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">

            <Database size={22} />

          </div>

          <div className="flex-1 space-y-3">

            <div>

              <p className="text-base font-semibold text-amber-900 dark:text-amber-100">

                Migrar dados do navegador para o PocketBase

              </p>

              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/90">

                Encontramos um backup local com{' '}

                <strong>{estadoAntigo.veiculos.length} veículos</strong>,{' '}

                {estadoAntigo.compras.length} compras,{' '}

                {estadoAntigo.vendas.length} vendas e{' '}

                {estadoAntigo.despesas.length} despesas. Esses dados{' '}

                <strong>não sobrevivem ao reload</strong> até serem enviados ao

                servidor.

              </p>

            </div>

            <Button

              variant="primary"

              size="sm"

              leftIcon={<Upload size={14} />}

              onClick={() => setModalAberto(true)}

            >

              Migrar para PocketBase agora

            </Button>

          </div>

        </div>

      </div>



      <Modal

        open={modalAberto}

        title="Migrar dados locais?"

        description="Os dados do localStorage serão copiados para o PocketBase."

        onClose={() => setModalAberto(false)}

        footer={

          <>

            <Button variant="ghost" onClick={() => setModalAberto(false)}>

              Cancelar

            </Button>

            <Button

              variant="primary"

              onClick={confirmarMigracao}

              disabled={carregando}

            >

              {carregando ? 'Migrando...' : 'Confirmar migração'}

            </Button>

          </>

        }

      >

        <p className="text-sm text-zinc-600 dark:text-zinc-300">

          Esta ação envia veículos, compras, vendas, despesas e configurações

          para o servidor. Dados já existentes no PocketBase serão substituídos.

          Após a migração, recarregue a página para confirmar que tudo aparece

          no admin ({' '}

          <a

            href="http://127.0.0.1:8090/_/"

            target="_blank"

            rel="noreferrer"

            className="underline"

          >

            http://127.0.0.1:8090/_/

          </a>

          ).

        </p>

      </Modal>

    </>

  )

}


