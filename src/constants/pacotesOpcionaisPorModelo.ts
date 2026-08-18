import { ACESSORIOS_VEICULO_PADRAO } from '@/constants/acessoriosVeiculo'

function normalizar(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pacote base comum a quase todos os carros de revenda. */
const PACOTE_ESSENCIAL = [
  'Ar-condicionado',
  'Direção hidráulica / elétrica',
  'Vidros elétricos',
  'Trava elétrica',
  'Airbag',
  'Freios ABS',
  'Alarme',
  'Som / multimídia',
  'IPVA pago',
  'Licenciamento em dia',
  'Revisões em dia',
] as const

const PACOTE_COMPLETO = [
  ...PACOTE_ESSENCIAL,
  'Bluetooth / USB',
  'Câmera de ré',
  'Sensor de estacionamento',
  'Rodas de liga leve',
  'Faróis de neblina',
  'Retrovisores elétricos',
  'Computador de bordo',
  'Manual e chave reserva',
] as const

const PACOTE_PREMIUM = [
  ...PACOTE_COMPLETO,
  'Bancos de couro',
  'Teto solar',
  'Piloto automático',
  'Kit multimídia / Android Auto / CarPlay',
] as const

/**
 * Palavras-chave no nome do modelo/marca → pacote sugerido.
 * Ordem importa: a primeira combinação que casar vence.
 */
const REGRAS: { palavras: string[]; pacote: readonly string[]; rotulo: string }[] =
  [
    {
      palavras: ['golf', 'jetta', 'passat', 'tiguan', 'virtus highline'],
      pacote: PACOTE_PREMIUM,
      rotulo: 'linha VW intermediária/premium',
    },
    {
      palavras: ['corolla', 'civic', 'cruze', 'focus', 'fluence', 'sentra'],
      pacote: PACOTE_PREMIUM,
      rotulo: 'sedã médio',
    },
    {
      palavras: ['hr-v', 'hrv', 'tracker', 'creta', 'kicks', 'renegade', 'compass', 't-cross', 'tcross', 'nivus'],
      pacote: PACOTE_PREMIUM,
      rotulo: 'SUV/crossover',
    },
    {
      palavras: ['onix', 'hb20', 'argo', 'polo', 'virtus', 'city', 'yaris'],
      pacote: PACOTE_COMPLETO,
      rotulo: 'hatch/sedã compacto',
    },
    {
      palavras: ['gol', 'uno', 'palio', 'celta', 'ka', 'fox', 'sandero', 'logan', 'prisma', 'classic'],
      pacote: PACOTE_ESSENCIAL,
      rotulo: 'entrada / popular',
    },
    {
      palavras: ['saveiro', 'strada', 'montana', 'oroch', 'hilux', 's10', 'ranger'],
      pacote: PACOTE_COMPLETO,
      rotulo: 'utilitário / picape',
    },
  ]

export interface SugestaoOpcionaisModelo {
  /** Itens sugeridos (nunca pré-selecionados). */
  itens: string[]
  /** Descrição curta do pacote encontrado. */
  rotulo: string
  /** Trecho que casou na busca. */
  consulta: string
}

/**
 * Busca sugestões de opcionais pelo texto de marca + modelo.
 * Não marca nada — só devolve a lista para o usuário escolher.
 */
export function sugerirOpcionaisPorModelo(
  marca: string,
  modelo: string,
  consultaExtra = '',
): SugestaoOpcionaisModelo | null {
  const consulta = [marca, modelo, consultaExtra].filter(Boolean).join(' ')
  const n = normalizar(consulta)
  if (n.length < 2) return null

  for (const regra of REGRAS) {
    if (regra.palavras.some((p) => n.includes(normalizar(p)))) {
      const unicos = Array.from(new Set(regra.pacote.map(String)))
      return { itens: unicos, rotulo: regra.rotulo, consulta }
    }
  }

  // Fallback genérico: lista padrão completa (ainda sem selecionar).
  return {
    itens: [...ACESSORIOS_VEICULO_PADRAO],
    rotulo: 'pacote geral',
    consulta,
  }
}
