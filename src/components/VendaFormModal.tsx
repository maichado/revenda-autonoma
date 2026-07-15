import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import type {
  FormaRecebimentoVenda,
  Veiculo,
  Venda,
} from '@/types'
import { FORMAS_RECEBIMENTO_VENDA } from '@/types'
import { Modal } from './Modal'
import { Button } from './Button'
import { formatarMoeda } from '@/utils/formatadores'
import { novoIdPb } from '@/lib/pbIds'

interface Props {
  open: boolean
  /** Quando undefined, é cadastro; quando definido, é edição. */
  venda?: Venda
  /** Lista de veículos cadastrados — alimenta o select obrigatório. */
  veiculos: Veiculo[]
  /**
   * Quando informado em modo cadastro, pré-seleciona o veículo no select
   * (usado pela integração com o módulo Veículos: clicar "Registrar venda"
   * no card abre este modal já com o veículo escolhido).
   */
  veiculoIdInicial?: string
  onClose: () => void
  onSubmit: (v: Venda) => void
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

type Errors = Partial<Record<keyof FormState, string>>

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

// -----------------------------------------------------------------------------
// Modal principal
// -----------------------------------------------------------------------------

export function VendaFormModal({
  open,
  venda,
  veiculos,
  veiculoIdInicial,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    estadoInicial(venda, veiculoIdInicial),
  )
  const [errors, setErrors] = useState<Errors>({})

  // Reset ao reabrir / trocar venda editada / mudar veiculoIdInicial.
  useEffect(() => {
    if (open) {
      setForm(estadoInicial(venda, veiculoIdInicial))
      setErrors({})
    }
  }, [open, venda, veiculoIdInicial])

  const editando = !!venda
  const hoje = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Veículos ordenados por placa, mas com os "disponíveis" no topo para
  // facilitar a escolha (spec: destacar quais NÃO estão vendidos).
  const veiculosOrdenados = useMemo(() => {
    const ordemStatus = (s: Veiculo['status']) => {
      if (s === 'disponível') return 0
      if (s === 'reservado') return 1
      return 2
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

  function setCampo<K extends keyof FormState>(k: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [k]: valor }))
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
    }

    if (!form.comprador_nome.trim()) {
      e.comprador_nome = 'Informe o nome do comprador.'
    }

    // CPF é OPCIONAL — mas se preenchido, precisa ser válido.
    if (form.comprador_cpf.trim() && !validarCPF(form.comprador_cpf)) {
      e.comprador_cpf = 'CPF inválido.'
    }

    const valor = paraNumero(form.valor_venda)
    if (!Number.isFinite(valor) || valor <= 0) {
      e.valor_venda = 'Valor da venda deve ser maior que zero.'
    }

    if (!form.forma_recebimento) {
      e.forma_recebimento = 'Selecione a forma de recebimento.'
    }

    // Validações condicionais — só quando financiado.
    if (mostrarFinanciado) {
      if (form.entrada !== '') {
        const ent = paraNumero(form.entrada)
        if (!Number.isFinite(ent) || ent < 0) {
          e.entrada = 'Entrada inválida (deve ser >= 0).'
        } else if (Number.isFinite(valor) && ent >= valor) {
          e.entrada = 'Entrada deve ser menor que o valor da venda.'
        }
      }
      if (form.parcelas !== '') {
        const p = Number(form.parcelas)
        if (!Number.isInteger(p) || p < 1) {
          e.parcelas = 'Parcelas deve ser um inteiro maior ou igual a 1.'
        }
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

    const nova: Venda = {
      id,
      data: form.data,
      veiculo_id: form.veiculo_id,
      comprador_nome: form.comprador_nome.trim(),
      comprador_cpf: form.comprador_cpf.trim() || undefined,
      comprador_contato: form.comprador_contato.trim(),
      valor_venda: paraNumero(form.valor_venda),
      // Venda.forma_recebimento é tipado como FormaPagamento (amplo) para
      // suportar legados — aqui o valor sempre cai em uma das opções válidas.
      forma_recebimento: form.forma_recebimento as Venda['forma_recebimento'],
      observacoes: form.observacoes.trim(),
    }

    // Campos condicionais — só persistem quando relevantes.
    if (mostrarFinanciado) {
      if (form.entrada !== '') {
        const ent = paraNumero(form.entrada)
        if (Number.isFinite(ent)) nova.entrada = ent
      }
      if (form.parcelas !== '') {
        const p = Number(form.parcelas)
        if (Number.isInteger(p) && p >= 1) nova.parcelas = p
      }
    }

    onSubmit(nova)
  }

  return (
    <Modal
      open={open}
      title={editando ? 'Editar venda' : 'Registrar venda'}
      description={
        editando
          ? 'Atualize os dados da venda. O status do veículo é re-sincronizado automaticamente.'
          : 'Registre uma venda. O veículo associado será marcado como vendido automaticamente.'
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
                      : ''
                return (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.marca} {v.modelo}
                    {sufixo}
                  </option>
                )
              })}
            </select>
          </Campo>
        </fieldset>

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

        {/* Linha 3: contato + valor */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Contato do comprador">
            <input
              className="input"
              value={form.comprador_contato}
              onChange={(e) => setCampo('comprador_contato', e.target.value)}
              placeholder="Telefone, e-mail..."
            />
          </Campo>

          <Campo
            label="Valor da venda *"
            error={errors.valor_venda}
            hint={
              form.valor_venda
                ? formatarMoedaPreview(form.valor_venda)
                : 'R$'
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

        {/* Linha 5: entrada + parcelas — somente para financiado. */}
        {mostrarFinanciado && (
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
