import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import type {
  Compra,
  FormaPagamentoCompra,
  OrigemCompra,
  Veiculo,
} from '@/types'
import {
  FORMAS_PAGAMENTO_COMPRA,
  ORIGENS_COMPRA,
} from '@/types'
import { Modal } from './Modal'
import { Button } from './Button'
import { formatarMoeda } from '@/utils/formatadores'
import { novoIdPb } from '@/lib/pbIds'

interface Props {
  open: boolean
  /** Quando undefined, é cadastro; quando definido, é edição. */
  compra?: Compra
  /** Lista de veículos cadastrados — alimenta o select obrigatório. */
  veiculos: Veiculo[]
  onClose: () => void
  onSubmit: (c: Compra) => void
}

interface FormState {
  data: string
  veiculo_id: string
  valor_pago: string
  forma_pagamento: string
  vendedor_nome: string
  vendedor_contato: string
  origem: string
  observacoes: string
}

type Errors = Partial<Record<keyof FormState, string>>

function estadoInicial(c?: Compra): FormState {
  if (c) {
    return {
      data: c.data,
      veiculo_id: c.veiculo_id,
      valor_pago: String(c.valor_pago),
      forma_pagamento: c.forma_pagamento,
      vendedor_nome: c.vendedor_nome,
      vendedor_contato: c.vendedor_contato,
      origem: c.origem,
      observacoes: c.observacoes,
    }
  }
  return {
    data: format(new Date(), 'yyyy-MM-dd'),
    veiculo_id: '',
    valor_pago: '',
    forma_pagamento: 'pix',
    vendedor_nome: '',
    vendedor_contato: '',
    origem: 'particular',
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

// Modal de cadastro/edição de Compra.
export function CompraFormModal({
  open,
  compra,
  veiculos,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(() => estadoInicial(compra))
  const [errors, setErrors] = useState<Errors>({})

  // Reset ao reabrir / trocar compra editada.
  useEffect(() => {
    if (open) {
      setForm(estadoInicial(compra))
      setErrors({})
    }
  }, [open, compra])

  const editando = !!compra
  const hoje = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Veículos ordenados por placa para o select.
  const veiculosOrdenados = useMemo(
    () =>
      [...veiculos].sort((a, b) =>
        a.placa.localeCompare(b.placa, 'pt-BR'),
      ),
    [veiculos],
  )

  // Se a compra existente referencia valores fora das opções padrão (seed),
  // adicionamos como "legado" no select para não perder o dado ao editar.
  const formaLegacy = useMemo(() => {
    if (!compra) return null
    const f = compra.forma_pagamento
    return FORMAS_PAGAMENTO_COMPRA.includes(f as FormaPagamentoCompra)
      ? null
      : f
  }, [compra])

  const origemLegacy = useMemo(() => {
    if (!compra) return null
    const o = compra.origem
    return ORIGENS_COMPRA.includes(o as OrigemCompra) ? null : o
  }, [compra])

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

    const valor = paraNumero(form.valor_pago)
    if (!Number.isFinite(valor) || valor <= 0) {
      e.valor_pago = 'Valor pago deve ser maior que zero.'
    }

    if (!form.vendedor_nome.trim()) {
      e.vendedor_nome = 'Informe o nome do vendedor.'
    }

    if (!form.forma_pagamento) {
      e.forma_pagamento = 'Selecione a forma de pagamento.'
    }

    if (!form.origem) {
      e.origem = 'Selecione a origem.'
    }

    return e
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validar()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const id = compra?.id ?? novoIdPb()

    const nova: Compra = {
      id,
      data: form.data,
      veiculo_id: form.veiculo_id,
      valor_pago: paraNumero(form.valor_pago),
      // O tipo Compra.forma_pagamento é FormaPagamento (mais amplo) para
      // preservar dados legados; aqui o valor digitado sempre cai em uma
      // das opções válidas do select.
      forma_pagamento: form.forma_pagamento as Compra['forma_pagamento'],
      vendedor_nome: form.vendedor_nome.trim(),
      vendedor_contato: form.vendedor_contato.trim(),
      origem: form.origem,
      observacoes: form.observacoes.trim(),
    }

    onSubmit(nova)
  }

  return (
    <Modal
      open={open}
      title={editando ? 'Editar compra' : 'Registrar compra'}
      description={
        editando
          ? 'Atualize os dados da aquisição. A movimentação reflete no Dashboard.'
          : 'Registre a entrada do veículo no estoque (origem, vendedor, valor).'
      }
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-compra" variant="primary">
            {editando ? 'Salvar alterações' : 'Registrar compra'}
          </Button>
        </>
      }
    >
      <form
        id="form-compra"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        {/* Linha 1: data + veículo */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Data da compra *" error={errors.data}>
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
                ? 'Cadastre um veículo antes de registrar a compra.'
                : undefined
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
              {veiculosOrdenados.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </Campo>
        </fieldset>

        {/* Linha 2: valor + forma de pagamento */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            label="Valor pago *"
            error={errors.valor_pago}
            hint={
              form.valor_pago
                ? formatarMoedaPreview(form.valor_pago)
                : 'R$'
            }
          >
            <input
              type="number"
              step="0.01"
              min={0}
              className="input tabular"
              value={form.valor_pago}
              onChange={(e) => setCampo('valor_pago', e.target.value)}
              placeholder="0,00"
              required
            />
          </Campo>

          <Campo label="Forma de pagamento *" error={errors.forma_pagamento}>
            <select
              className="input capitalize"
              value={form.forma_pagamento}
              onChange={(e) => setCampo('forma_pagamento', e.target.value)}
              required
            >
              {FORMAS_PAGAMENTO_COMPRA.map((f) => (
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

        {/* Linha 3: vendedor */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Vendedor *" error={errors.vendedor_nome}>
            <input
              className="input"
              value={form.vendedor_nome}
              onChange={(e) => setCampo('vendedor_nome', e.target.value)}
              placeholder="Nome completo"
              required
            />
          </Campo>

          <Campo label="Contato do vendedor">
            <input
              className="input"
              value={form.vendedor_contato}
              onChange={(e) => setCampo('vendedor_contato', e.target.value)}
              placeholder="Telefone, e-mail..."
            />
          </Campo>
        </fieldset>

        {/* Linha 4: origem */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Origem *" error={errors.origem}>
            <select
              className="input capitalize"
              value={form.origem}
              onChange={(e) => setCampo('origem', e.target.value)}
              required
            >
              {ORIGENS_COMPRA.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              {origemLegacy && (
                <option value={origemLegacy}>{origemLegacy} (legado)</option>
              )}
            </select>
          </Campo>
        </fieldset>

        {/* Observações */}
        <Campo label="Observações">
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.observacoes}
            onChange={(e) => setCampo('observacoes', e.target.value)}
            placeholder="Detalhes do negócio, condições, histórico do vendedor..."
          />
        </Campo>
      </form>
    </Modal>
  )
}

// Pequeno wrapper para cada campo — padroniza label + erro + hint.
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
