// Zona de Perigo: limpar todos os dados do app com DUPLA CONFIRMAÇÃO.
//
// Modal 1 → resumo do que será apagado e botões Cancelar / Continuar.
// Modal 2 → o usuário precisa digitar a palavra LIMPAR (case-insensitive)
//           para habilitar o botão "Confirmar exclusão".
//
// Após confirmar:
//   • chama useStore.limparTudo()  (zera dados; preserva configurações)
//   • o middleware persist sobrescreve o localStorage com o estado vazio
//   • NÃO repopulamos a seed: a seed só é usada quando a chave não existe.

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

import { Button } from './Button'
import { Modal } from './Modal'
import { useStore } from '@/store/useStore'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'

interface Props {
  /** Totais atuais para o usuário ver o que será apagado. */
  totais: {
    veiculos: number
    compras: number
    vendas: number
    despesas: number
  }
}

const PALAVRA_CHAVE = 'LIMPAR'

export function ZonaPerigo({ totais }: Props) {
  const limparTudo = useStore((s) => s.limparTudo)
  const salvarServidor = useSalvarServidor()

  // Estados: 'fechado' → 'aviso' → 'digitar' → executa
  const [etapa, setEtapa] = useState<'fechado' | 'aviso' | 'digitar'>(
    'fechado',
  )
  const [palavra, setPalavra] = useState('')

  // Reseta o campo sempre que o segundo modal fechar.
  useEffect(() => {
    if (etapa !== 'digitar') setPalavra('')
  }, [etapa])

  const palavraOk = palavra.trim().toUpperCase() === PALAVRA_CHAVE
  const totalRegistros =
    totais.veiculos + totais.compras + totais.vendas + totais.despesas
  const semDados = totalRegistros === 0

  async function executar() {
    const ok = await salvarServidor(
      () => limparTudo(),
      'Todos os dados foram apagados',
      'O app voltou a um estado vazio — comece quando quiser.',
    )
    if (ok) setEtapa('fechado')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Use esta ação para começar do zero — útil em testes ou ao repassar o
        app para outra revenda. Apaga <strong>todos</strong> os registros, mas
        mantém a identidade da sua revenda e as preferências de tema.
      </p>

      <Button
        variant="danger"
        leftIcon={<Trash2 size={16} />}
        onClick={() => setEtapa('aviso')}
        disabled={semDados}
        title={
          semDados
            ? 'Nada para apagar — o app já está vazio.'
            : 'Apagar todos os registros'
        }
      >
        {semDados ? 'Nenhum dado para apagar' : 'Limpar todos os dados'}
      </Button>

      {/* ------------------------------------------------------------------
          MODAL 1 — explicação + Cancelar / Continuar
      ------------------------------------------------------------------ */}
      <Modal
        open={etapa === 'aviso'}
        title="Tem certeza?"
        description="Esta ação é irreversível. Recomendamos exportar um backup antes."
        onClose={() => setEtapa('fechado')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEtapa('fechado')}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              leftIcon={<AlertTriangle size={16} />}
              onClick={() => setEtapa('digitar')}
            >
              Continuar
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p>Os seguintes registros serão apagados:</p>
          <ul className="grid grid-cols-2 gap-2">
            <ItemContagem rotulo="Veículos" valor={totais.veiculos} />
            <ItemContagem rotulo="Compras" valor={totais.compras} />
            <ItemContagem rotulo="Vendas" valor={totais.vendas} />
            <ItemContagem rotulo="Despesas" valor={totais.despesas} />
          </ul>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-700 dark:text-amber-300">
            Configurações da revenda (nome, sócios, meta) e preferências de
            tema serão preservadas. Apenas os dados acima serão removidos.
          </p>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------
          MODAL 2 — usuário digita "LIMPAR" para confirmar
      ------------------------------------------------------------------ */}
      <Modal
        open={etapa === 'digitar'}
        title="Confirmação final"
        description={`Digite a palavra "${PALAVRA_CHAVE}" para liberar o botão de exclusão.`}
        onClose={() => setEtapa('fechado')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEtapa('fechado')}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={!palavraOk} onClick={executar}>
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Palavra de confirmação
            </span>
            <input
              type="text"
              value={palavra}
              onChange={(e) => setPalavra(e.target.value)}
              placeholder={PALAVRA_CHAVE}
              className="input tabular tracking-widest"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && palavraOk) executar()
              }}
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Diferença entre maiúsculas e minúsculas é ignorada.
          </p>
        </div>
      </Modal>
    </div>
  )
}

function ItemContagem({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border-light px-3 py-2 dark:border-border-dark">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{rotulo}</span>
      <span className="tabular text-sm font-semibold">{valor}</span>
    </li>
  )
}
