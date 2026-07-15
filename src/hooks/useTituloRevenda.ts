import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'

/** Atualiza document.title conforme o nome em Configurações. */
export function useTituloRevenda() {
  const nome = useStore((s) => s.configuracoes.nome_revenda)

  useEffect(() => {
    const rotulo = (nome?.trim() || NOME_REVENDA_PADRAO).trim()
    document.title = `${rotulo} — Gestão`
  }, [nome])
}
