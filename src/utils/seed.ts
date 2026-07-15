// Dados mockados realistas — carregados apenas no PRIMEIRO acesso,
// quando o localStorage ainda está vazio. Servem para o usuário ver
// o Dashboard preenchido logo de cara.

import { format, subDays, subMonths } from 'date-fns'
import { CONFIGURACOES_PADRAO } from '@/constants/configuracoesPadrao'
import type { Compra, Configuracoes, Despesa, Veiculo, Venda } from '@/types'

const hoje = new Date()
const iso = (d: Date) => format(d, 'yyyy-MM-dd')

// IDs estáveis (não usamos Math.random na seed pra ficar previsível).
const ID = {
  v1: 'veic-001',
  v2: 'veic-002',
  v3: 'veic-003',
  v4: 'veic-004',
  v5: 'veic-005',
  c1: 'comp-001',
  c2: 'comp-002',
  c3: 'comp-003',
  c4: 'comp-004',
  c5: 'comp-005',
  vd1: 'vend-001',
  vd2: 'vend-002',
  vd3: 'vend-003',
  d1: 'desp-001',
  d2: 'desp-002',
  d3: 'desp-003',
  d4: 'desp-004',
  d5: 'desp-005',
  d6: 'desp-006',
}

export const veiculosSeed: Veiculo[] = [
  {
    id: ID.v1,
    placa: 'GMR-1A23',
    marca: 'Volkswagen',
    modelo: 'Polo Highline',
    ano: 2021,
    cor: 'Prata',
    quilometragem: 38500,
    data_compra: iso(subDays(hoje, 45)),
    valor_compra: 68000,
    valor_fipe: 75000,
    valor_venda_pretendido: 79900,
    status: 'disponível',
    tipo_propriedade: 'solo',
    observacoes: 'Único dono, revisões em dia.',
    fotos: [],
    despesas_vinculadas: [ID.d1],
  },
  {
    id: ID.v2,
    placa: 'GMR-2B34',
    marca: 'Hyundai',
    modelo: 'HB20 Comfort Plus',
    ano: 2020,
    cor: 'Branco',
    quilometragem: 52100,
    data_compra: iso(subDays(hoje, 30)),
    valor_compra: 52000,
    valor_fipe: 58000,
    valor_venda_pretendido: 61500,
    status: 'reservado',
    tipo_propriedade: 'solo',
    observacoes: 'Reservado por João S. — sinal pago.',
    fotos: [],
    despesas_vinculadas: [ID.d2],
  },
  {
    id: ID.v3,
    placa: 'GMR-3C45',
    marca: 'Chevrolet',
    modelo: 'Onix LT',
    ano: 2019,
    cor: 'Preto',
    quilometragem: 67400,
    data_compra: iso(subDays(hoje, 90)),
    valor_compra: 44000,
    valor_fipe: 49500,
    valor_venda_pretendido: 52900,
    status: 'vendido',
    tipo_propriedade: 'solo',
    observacoes: 'Vendido recentemente — pagamento via Pix.',
    fotos: [],
    despesas_vinculadas: [ID.d3],
  },
  {
    id: ID.v4,
    placa: 'GMR-4D56',
    marca: 'Fiat',
    modelo: 'Argo Drive 1.3',
    ano: 2022,
    cor: 'Vermelho',
    quilometragem: 21000,
    data_compra: iso(subDays(hoje, 70)),
    valor_compra: 58000,
    valor_fipe: 63000,
    valor_venda_pretendido: 66900,
    status: 'vendido',
    tipo_propriedade: 'meia',
    socio_parceiro: 'Sócio',
    observacoes: 'Vendido este mês — cliente recorrente. Carro a meia.',
    fotos: [],
    despesas_vinculadas: [ID.d4],
  },
  {
    id: ID.v5,
    placa: 'GMR-5E67',
    marca: 'Toyota',
    modelo: 'Yaris XL Plus',
    ano: 2021,
    cor: 'Cinza',
    quilometragem: 41200,
    data_compra: iso(subMonths(hoje, 3)),
    valor_compra: 72000,
    valor_fipe: 78500,
    valor_venda_pretendido: 82900,
    status: 'vendido',
    tipo_propriedade: 'solo',
    observacoes: 'Vendido no mês anterior.',
    fotos: [],
    despesas_vinculadas: [ID.d5],
  },
]

