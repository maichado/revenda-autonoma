// Tipos centrais do sistema Revenda Autônoma.
// Todos os módulos consomem estes contratos — mesmo os que serão
// implementados em fases futuras (Veículos, Compras, Vendas, etc.).

export type StatusVeiculo =
  | 'em preparação'
  | 'disponível'
  | 'reservado'
  | 'vendido'

// Propriedade do veículo: "solo" = 100% seu; "meia" = dividido 50/50 com um
// sócio. Impacta a divisão do lucro (Dashboard, Relatórios, Header): a SUA
// parte de um carro "a meia" é metade do lucro líquido do carro.
export type TipoPropriedade = 'solo' | 'meia'

export const TIPOS_PROPRIEDADE: { valor: TipoPropriedade; label: string }[] = [
  { valor: 'solo', label: 'Meu (100%)' },
  { valor: 'meia', label: 'A meia (50/50)' },
]

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'transferência'
  | 'cartão'
  | 'financiamento'
  | 'financiado'
  | 'consórcio'
  | 'cheque'
  | 'outros'

// Subconjunto exigido pela spec do módulo Compras (o tipo amplo acima
// continua sendo aceito em Compra.forma_pagamento para acomodar legados,
// porém o formulário/filtros do módulo só oferecem estas opções).
export type FormaPagamentoCompra =
  | 'dinheiro'
  | 'pix'
  | 'financiado'
  | 'consórcio'

export const FORMAS_PAGAMENTO_COMPRA: FormaPagamentoCompra[] = [
  'dinheiro',
  'pix',
  'financiado',
  'consórcio',
]

// Subconjunto exigido pela spec do módulo Vendas (mesma família do módulo
// Compras, mas isolado em uma constante própria para que cada módulo possa
// evoluir independentemente quando a regra de negócio mudar).
export type FormaRecebimentoVenda =
  | 'dinheiro'
  | 'pix'
  | 'financiado'
  | 'consórcio'

export const FORMAS_RECEBIMENTO_VENDA: FormaRecebimentoVenda[] = [
  'dinheiro',
  'pix',
  'financiado',
  'consórcio',
]

// Origens canônicas das compras (de novo, mantemos o campo como string em
// Compra.origem para tolerar dados legados/seed; o formulário/filtro do
// módulo restringe-se a estas opções).
export type OrigemCompra = 'leilão' | 'particular' | 'loja' | 'pré-leilão'

export const ORIGENS_COMPRA: OrigemCompra[] = [
  'leilão',
  'particular',
  'loja',
  'pré-leilão',
]

export interface Veiculo {
  id: string
  placa: string
  marca: string
  modelo: string
  ano: number
  cor: string
  quilometragem: number
  /** ISO date (yyyy-MM-dd) */
  data_compra: string
  /** Quando o veículo foi anunciado/publicado para venda (yyyy-MM-dd). */
  data_anuncio?: string
  valor_compra: number
  valor_fipe?: number
  valor_venda_pretendido: number
  status: StatusVeiculo
  /** "solo" (100% seu) ou "meia" (50/50 com um sócio). Default: "solo". */
  tipo_propriedade: TipoPropriedade
  /** Nome do sócio parceiro quando tipo_propriedade = "meia" (opcional). */
  socio_parceiro?: string
  /**
   * Compra paga do bolso além do capital inicial — reembolso registrado no
   * Banco Pessoal quando o negócio devolve esse valor.
   */
  compra_pessoal_reembolsada?: boolean
  /**
   * Venda registrada e parte pessoal recuperada/devolvida — confirmado no
   * Banco Pessoal ou ao registrar a venda.
   */
  investimento_pessoal_devolvido?: boolean
  /** Caixa da revenda usado na compra (100% do valor do carro). */
  compra_funding_revenda?: number
  /** Pool pessoal (capital + reinvestimento) usado na compra. */
  compra_funding_investimento?: number
  /** Bolso pessoal usado na compra. */
  compra_funding_pessoal?: number
  /** Origem da compra definida manualmente (não recalcula automaticamente). */
  compra_funding_manual?: boolean
  /** Metade do valor de investimento informado é do sócio (só afeta seu pool). */
  compra_funding_investimento_meia_socio?: boolean
  /** Metade do valor de revenda informado é do sócio. */
  compra_funding_revenda_meia_socio?: boolean
  /** Metade do valor pessoal informado é do sócio (só sua metade entra a devolver). */
  compra_funding_pessoal_meia_socio?: boolean
  observacoes: string
  fotos: string[]
  despesas_vinculadas: string[]
}

export interface Compra {
  id: string
  /** ISO date */
  data: string
  veiculo_id: string
  valor_pago: number
  forma_pagamento: FormaPagamento
  vendedor_nome: string
  vendedor_contato: string
  origem: string
  observacoes: string
}

export interface Venda {
  id: string
  /** ISO date */
  data: string
  veiculo_id: string
  comprador_nome: string
  comprador_cpf?: string
  comprador_contato: string
  valor_venda: number
  forma_recebimento: FormaPagamento
  entrada?: number
  parcelas?: number
  observacoes: string
}

// Tipos canônicos do módulo Despesas (spec). A migração v3 → v4 do store
// mapeia valores antigos (estética, imposto, comissão, fixa) para o conjunto
// abaixo, garantindo que registros pré-existentes continuem visíveis.
export type TipoDespesa =
  | 'manutenção'
  | 'documentação'
  | 'detalhamento'
  | 'frete'
  | 'taxa'
  | 'marketing'
  | 'outros'

