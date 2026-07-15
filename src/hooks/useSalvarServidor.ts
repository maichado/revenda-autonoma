import { useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import { formatPbError } from '@/lib/pbApi'

const SUFIXO_SERVIDOR = ' Salvo no servidor.'

/** Executa uma mutação async do store e exibe toast de sucesso/erro. */
export function useSalvarServidor() {
  const toast = useToast()

  const salvar = useCallback(
    async (
      acao: () => Promise<void>,
      tituloSucesso: string,
      descricaoSucesso?: string,
    ): Promise<boolean> => {
      try {
        await acao()
        const desc = descricaoSucesso
          ? `${descricaoSucesso}${SUFIXO_SERVIDOR}`
          : 'Salvo no servidor.'
        toast.success(tituloSucesso, desc)
        return true
      } catch (err) {
        toast.error('Falha ao salvar no servidor', formatPbError(err))
        return false
      }
    },
    [toast],
  )

  return salvar
}
