/**
 * Valida o cenário do usuário:
 * Golf 50k → devolve 10.6k → 39.4k → Uno 5k (investimento) → 34.4k
 * → Peugeot 46k = 34.4k investimento + 11.6k bolso
 */
import {
  carrosFromSistema,
  devolucoesPoolFromLancamentos,
  simularPoolPessoal,
  type OpcoesSimulacaoCaixa,
} from '../src/utils/bancoPessoal.ts'
import type { Veiculo, Venda, LancamentoBancoPessoal } from '../src/types/index.ts'

const golf: Veiculo = {
  id: 'golf',
  placa: 'GOLF1',
  marca: 'VW',
  modelo: 'Golf',
  ano: 2015,
  cor: '',
  quilometragem: 0,
  data_compra: '2026-01-10',
  valor_compra: 1,
  valor_venda_pretendido: 50000,
  status: 'vendido',
  tipo_propriedade: 'solo',
  fotos: [],
  despesas_vinculadas: [],
  observacoes: '',
  compra_funding_manual: true,
  compra_funding_investimento: 0,
  compra_funding_revenda: 0,
  compra_funding_pessoal: 1,
  compra_pessoal_reembolsada: false,
}

const uno: Veiculo = {
  id: 'uno',
  placa: 'UNO1',
  marca: 'Fiat',
  modelo: 'Uno',
  ano: 2010,
  cor: '',
  quilometragem: 0,
  data_compra: '2026-03-20',
  valor_compra: 10000,
  valor_venda_pretendido: 12000,
  status: 'disponível',
  tipo_propriedade: 'meia',
  fotos: [],
  despesas_vinculadas: [],
  observacoes: '',
  compra_funding_manual: true,
  compra_funding_investimento: 5000,
  compra_funding_revenda: 0,
  compra_funding_pessoal: 0,
}

const peugeot: Veiculo = {
  id: 'peu',
  placa: 'PEU1',
  marca: 'Peugeot',
  modelo: '208',
  ano: 2018,
  cor: '',
  quilometragem: 0,
  data_compra: '2026-03-25',
  valor_compra: 46000,
  valor_venda_pretendido: 50000,
  status: 'disponível',
  tipo_propriedade: 'solo',
  fotos: [],
  despesas_vinculadas: [],
  observacoes: '',
  compra_funding_manual: true,
  compra_funding_investimento: 34400,
  compra_funding_revenda: 0,
  compra_funding_pessoal: 11600,
}

const veiculos = [golf, uno, peugeot]
const vendas: Venda[] = [
  {
    id: 'vg',
    veiculo_id: 'golf',
    data: '2026-03-15',
    valor_venda: 50000,
    comprador_nome: '',
    forma_pagamento: 'pix',
  },
]

const lancDevolvido: LancamentoBancoPessoal[] = [
  {
    id: 'dev1',
    origem: 'compra_extra',
    veiculo_id: 'golf',
    carro_id: 'golf',
    carro_nome: 'VW Golf',
    descricao: 'Devolução 10600',
    valor: 10600,
    data: '2026-01-10', // data antiga da compra — deve virar data da venda
    status: 'devolvido',
  },
]

const opcoes: OpcoesSimulacaoCaixa = {
  despesas: [],
  nomeRevenda: 'Loja',
  socios: ['Maicon', 'Socio'],
  devolucoes: devolucoesPoolFromLancamentos(lancDevolvido, vendas),
}

const s = simularPoolPessoal(veiculos, vendas, 0, opcoes)
const carros = carrosFromSistema(veiculos, [], vendas, 0, opcoes, s)
const peu = carros.find((c) => c.id === 'peu')
const unoC = carros.find((c) => c.id === 'uno')

const esperado = {
  caixaFinal: 0,
  devolvido: 10600,
  unoInv: 5000,
  unoRev: 0,
  peuInv: 34400,
  peuBolso: 11600,
}

const ok =
  s.saldoFinal === esperado.caixaFinal &&
  s.totalDevolvidoAoBolso === esperado.devolvido &&
  unoC?.do_investimento === esperado.unoInv &&
  (unoC?.do_revenda ?? 0) === esperado.unoRev &&
  peu?.do_investimento === esperado.peuInv &&
  peu?.extrapessoal_compra === esperado.peuBolso

console.log(
  JSON.stringify(
    {
      ok,
      esperado,
      obtido: {
        caixaFinal: s.saldoFinal,
        bruto: s.saldoInvestimentoBruto,
        revenda: s.saldoRevendaFinal,
        devolvido: s.totalDevolvidoAoBolso,
        devolucoesDatas: opcoes.devolucoes,
        uno: {
          inv: unoC?.do_investimento,
          rev: unoC?.do_revenda,
          bolso: unoC?.extrapessoal_compra,
        },
        peugeot: {
          inv: peu?.do_investimento,
          rev: peu?.do_revenda,
          bolso: peu?.extrapessoal_compra,
        },
        extrato: s.movimentacoes.map((m) => ({
          data: m.data,
          tipo: m.tipo,
          valor: m.valor,
          saldo: m.saldo_apos,
          detalhe: m.detalhe,
        })),
      },
    },
    null,
    2,
  ),
)

process.exit(ok ? 0 : 1)