export const TIPOS_DESPESA: TipoDespesa[] = [
  'manutenção',
  'documentação',
  'detalhamento',
  'frete',
  'taxa',
  'marketing',
  'outros',
]

// Formas de pagamento aceitas no FORMULÁRIO de despesas — mesmo subconjunto
// usado em Compras/Vendas, conforme spec. O campo Despesa.forma_pagamento
// continua tipado como FormaPagamento (amplo) para tolerar dados legados.
export type FormaPagamentoDespesa =
  | 'dinheiro'
  | 'pix'
  | 'financiado'
  | 'consórcio'

export const FORMAS_PAGAMENTO_DESPESA: FormaPagamentoDespesa[] = [
  'dinheiro',
  'pix',
  'financiado',
  'consórcio',
]

export interface Despesa {
  id: string
  /** ISO date */
  data: string
  tipo: TipoDespesa
  descricao: string
  valor: number
  veiculo_id?: string
  pago: boolean
  forma_pagamento: FormaPagamento
  /** Nome de quem pagou a despesa (sócio, caixa, etc.). */
  pago_por: string
  /**
   * Marca que o dinheiro já foi devolvido a quem pagou (`pago_por`). Usado pelo
   * Banco Pessoal para separar o que ainda é "a devolver" do histórico de
   * devoluções. Ausente/false = ainda não reembolsado.
   */
  reembolsado?: boolean
}

export interface Configuracoes {
  nome_revenda: string
  socios: string[]
  meta_lucro_mensal: number
  /** Capital pessoal inicial do dono (sócio principal) no negócio. */
  capital_inicial_pessoal: number
}

/** Simulação salva no módulo Calculadora (persistida no PocketBase). */
export interface SimulacaoNegocio {
  id: string
  /** Rótulo opcional — ex.: "Palio 2020" */
  titulo: string
  preco_compra: number
  valor_fipe: number
  preco_venda: number
  /** Despesas previstas para o negócio (opcional). */
  despesas_estimadas: number
  observacoes: string
  /** ISO date (yyyy-MM-dd) — data do registro */
  data: string
}

// ---------------------------------------------------------------------------
// Módulo Banco Pessoal — visão derivada do sistema (sem cadastro duplicado).
// Carros vêm de `veiculos` + despesas + vendas; dinheiro pessoal a devolver
// vem de `despesas` onde `pago_por` = sócio principal (Maicon).
// ---------------------------------------------------------------------------

export type StatusCarroPessoal = 'em_estoque' | 'reservado' | 'vendido'

/** Carro exibido no Banco Pessoal — derivado de um Veículo do sistema. */
export interface CarroBancoPessoal {
  id: string
  veiculo_id: string
  nome: string
  placa: string
  status: StatusCarroPessoal
  valor_compra: number
  /** Soma das despesas vinculadas ao veículo (reforma/manutenção). */
  custo_reforma: number
  valor_venda?: number
  tipo_propriedade?: TipoPropriedade
  socio_parceiro?: string
  /** 1 = carro meu; 0.5 = a meia. */
  fracao_maicon: number
  /** Sua parte do total investido (compra + despesas) × fração. */
  minha_parte: number
  /** Valor pessoal na compra acima do pool (capital + reinvestimento). */
  extrapessoal_compra: number
  /** Sua parte na compra paga com caixa da revenda. */
  do_revenda: number
  /** Sua parte na compra paga com pool (capital + reinvestimento). */
  do_investimento: number
  /** Parte do investimento total paga pelo sócio (quando 50/50 no investimento). */
  do_investimento_socio: number
  /** Parte da revenda atribuída ao sócio. */
  do_revenda_socio: number
  /** Parte pessoal paga pelo sócio. */
  do_pessoal_socio: number
  /** Quanto da sua parte na compra veio do capital inicial (R$ 38 mil). */
  do_capital_inicial: number
  /** Quanto veio de vendas anteriores reinvestidas no pool. */
  do_reinvestimento: number
}

export type TipoMovimentacaoPool =
  | 'capital_inicial'
  | 'compra'
  | 'venda'
  | 'saldo'

/** Linha do extrato do pool pessoal (capital + reinvestimentos). */
export interface MovimentacaoPool {
  id: string
  data: string
  tipo: TipoMovimentacaoPool
  veiculo_id?: string
  carro_nome?: string
  /** Positivo = entra no pool; negativo = sai. */
  valor: number
  saldo_apos: number
  detalhe: string
}

export type OrigemLancamentoPessoal = 'despesa' | 'compra_extra'

export type StatusLancamentoPessoal = 'a_devolver' | 'devolvido'

/** Lançamento exibido no Banco Pessoal — despesa paga pelo dono ou compra extrapessoal. */
export interface LancamentoBancoPessoal {
  id: string
  origem: OrigemLancamentoPessoal
  despesa_id?: string
  veiculo_id?: string
  carro_id?: string
  carro_nome: string
  descricao: string
  valor: number
  data: string
  status: StatusLancamentoPessoal
  tipo?: TipoDespesa
}

export type Tema = 'dark' | 'light'

// Linhas usadas pela tabela "Últimas movimentações" do Dashboard.
export type TipoMovimentacao = 'venda' | 'compra' | 'despesa'

export interface Movimentacao {
  id: string
  tipo: TipoMovimentacao
  descricao: string
  data: string
  valor: number
  /** Para colorir/identificar o impacto financeiro */
  sinal: 'entrada' | 'saida'
}
