/**
 * Cenário real (tenant MG Revenda) — valida após correções.
 */
import {
  carrosFromSistema,
  devolucoesPoolFromLancamentos,
  lancamentosFromSistema,
  simularPoolPessoal,
  type OpcoesSimulacaoCaixa,
} from '../src/utils/bancoPessoal.ts'
import type { Despesa, Veiculo, Venda } from '../src/types/index.ts'

const capital = 38000
const dono = 'Maicon Machado'

const veiculos: Veiculo[] = [
  {
    id: '834gg33rs9xn53j',
    placa: 'CXA6J23',
    marca: 'Fiat',
    modelo: 'Palio EX 1.0 mpi 4p',
    ano: 2000,
    cor: '',
    quilometragem: 0,
    data_compra: '2026-06-18',
    valor_compra: 6600,
    valor_venda_pretendido: 12000,
    status: 'vendido',
    tipo_propriedade: 'meia',
    fotos: [],
    despesas_vinculadas: [],
    observacoes: '',
    compra_funding_manual: true,
    compra_funding_investimento: 6600,
    compra_funding_revenda: 0,
    compra_funding_pessoal: 0,
    compra_funding_investimento_meia_socio: true,
  },
  {
    id: 'a14cgpla6draufc',
    placa: 'MHQG64',
    marca: 'VolksWagen',
    modelo: 'Golf 1.6 Mi Total Flex 8V 4p',
    ano: 2010,
    cor: '',
    quilometragem: 0,
    data_compra: '2026-06-24',
    valor_compra: 43000,
    valor_venda_pretendido: 50000,
    status: 'vendido',
    tipo_propriedade: 'solo',
    fotos: [],
    despesas_vinculadas: [],
    observacoes: '',
    compra_funding_manual: true,
    compra_funding_investimento: 34700,
    compra_funding_revenda: 0,
    compra_funding_pessoal: 8300,
    compra_pessoal_reembolsada: true,
  },
  {
    id: 'eamzx6ydj78kc9o',
    placa: 'AFX4631',
    marca: 'VolksWagen',
    modelo: 'Gol 1000i Plus 2p',
    ano: 2003,
    cor: '',
    quilometragem: 0,
    data_compra: '2026-07-14',
    valor_compra: 10000,
    valor_venda_pretendido: 12000,
    status: 'disponível',
    tipo_propriedade: 'meia',
    fotos: [],
    despesas_vinculadas: [],
    observacoes: '',
    compra_funding_manual: true,
    compra_funding_revenda: 10000,
    compra_funding_investimento: 0,
    compra_funding_pessoal: 0,
    compra_funding_revenda_meia_socio: true,
  },
  {
    id: 'cxlbin9uwpnisvw',
    placa: 'MDX9350',
    marca: 'Fiat',
    modelo: 'Uno Mille',
    ano: 2010,
    cor: '',
    quilometragem: 0,
    data_compra: '2026-07-23',
    valor_compra: 10000,
    valor_venda_pretendido: 12000,
    status: 'em preparação',
    tipo_propriedade: 'meia',
    fotos: [],
    despesas_vinculadas: [],
    observacoes: '',
    compra_funding_manual: true,
    compra_funding_revenda: 0,
    compra_funding_investimento: 5000,
    compra_funding_pessoal: 0,
    compra_funding_revenda_meia_socio: false,
    compra_funding_investimento_meia_socio: false,
  },
  {
    id: 'deseptlx64cp8ps',
    placa: 'JAP8C88',
    marca: 'Peugeot',
    modelo: '2008 Griffe',
    ano: 2018,
    cor: '',
    quilometragem: 0,
    data_compra: '2026-07-24',
    valor_compra: 46000,
    valor_venda_pretendido: 50000,
    status: 'em preparação',
    tipo_propriedade: 'solo',
    fotos: [],
    despesas_vinculadas: [],
    observacoes: '',
    compra_funding_manual: true,
    compra_funding_investimento: 34400,
    compra_funding_revenda: 0,
    compra_funding_pessoal: 11600,
  },
]

