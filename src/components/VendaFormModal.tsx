import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import { ArrowLeftRight } from 'lucide-react'
import { novoIdPb } from '@/lib/pbIds'
import { veiculoPossuiOutraVenda } from '@/utils/calculos'
import type {
  CategoriaVeiculo,
  FormaRecebimentoVenda,
  TrocaNaVendaInput,
  Veiculo,
  Venda,
} from '@/types'
import { CATEGORIAS_VEICULO, FORMAS_RECEBIMENTO_VENDA } from '@/types'
import { Modal } from './Modal'
import { Button } from './Button'
import { FotoUploader } from './FotoUploader'
import { RelacaoOrigemTrocaInfo } from './TrocaVeiculoInfo'
import { formatarMoeda } from '@/utils/formatadores'

interface Props {
  open: boolean
  /** Quando undefined, é cadastro; quando definido, é edição. */
  venda?: Venda
  /** Vendas já registradas — evita duplicata no mesmo veículo. */
  vendas: Venda[]
  /** Lista de veículos cadastrados — alimenta o select obrigatório. */
  veiculos: Veiculo[]
  /**
   * Quando informado em modo cadastro, pré-seleciona o veículo no select
   * (usado pela integração com o módulo Veículos: clicar "Registrar venda"
   * no card abre este modal já com o veículo escolhido).
   */
  veiculoIdInicial?: string
  onClose: () => void
  /**
   * No cadastro, `troca` opcional cria o bem no estoque ao salvar.
   * Na edição, troca não é alterada por este formulário.
   */
  onSubmit: (v: Venda, troca?: TrocaNaVendaInput) => void
}

interface FormState {
  data: string
  veiculo_id: string
  comprador_nome: string
  comprador_cpf: string
  comprador_contato: string
  valor_venda: string
  forma_recebimento: string
  entrada: string
  parcelas: string
  observacoes: string
}

interface TrocaFormState {
  categoria: CategoriaVeiculo
  placa: string
  marca: string
  modelo: string
  ano: string
  cor: string
  quilometragem: string
  valor_avaliado: string
  observacoes: string
  fotos: string[]
}

type Errors = Partial<Record<keyof FormState | `troca_${keyof TrocaFormState}`, string>>

function estadoInicial(v?: Venda, veiculoIdInicial?: string): FormState {
  if (v) {
    return {
      data: v.data,
      veiculo_id: v.veiculo_id,
      comprador_nome: v.comprador_nome,
      comprador_cpf: v.comprador_cpf ?? '',
      comprador_contato: v.comprador_contato,
      valor_venda: String(v.valor_venda),
      forma_recebimento: v.forma_recebimento,
      entrada: v.entrada != null ? String(v.entrada) : '',
      parcelas: v.parcelas != null ? String(v.parcelas) : '',
      observacoes: v.observacoes,
    }
  }
  return {
    data: format(new Date(), 'yyyy-MM-dd'),
    veiculo_id: veiculoIdInicial ?? '',
    comprador_nome: '',
    comprador_cpf: '',
    comprador_contato: '',
    valor_venda: '',
    forma_recebimento: 'pix',
    entrada: '',
    parcelas: '',
    observacoes: '',
  }
}

function trocaInicial(): TrocaFormState {
  return {
    categoria: 'moto',
    placa: '',
    marca: '',
    modelo: '',
    ano: String(new Date().getFullYear()),
    cor: '',
    quilometragem: '0',
    valor_avaliado: '',
    observacoes: '',
    fotos: [],
  }
}

// Converte string para número aceitando "1234.5" ou "1.234,56".
function paraNumero(input: string): number {
  if (input === '' || input == null) return NaN
  let limpo = input.replace(/[^\d.,-]/g, '')
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(limpo)
  return Number.isFinite(n) ? n : NaN
}

function formatarMoedaPreview(input: string): string {
  const n = paraNumero(input)
  if (!Number.isFinite(n)) return ''
  return formatarMoeda(n)
}

// -----------------------------------------------------------------------------
// CPF: máscara visual + validador oficial (dígitos verificadores).
// -----------------------------------------------------------------------------

