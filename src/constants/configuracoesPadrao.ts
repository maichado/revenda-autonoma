import { SOCIOS_PADRAO } from '@/utils/socios'
import { NOME_REVENDA_PADRAO } from '@/constants/marca'
import type { Configuracoes } from '@/types'

export const CONFIGURACOES_PADRAO: Configuracoes = {
  nome_revenda: NOME_REVENDA_PADRAO,
  logo_revenda: '',
  socios: [...SOCIOS_PADRAO],
  meta_lucro_mensal: 20000,
  capital_inicial_pessoal: 38000,
}