const vendas: Venda[] = [
  {
    id: 'pu3clxueicbyuqz',
    veiculo_id: '834gg33rs9xn53j',
    data: '2026-07-10',
    valor_venda: 12000,
    comprador_nome: 'JULIANA',
    comprador_contato: '',
    forma_recebimento: 'pix',
    observacoes: '',
  },
  {
    id: 'dcjosz87lm6yvvz',
    veiculo_id: 'a14cgpla6draufc',
    data: '2026-07-23',
    valor_venda: 50000,
    comprador_nome: 'Cecilio',
    comprador_contato: '',
    forma_recebimento: 'pix',
    observacoes: '',
  },
]

const despesasRaw: Array<Partial<Despesa> & { id: string; valor: number; data: string; pago_por: string; reembolsado?: boolean; veiculo_id?: string }> = [
  { id: '50w48gm5gz2mrjq', descricao: 'Consulta Placa', valor: 32, data: '2026-06-23', pago_por: dono, reembolsado: true, veiculo_id: '834gg33rs9xn53j', tipo: 'outros' },
  { id: 'k6kxg490ibdn1ka', descricao: 'Transferência', valor: 183.9, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: '834gg33rs9xn53j', tipo: 'outros' },
  { id: 'fipzibxhoyj1q6f', descricao: 'Painel', valor: 200, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: 'hby02zp8tvoctmr', descricao: 'Vistoria', valor: 190, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: '9kdobjclr6y261q', descricao: 'Transferência', valor: 183.9, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: 'pd1jvdr62zb6d7f', descricao: 'Consulta Golf', valor: 32, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: '99m77xkf3naagtf', descricao: 'Estetica', valor: 450, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: '6ymipva153v16y0', descricao: 'Vidro', valor: 600, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: 'dcfa6q3kugsj3bz', descricao: 'Facebook', valor: 57, data: '2026-07-06', pago_por: dono, reembolsado: true, veiculo_id: '834gg33rs9xn53j', tipo: 'outros' },
  { id: '9zpx1rdp6b1iism', descricao: 'Costura', valor: 180, data: '2026-07-08', pago_por: dono, reembolsado: true, veiculo_id: '834gg33rs9xn53j', tipo: 'outros' },
  { id: '9qi1y1cogklxn7m', descricao: 'FB AD', valor: 39.35, data: '2026-07-13', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: '7v3kp7hsoz1z8lg', descricao: 'ADD FB', valor: 1.98, data: '2026-07-15', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
  { id: '5pznchlixknzhz1', descricao: 'Gasolina', valor: 150, data: '2026-07-20', pago_por: dono, reembolsado: true, veiculo_id: 'a14cgpla6draufc', tipo: 'outros' },
]

const despesas = despesasRaw as Despesa[]

const lancamentos = lancamentosFromSistema(
  despesas,
  veiculos,
  dono,
  capital,
  vendas,
  { despesas, nomeRevenda: 'MG Revenda', socios: [dono, 'Gustavo Feliciano'] },
)

const opcoes: OpcoesSimulacaoCaixa = {
  despesas,
  nomeRevenda: 'MG Revenda',
  socios: [dono, 'Gustavo Feliciano'],
  devolucoes: devolucoesPoolFromLancamentos(lancamentos, vendas),
}

const s = simularPoolPessoal(veiculos, vendas, capital, opcoes)
const carros = carrosFromSistema(veiculos, despesas, vendas, capital, opcoes, s)
const peu = carros.find((c) => c.id === 'deseptlx64cp8ps')
const uno = carros.find((c) => c.id === 'cxlbin9uwpnisvw')

const aDevolver = lancamentos
  .filter((l) => l.status === 'a_devolver')
  .reduce((a, l) => a + l.valor, 0)

console.log(
  JSON.stringify(
    {
      caixaFinal: s.saldoFinal,
      bruto: s.saldoInvestimentoBruto,
      revenda: s.saldoRevendaFinal,
      devolvidoDebitado: s.totalDevolvidoAoBolso,
      aDevolver,
      uno: { inv: uno?.do_investimento, rev: uno?.do_revenda, bolso: uno?.extrapessoal_compra },
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
        detalhe: m.detalhe.slice(0, 80),
      })),
      esperadoUsuario: {
        aposGolfEDevolucao: 39400,
        aposUno: 34400,
        peugeotInv: 34400,
        peugeotBolso: 11600,
        caixaFinal: 0,
      },
    },
    null,
    2,
  ),
)