export const comprasSeed: Compra[] = [
  {
    id: ID.c1,
    data: iso(subDays(hoje, 45)),
    veiculo_id: ID.v1,
    valor_pago: 68000,
    forma_pagamento: 'transferência',
    vendedor_nome: 'Carlos Pereira',
    vendedor_contato: '(11) 9 9999-1111',
    origem: 'Indicação',
    observacoes: '',
  },
  {
    id: ID.c2,
    data: iso(subDays(hoje, 30)),
    veiculo_id: ID.v2,
    valor_pago: 52000,
    forma_pagamento: 'pix',
    vendedor_nome: 'Marina Alves',
    vendedor_contato: '(11) 9 8888-2222',
    origem: 'OLX',
    observacoes: '',
  },
  {
    id: ID.c3,
    data: iso(subDays(hoje, 90)),
    veiculo_id: ID.v3,
    valor_pago: 44000,
    forma_pagamento: 'dinheiro',
    vendedor_nome: 'Rodrigo Lima',
    vendedor_contato: '(11) 9 7777-3333',
    origem: 'Walk-in',
    observacoes: '',
  },
  {
    id: ID.c4,
    data: iso(subDays(hoje, 70)),
    veiculo_id: ID.v4,
    valor_pago: 58000,
    forma_pagamento: 'transferência',
    vendedor_nome: 'Patrícia Souza',
    vendedor_contato: '(11) 9 6666-4444',
    origem: 'Instagram',
    observacoes: '',
  },
  {
    id: ID.c5,
    data: iso(subMonths(hoje, 3)),
    veiculo_id: ID.v5,
    valor_pago: 72000,
    forma_pagamento: 'transferência',
    vendedor_nome: 'Eduardo Martins',
    vendedor_contato: '(11) 9 5555-5555',
    origem: 'Webmotors',
    observacoes: '',
  },
]

export const vendasSeed: Venda[] = [
  {
    id: ID.vd1,
    data: iso(subDays(hoje, 10)),
    veiculo_id: ID.v4,
    comprador_nome: 'André Ribeiro',
    comprador_cpf: '123.456.789-00',
    comprador_contato: '(11) 9 1234-5678',
    valor_venda: 66500,
    forma_recebimento: 'financiamento',
    entrada: 20000,
    parcelas: 48,
    observacoes: 'Aprovado no banco em 1 dia.',
  },
  {
    id: ID.vd2,
    data: iso(subDays(hoje, 4)),
    veiculo_id: ID.v3,
    comprador_nome: 'Beatriz Cardoso',
    comprador_cpf: '987.654.321-00',
    comprador_contato: '(11) 9 4321-8765',
    valor_venda: 52000,
    forma_recebimento: 'pix',
    observacoes: 'Pagamento à vista.',
  },
  {
    id: ID.vd3,
    data: iso(subMonths(hoje, 1)),
    veiculo_id: ID.v5,
    comprador_nome: 'Felipe Castro',
    comprador_contato: '(11) 9 1010-2020',
    valor_venda: 81500,
    forma_recebimento: 'transferência',
    observacoes: 'Cliente recorrente.',
  },
]

// Seed internamente consistente: todos os veículos com `status === 'vendido'`
// possuem uma Venda correspondente no array vendasSeed, e cada veículo tem
// uma Compra correspondente em comprasSeed. Isso garante que o Dashboard
// reflita exatamente o estado do estoque desde o primeiro carregamento.

// Seed de despesas zerado de propósito: o módulo Despesas ainda não existe,
// então não faz sentido o Dashboard contabilizar gastos que o usuário não
// consegue gerenciar pela UI. Quando o módulo for implementado, este array
// pode voltar a ser populado (ou não — fica decisão de produto).
export const despesasSeed: Despesa[] = []

export const configuracoesSeed: Configuracoes = { ...CONFIGURACOES_PADRAO }