function mascararCPF(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '')
  if (limpo.length !== 11) return false
  // 11 dígitos iguais (000.000.000-00 etc.) são tecnicamente válidos pelos
  // dígitos verificadores mas são considerados CPFs inválidos pela Receita.
  if (/^(\d)\1+$/.test(limpo)) return false

  const calcularDigito = (qtd: number): number => {
    let soma = 0
    for (let i = 0; i < qtd; i++) {
      soma += parseInt(limpo[i], 10) * (qtd + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return (
    calcularDigito(9) === parseInt(limpo[9], 10) &&
    calcularDigito(10) === parseInt(limpo[10], 10)
  )
}

function labelCategoria(c: CategoriaVeiculo): string {
  return c === 'moto' ? 'Moto' : 'Carro'
}

// -----------------------------------------------------------------------------
// Modal principal
// -----------------------------------------------------------------------------

export function VendaFormModal({
  open,
  venda,
  vendas,
  veiculos,
  veiculoIdInicial,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    estadoInicial(venda, veiculoIdInicial),
  )
  const [errors, setErrors] = useState<Errors>({})
  const [comTroca, setComTroca] = useState(false)
  const [troca, setTroca] = useState<TrocaFormState>(trocaInicial)

  // Reset ao reabrir / trocar venda editada / mudar veiculoIdInicial.
  useEffect(() => {
    if (open) {
      setForm(estadoInicial(venda, veiculoIdInicial))
      setErrors({})
      setComTroca(false)
      setTroca(trocaInicial())
    }
  }, [open, venda, veiculoIdInicial])

  const editando = !!venda
  const hoje = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const veiculoTrocaExistente = useMemo(() => {
    if (!venda?.troca_veiculo_id) return undefined
    return veiculos.find((v) => v.id === venda.troca_veiculo_id)
  }, [venda, veiculos])

  // Veículos ordenados por placa, mas com os "disponíveis" no topo para
  // facilitar a escolha (spec: destacar quais NÃO estão vendidos).
  const veiculosOrdenados = useMemo(() => {
    const ordemStatus = (s: Veiculo['status']) => {
      if (s === 'disponível') return 0
      if (s === 'reservado') return 1
      if (s === 'mecânico') return 2
      if (s === 'em preparação') return 3
      return 4
    }
    return [...veiculos].sort((a, b) => {
      const da = ordemStatus(a.status) - ordemStatus(b.status)
      if (da !== 0) return da
      return a.placa.localeCompare(b.placa, 'pt-BR')
    })
  }, [veiculos])

  // Forma legada (caso a venda editada tenha "financiamento", "transferência",
  // "cartão", etc. herdados do seed): incluímos no select como opção legacy.
  const formaLegacy = useMemo(() => {
    if (!venda) return null
    const f = venda.forma_recebimento as FormaRecebimentoVenda
    return FORMAS_RECEBIMENTO_VENDA.includes(f) ? null : venda.forma_recebimento
  }, [venda])

  const mostrarFinanciado = form.forma_recebimento === 'financiado'
  /** Com troca, a composição do negócio usa `entrada` como dinheiro. */
  const vendaComTroca = !editando && comTroca

  /** Total = dinheiro (entrada) + valor do bem na troca. */
  const totalComTroca = useMemo(() => {
    if (!vendaComTroca) return null
    const dinheiro = paraNumero(form.entrada)
    const bem = paraNumero(troca.valor_avaliado)
    if (!Number.isFinite(dinheiro) || !Number.isFinite(bem)) return null
    if (dinheiro < 0 || bem < 0) return null
    return dinheiro + bem
  }, [vendaComTroca, form.entrada, troca.valor_avaliado])

  const veiculoVendido = useMemo(
    () => veiculos.find((v) => v.id === form.veiculo_id),
    [veiculos, form.veiculo_id],
  )

  const veiculosPorId = useMemo(() => {
    const map: Record<string, Veiculo> = {}
    for (const v of veiculos) map[v.id] = v
    return map
  }, [veiculos])

  function setCampo<K extends keyof FormState>(k: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [k]: valor }))
  }

  function setTrocaCampo<K extends keyof TrocaFormState>(
    k: K,
    valor: TrocaFormState[K],
  ) {
    setTroca((t) => ({ ...t, [k]: valor }))
  }

  function validar(): Errors {
    const e: Errors = {}

    if (!form.data) {
      e.data = 'Informe a data.'
    } else if (form.data > hoje) {
      e.data = 'A data não pode ser maior que hoje.'
    }

    if (!form.veiculo_id) {
      e.veiculo_id = 'Selecione o veículo.'
    } else if (!veiculos.some((v) => v.id === form.veiculo_id)) {
      e.veiculo_id = 'Veículo não encontrado no estoque.'
    } else if (
      veiculoPossuiOutraVenda(vendas, form.veiculo_id, venda?.id)
    ) {
      e.veiculo_id =
        'Este veículo já possui venda registrada. Edite ou exclua a venda existente.'
    }

    if (!form.comprador_nome.trim()) {
      e.comprador_nome = 'Informe o nome do comprador.'
    }

    // CPF é OPCIONAL — mas se preenchido, precisa ser válido.
    if (form.comprador_cpf.trim() && !validarCPF(form.comprador_cpf)) {
      e.comprador_cpf = 'CPF inválido.'
    }

    // Com troca: total = entrada (dinheiro) + valor do bem.
    // Sem troca: valor_venda digitado normalmente.
    let valor = paraNumero(form.valor_venda)
    if (vendaComTroca) {
      const dinheiro = paraNumero(form.entrada)
      const bem = paraNumero(troca.valor_avaliado)
      if (!Number.isFinite(dinheiro) || dinheiro < 0) {
        e.entrada = 'Informe o valor em dinheiro da entrada (>= 0).'
      }
      if (!Number.isFinite(bem) || bem <= 0) {
        e.troca_valor_avaliado =
          'Informe o valor do bem na troca (maior que zero).'
      }
      if (
        Number.isFinite(dinheiro) &&
        dinheiro >= 0 &&
        Number.isFinite(bem) &&
        bem > 0
      ) {
        valor = dinheiro + bem
        if (valor <= 0) {
          e.valor_venda = 'O total da venda deve ser maior que zero.'
        }
      } else {
        valor = NaN
      }
    } else if (!Number.isFinite(valor) || valor <= 0) {
      e.valor_venda = 'Valor da venda deve ser maior que zero.'
    }

    if (!form.forma_recebimento) {
      e.forma_recebimento = 'Selecione a forma de recebimento.'
    }

    // Financiado sem troca: entrada opcional < valor da venda.
    // Com troca, a entrada já é o dinheiro da composição (validada acima).
    if (mostrarFinanciado && !vendaComTroca) {
      if (form.entrada !== '') {
        const ent = paraNumero(form.entrada)
        if (!Number.isFinite(ent) || ent < 0) {
          e.entrada = 'Entrada inválida (deve ser >= 0).'
        } else if (Number.isFinite(valor) && ent >= valor) {
          e.entrada = 'Entrada deve ser menor que o valor da venda.'
        }
      }
    }
    if (mostrarFinanciado && form.parcelas !== '') {
      const p = Number(form.parcelas)
      if (!Number.isInteger(p) || p < 1) {
        e.parcelas = 'Parcelas deve ser um inteiro maior ou igual a 1.'
      }
    }

    // Troca — dados do bem (só no cadastro).
    if (vendaComTroca) {
      if (!troca.placa.trim()) {
        e.troca_placa = 'Informe a placa do bem da troca.'
      } else {
        const placa = troca.placa.trim().toUpperCase()
        if (
          veiculos.some((v) => v.placa.trim().toUpperCase() === placa)
        ) {
          e.troca_placa = 'Já existe um veículo com esta placa no estoque.'
        }
      }
      if (!troca.marca.trim()) e.troca_marca = 'Informe a marca.'
      if (!troca.modelo.trim()) e.troca_modelo = 'Informe o modelo.'
      const ano = Number(troca.ano)
      if (!Number.isInteger(ano) || ano < 1900 || ano > 2100) {
        e.troca_ano = 'Ano inválido.'
      }
      const km = Number(troca.quilometragem)
      if (!Number.isFinite(km) || km < 0) {
        e.troca_quilometragem = 'Quilometragem inválida.'
      }
    }

    return e
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validar()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const id = venda?.id ?? novoIdPb()

    const dinheiroTroca = vendaComTroca ? paraNumero(form.entrada) : NaN
    const bemTroca = vendaComTroca ? paraNumero(troca.valor_avaliado) : NaN
    const valorTotal = vendaComTroca
      ? dinheiroTroca + bemTroca
      : paraNumero(form.valor_venda)

    const nova: Venda = {
      id,
      data: form.data,
      veiculo_id: form.veiculo_id,
      comprador_nome: form.comprador_nome.trim(),
      comprador_cpf: form.comprador_cpf.trim() || undefined,
      comprador_contato: form.comprador_contato.trim(),
      valor_venda: valorTotal,
      // Venda.forma_recebimento é tipado como FormaPagamento (amplo) para
      // suportar legados — aqui o valor sempre cai em uma das opções válidas.
      forma_recebimento: form.forma_recebimento as Venda['forma_recebimento'],
      observacoes: form.observacoes.trim(),
      troca_veiculo_id: venda?.troca_veiculo_id,
      valor_troca: venda?.valor_troca,
    }

    // Com troca: entrada = dinheiro; total = entrada + valor do bem.
    if (vendaComTroca && Number.isFinite(dinheiroTroca)) {
      nova.entrada = dinheiroTroca
    } else if (mostrarFinanciado && form.entrada !== '') {
      const ent = paraNumero(form.entrada)
      if (Number.isFinite(ent)) nova.entrada = ent
    }

    if (mostrarFinanciado && form.parcelas !== '') {
      const p = Number(form.parcelas)
      if (Number.isInteger(p) && p >= 1) nova.parcelas = p
    }

    let trocaInput: TrocaNaVendaInput | undefined
    if (vendaComTroca) {
      trocaInput = {
        categoria: troca.categoria,
        placa: troca.placa.trim().toUpperCase(),
        marca: troca.marca.trim(),
        modelo: troca.modelo.trim(),
        ano: Number(troca.ano),
        cor: troca.cor.trim(),
        quilometragem: Number(troca.quilometragem) || 0,
        valor_avaliado: bemTroca,
        observacoes: troca.observacoes.trim() || undefined,
        fotos: troca.fotos,
      }
    }

    onSubmit(nova, trocaInput)
  }

  return (
    <Modal
      open={open}
      title={editando ? 'Editar venda' : 'Registrar venda'}
      description={
        editando
          ? 'Atualize os dados da venda. O status do veículo é re-sincronizado automaticamente.'
          : 'Registre uma venda. O veículo associado será marcado como vendido automaticamente. Se entrou um carro ou moto no negócio, ative a troca para cadastrar no estoque.'
      }
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-venda" variant="primary">
            {editando ? 'Salvar alterações' : 'Registrar venda'}
          </Button>
        </>
      }
    >
      <form
        id="form-venda"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        {/* Linha 1: data + veículo */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Data da venda *" error={errors.data}>
            <input
              type="date"
              max={hoje}
              className="input tabular"
              value={form.data}
              onChange={(e) => setCampo('data', e.target.value)}
              required
            />
          </Campo>

          <Campo
            label="Veículo *"
            error={errors.veiculo_id}
            hint={
              veiculos.length === 0
                ? 'Cadastre um veículo antes de registrar a venda.'
                : 'Veículos disponíveis aparecem primeiro.'
            }
          >
            <select
              className="input"
              value={form.veiculo_id}
              onChange={(e) => setCampo('veiculo_id', e.target.value)}
              required
              disabled={veiculos.length === 0}
            >
              <option value="">Selecione…</option>
              {veiculosOrdenados.map((v) => {
                // Destaca os já vendidos com um sufixo claro — eles seguem
                // disponíveis no select para permitir EDIÇÃO de vendas
                // existentes (spec).
                const sufixo =
                  v.status === 'vendido'
                    ? ' · vendido'
                    : v.status === 'reservado'
                      ? ' · reservado'
                      : v.status === 'mecânico'
                        ? ' · mecânico'
                        : v.status === 'em preparação'
                          ? ' · em preparação'
                          : ''
                const cat =
                  v.categoria === 'moto' ? ' · moto' : ''
                return (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.marca} {v.modelo}
                    {cat}
                    {sufixo}
                  </option>
                )
              })}
            </select>
          </Campo>
        </fieldset>

        {veiculoVendido && (
          <RelacaoOrigemTrocaInfo
            veiculo={veiculoVendido}
            vendas={vendas}
            veiculosPorId={veiculosPorId}
            variant="card"
          />
        )}

        {/* Linha 2: comprador (nome + CPF) */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Nome do comprador *" error={errors.comprador_nome}>
            <input
              className="input"
              value={form.comprador_nome}
              onChange={(e) => setCampo('comprador_nome', e.target.value)}
              placeholder="Nome completo"
              required
            />
          </Campo>

          <Campo
            label="CPF (opcional)"
            error={errors.comprador_cpf}
            hint="Formato 000.000.000-00 — validado se preenchido."
          >
            <input
              className="input tabular"
              value={form.comprador_cpf}
              onChange={(e) =>
                setCampo('comprador_cpf', mascararCPF(e.target.value))
              }
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              autoComplete="off"
            />
          </Campo>
        </fieldset>

        {/* Linha 3: contato (+ valor só sem troca — com troca o total é calculado) */}
        <fieldset
          className={
            vendaComTroca
              ? 'grid grid-cols-1 gap-3'
              : 'grid grid-cols-1 gap-3 sm:grid-cols-2'
          }
        >
          <Campo label="Contato do comprador">
            <input
              className="input"
              value={form.comprador_contato}
              onChange={(e) => setCampo('comprador_contato', e.target.value)}
              placeholder="Telefone, e-mail..."
            />
          </Campo>

          {!vendaComTroca && (
            <Campo
              label="Valor da venda *"
              error={errors.valor_venda}
              hint={
                form.valor_venda
                  ? formatarMoedaPreview(form.valor_venda)
                  : 'Preço acordado do veículo vendido.'
              }
            >
              <input
                type="number"
                step="0.01"
                min={0}
                className="input tabular"
                value={form.valor_venda}
                onChange={(e) => setCampo('valor_venda', e.target.value)}
                placeholder="0,00"
                required
              />
            </Campo>
          )}
        </fieldset>

        {/* Linha 4: forma de recebimento */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            label="Forma de recebimento *"
            error={errors.forma_recebimento}
          >
            <select
              className="input capitalize"
              value={form.forma_recebimento}
              onChange={(e) => setCampo('forma_recebimento', e.target.value)}
              required
            >
              {FORMAS_RECEBIMENTO_VENDA.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              {formaLegacy && (
                <option value={formaLegacy}>{formaLegacy} (legado)</option>
              )}
            </select>
          </Campo>
        </fieldset>

        {/* Financiado: entrada só aparece sem troca (com troca a entrada é o dinheiro da composição). */}
        {mostrarFinanciado && !vendaComTroca && (
          <fieldset className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border-light p-3 sm:grid-cols-2 dark:border-border-dark">
            <Campo
              label="Entrada (opcional)"
              error={errors.entrada}
              hint={
                form.entrada
                  ? formatarMoedaPreview(form.entrada)
                  : 'Valor pago à vista no fechamento.'
              }
            >
              <input
                type="number"
                step="0.01"
                min={0}
                className="input tabular"
                value={form.entrada}
                onChange={(e) => setCampo('entrada', e.target.value)}
                placeholder="0,00"
              />
            </Campo>

            <Campo
              label="Parcelas (opcional)"
              error={errors.parcelas}
              hint="Quantidade de parcelas (inteiro)."
            >
              <input
                type="number"
                step="1"
                min={1}
                className="input tabular"
                value={form.parcelas}
                onChange={(e) => setCampo('parcelas', e.target.value)}
                placeholder="Ex.: 48"
              />
            </Campo>
          </fieldset>
        )}

        {mostrarFinanciado && vendaComTroca && (
          <Campo
            label="Parcelas (opcional)"
            error={errors.parcelas}
            hint="Se o dinheiro da entrada for parcelado."
          >
            <input
              type="number"
              step="1"
              min={1}
              className="input tabular max-w-xs"
              value={form.parcelas}
              onChange={(e) => setCampo('parcelas', e.target.value)}
              placeholder="Ex.: 48"
            />
          </Campo>
        )}

        {/* Troca na venda — cadastro ou resumo na edição */}
        {editando && (venda?.troca_veiculo_id || venda?.valor_troca) ? (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <ArrowLeftRight size={16} />
              Troca nesta venda
            </p>
            <p className="mt-1 tabular text-xs text-zinc-600 dark:text-zinc-300">
              {venda?.entrada != null
                ? formatarMoeda(venda.entrada)
                : 'R$ 0,00'}{' '}
              (dinheiro)
              {' + '}
              {venda?.valor_troca != null
                ? formatarMoeda(venda.valor_troca)
                : '—'}{' '}
              (troca)
              {' = '}
              <span className="font-semibold">
                {formatarMoeda(venda?.valor_venda ?? 0)}
              </span>{' '}
              total
            </p>
            {veiculoTrocaExistente ? (
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Entrou{' '}
                <span className="font-semibold">
                  {labelCategoria(veiculoTrocaExistente.categoria ?? 'carro')}
                </span>{' '}
                {veiculoTrocaExistente.placa} — {veiculoTrocaExistente.marca}{' '}
                {veiculoTrocaExistente.modelo}. Já está no estoque.
              </p>
            ) : venda?.troca_veiculo_id ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Veículo da troca não encontrado na lista atual.
              </p>
            ) : null}
          </section>
        ) : null}

        {!editando && (
          <section className="space-y-3 rounded-lg border border-dashed border-border-light p-3 dark:border-border-dark">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={comTroca}
                onChange={(e) => setComTroca(e.target.checked)}
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ArrowLeftRight size={14} />
                  Entrou carro ou moto na troca
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  Dinheiro de entrada + valor do bem = total da venda. O bem
                  entra no estoque com fotos (status &quot;em preparação&quot;).
                </span>
              </span>
            </label>

            {comTroca && (
              <div className="space-y-3 border-t border-border-light pt-3 dark:border-border-dark">
                <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo
                    label="Valor em dinheiro (entrada) *"
                    error={errors.entrada}
                    hint={
                      form.entrada
                        ? formatarMoedaPreview(form.entrada)
                        : 'Quanto entrou em dinheiro no negócio.'
                    }
                  >
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="input tabular"
                      value={form.entrada}
                      onChange={(e) => setCampo('entrada', e.target.value)}
                      placeholder="0,00"
                      required={comTroca}
                    />
                  </Campo>
                  <Campo
                    label={`Valor da ${labelCategoria(troca.categoria).toLowerCase()} (troca) *`}
                    error={errors.troca_valor_avaliado}
                    hint={
                      troca.valor_avaliado
                        ? formatarMoedaPreview(troca.valor_avaliado)
                        : 'Valor abatido no negócio (= custo no estoque).'
                    }
                  >
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="input tabular"
                      value={troca.valor_avaliado}
                      onChange={(e) =>
                        setTrocaCampo('valor_avaliado', e.target.value)
                      }
                      placeholder="0,00"
                      required={comTroca}
                    />
                  </Campo>
                </fieldset>

                <div
                  className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
                  role="status"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                    Total da venda
                  </p>
                  <p className="mt-0.5 tabular text-base font-semibold tracking-tight">
                    {totalComTroca != null
                      ? formatarMoeda(totalComTroca)
                      : '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {formatarMoeda(paraNumero(form.entrada) || 0)} (dinheiro no
                    caixa) +{' '}
                    {formatarMoeda(paraNumero(troca.valor_avaliado) || 0)}{' '}
                    (bem no estoque)
                    {errors.valor_venda ? (
                      <span className="ml-1 text-red-500">
                        {errors.valor_venda}
                      </span>
                    ) : null}
                  </p>
                </div>

                {veiculoVendido?.tipo_propriedade === 'meia' && (
                  <p className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    O veículo vendido é <strong>a meia</strong>
                    {veiculoVendido.socio_parceiro
                      ? ` com ${veiculoVendido.socio_parceiro}`
                      : ''}
                    . A {labelCategoria(troca.categoria).toLowerCase()} da troca
                    também entra no estoque <strong>a meia</strong> (mesmo
                    sócio). Só o dinheiro da entrada vai para o caixa revenda —
                    o bem não conta como caixa.
                  </p>
                )}

                {veiculoVendido &&
                  veiculoVendido.tipo_propriedade !== 'meia' && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Só o valor em dinheiro entra no caixa. A{' '}
                      {labelCategoria(troca.categoria).toLowerCase()} fica no
                      estoque (em preparação), sem saída de caixa.
                    </p>
                  )}

                <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Tipo *">
                    <select
                      className="input"
                      value={troca.categoria}
                      onChange={(e) =>
                        setTrocaCampo(
                          'categoria',
                          e.target.value as CategoriaVeiculo,
                        )
                      }
                    >
                      {CATEGORIAS_VEICULO.map((c) => (
                        <option key={c} value={c}>
                          {labelCategoria(c)}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo
                    label="Placa *"
                    error={errors.troca_placa}
                    hint="Do bem que entra no estoque."
                  >
                    <input
                      className="input tabular uppercase"
                      value={troca.placa}
                      onChange={(e) =>
                        setTrocaCampo('placa', e.target.value.toUpperCase())
                      }
                      placeholder="ABC1D23"
                      maxLength={8}
                      required={comTroca}
                    />
                  </Campo>
                </fieldset>

                <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Marca *" error={errors.troca_marca}>
                    <input
                      className="input"
                      value={troca.marca}
                      onChange={(e) => setTrocaCampo('marca', e.target.value)}
                      placeholder={
                        troca.categoria === 'moto' ? 'Honda, Yamaha…' : 'VW, Fiat…'
                      }
                      required={comTroca}
                    />
                  </Campo>
                  <Campo label="Modelo *" error={errors.troca_modelo}>
                    <input
                      className="input"
                      value={troca.modelo}
                      onChange={(e) => setTrocaCampo('modelo', e.target.value)}
                      placeholder={
                        troca.categoria === 'moto' ? 'CG 160…' : 'Gol, Onix…'
                      }
                      required={comTroca}
                    />
                  </Campo>
                </fieldset>

                <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Campo label="Ano *" error={errors.troca_ano}>
                    <input
                      type="number"
                      min={1900}
                      max={2100}
                      className="input tabular"
                      value={troca.ano}
                      onChange={(e) => setTrocaCampo('ano', e.target.value)}
                      required={comTroca}
                    />
                  </Campo>
                  <Campo label="Cor">
                    <input
                      className="input"
                      value={troca.cor}
                      onChange={(e) => setTrocaCampo('cor', e.target.value)}
                      placeholder="Preta, prata…"
                    />
                  </Campo>
                  <Campo
                    label="Quilometragem"
                    error={errors.troca_quilometragem}
                  >
                    <input
                      type="number"
                      min={0}
                      className="input tabular"
                      value={troca.quilometragem}
                      onChange={(e) =>
                        setTrocaCampo('quilometragem', e.target.value)
                      }
                    />
                  </Campo>
                </fieldset>

                <Campo label="Observações da troca">
                  <textarea
                    className="input min-h-[60px] resize-y"
                    value={troca.observacoes}
                    onChange={(e) =>
                      setTrocaCampo('observacoes', e.target.value)
                    }
                    placeholder="Estado do bem, documentos, pendências…"
                  />
                </Campo>

                <FotoUploader
                  fotos={troca.fotos}
                  onChange={(fotos) => setTrocaCampo('fotos', fotos)}
                />
              </div>
            )}
          </section>
        )}

        {/* Observações */}
        <Campo label="Observações">
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.observacoes}
            onChange={(e) => setCampo('observacoes', e.target.value)}
            placeholder="Detalhes do negócio, condições especiais, garantias..."
          />
        </Campo>
      </form>
    </Modal>
  )
}

// Wrapper de campo — padroniza label + erro + hint.
function Campo({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-red-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400">
          {hint}
        </span>
      ) : null}
    </label>
  )
}
