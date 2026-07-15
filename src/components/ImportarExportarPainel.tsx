// Painel "Backup": exporta e importa o estado completo do app em JSON.
//
// Fluxo de IMPORTAÇÃO:
//   1) usuário escolhe um arquivo .json
//   2) validamos estrutura/versão
//   3) abrimos um Modal de CONFIRMAÇÃO mostrando o que será substituído
//   4) ao confirmar, aplicamos via `aplicarBackup`
//        - se a versão é a atual → atualiza o store em memória
//        - se é anterior         → reescreve o localStorage e recarrega
//                                  (a migração do store roda no rehydrate)
//
// Toda interação dá feedback via toast.

import { useRef, useState } from 'react'
import { Download, FileJson, Upload } from 'lucide-react'

import { Button } from './Button'
import { Modal } from './Modal'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { formatarMoeda } from '@/utils/formatadores'
import { formatPbError } from '@/lib/pbApi'
import {
  ErroBackupInvalido,
  aplicarBackup,
  exportarEstadoJSON,
  importarEstadoJSON,
  type ArquivoBackup,
} from '@/utils/backup'
import { STORE_VERSION } from '@/store/useStore'

export function ImportarExportarPainel() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()
  const { user } = useAuth()

  const [backupPendente, setBackupPendente] = useState<ArquivoBackup | null>(
    null,
  )
  const [carregando, setCarregando] = useState(false)

  // -------- Export ---------------------------------------------------------
  function handleExportar() {
    try {
      const nome = exportarEstadoJSON()
      toast.success('Backup exportado', `Arquivo gerado: ${nome}`)
    } catch {
      toast.error('Falha ao exportar', 'Tente novamente em instantes.')
    }
  }

  // -------- Import: passo 1 (escolher arquivo) -----------------------------
  function abrirSeletor() {
    inputRef.current?.click()
  }

  async function handleArquivoSelecionado(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const arquivo = e.target.files?.[0]
    // Reseta o input para permitir reabrir o mesmo arquivo depois.
    e.target.value = ''
    if (!arquivo) return

    setCarregando(true)
    try {
      const backup = await importarEstadoJSON(arquivo)
      setBackupPendente(backup)
    } catch (err) {
      const msg =
        err instanceof ErroBackupInvalido
          ? err.message
          : 'Não foi possível ler o arquivo.'
      toast.error('Backup inválido', msg)
    } finally {
      setCarregando(false)
    }
  }

  // -------- Import: passo 2 (confirmar e aplicar) --------------------------
  async function confirmarImportacao() {
    if (!backupPendente || carregando) return
    setCarregando(true)
    try {
      await aplicarBackup(backupPendente)
      const { estado } = backupPendente
      const fotosNoBackup = estado.veiculos.reduce(
        (n, v) => n + (v.fotos?.length ?? 0),
        0,
      )
      const avisoFotos =
        fotosNoBackup > 0
          ? ` Fotos (${fotosNoBackup}) não foram restauradas — limite de 2MB no servidor.`
          : ''
      toast.success(
        'Dados importados com sucesso',
        `${estado.veiculos.length} veículo(s), ${estado.compras.length} compra(s), ${estado.vendas.length} venda(s) e ${estado.despesas.length} despesa(s) salvos no PocketBase.${avisoFotos}`,
      )
      setBackupPendente(null)
    } catch (err) {
      console.error('[Backup] Falha ao aplicar importação:', err)
      const msg =
        err instanceof ErroBackupInvalido
          ? err.message
          : formatPbError(err)
      toast.error('Falha ao importar', msg)
    } finally {
      setCarregando(false)
    }
  }

  // -------- Render ---------------------------------------------------------
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Salve todo o estado do app (veículos, compras, vendas, despesas e
        configurações) em um único arquivo <code className="kbd">.json</code> e
        restaure quando precisar. Útil para backup, migração de dispositivo ou
        compartilhamento com seu sócio.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="primary"
          leftIcon={<Download size={16} />}
          onClick={handleExportar}
        >
          Exportar dados (JSON)
        </Button>

        <Button
          variant="secondary"
          leftIcon={<Upload size={16} />}
          onClick={abrirSeletor}
          disabled={carregando}
        >
          {carregando ? 'Lendo arquivo...' : 'Importar dados (JSON)'}
        </Button>

        {/* Input oculto: a UI real é o botão acima. */}
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleArquivoSelecionado}
          className="hidden"
          aria-hidden
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Versão do schema atual: <span className="tabular">v{STORE_VERSION}</span>
        . Importações de versões anteriores são aceitas e migradas
        automaticamente.
        {!user && (
          <>
            {' '}
            <span className="text-amber-600 dark:text-amber-400">
              Faça login para importar os dados no PocketBase.
            </span>
          </>
        )}
      </p>

      {/* Modal de confirmação da importação ---------------------------------- */}
      <Modal
        open={!!backupPendente}
        title="Substituir dados atuais?"
        description="A importação SUBSTITUI todo o estado do app pelos dados do arquivo."
        onClose={() => setBackupPendente(null)}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBackupPendente(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmarImportacao}
              disabled={carregando}
            >
              {carregando ? 'Importando...' : 'Substituir e importar'}
            </Button>
          </>
        }
      >
        {backupPendente && <ResumoBackup backup={backupPendente} />}
      </Modal>
    </div>
  )
}

// Resumo do conteúdo do arquivo no modal de confirmação.
function ResumoBackup({ backup }: { backup: ArquivoBackup }) {
  const { estado, schemaVersion, exportadoEm } = backup
  const versaoLabel =
    schemaVersion === STORE_VERSION
      ? `v${schemaVersion} (atual)`
      : `v${schemaVersion} → migração automática para v${STORE_VERSION}`

  let dataLegivel = exportadoEm
  try {
    dataLegivel = new Date(exportadoEm).toLocaleString('pt-BR')
  } catch {
    // mantém o ISO
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start gap-3 rounded-lg border border-border-light bg-zinc-50/50 p-3 dark:border-border-dark dark:bg-white/[0.02]">
        <FileJson size={18} className="mt-0.5 text-primary" />
        <div className="flex-1">
          <p className="font-medium">Arquivo de backup detectado</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Exportado em <span className="tabular">{dataLegivel}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Schema: <span className="tabular font-medium">{versaoLabel}</span>
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        <Linha label="Veículos" valor={estado.veiculos.length} />
        <Linha label="Compras" valor={estado.compras.length} />
        <Linha label="Vendas" valor={estado.vendas.length} />
        <Linha label="Despesas" valor={estado.despesas.length} />
        <Linha
          label="Revenda"
          valor={estado.configuracoes.nome_revenda}
          full
        />
        <Linha
          label="Meta mensal"
          valor={formatarMoeda(estado.configuracoes.meta_lucro_mensal)}
          full
        />
      </ul>

      <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:text-amber-300">
        Esta ação <strong>NÃO PODE SER DESFEITA</strong>. Recomendamos exportar
        um backup antes de continuar.
      </p>
    </div>
  )
}

function Linha({
  label,
  valor,
  full,
}: {
  label: string
  valor: string | number
  full?: boolean
}) {
  return (
    <li
      className={[
        'flex items-center justify-between gap-2 rounded-md border border-border-light px-3 py-2 dark:border-border-dark',
        full ? 'col-span-2' : '',
      ].join(' ')}
    >
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="tabular text-sm font-semibold">{valor}</span>
    </li>
  )
}
