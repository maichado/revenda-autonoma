// Modal de cadastro/edição de despesa. Validações conforme spec:
//   • data obrigatória e ≤ hoje
//   • tipo obrigatório (select restrito ao conjunto canônico)
//   • descrição obrigatória (mín. 2 caracteres)
//   • valor > 0 (com preview em BRL ao digitar)
//   • forma_pagamento obrigatória, restrita às mesmas opções de Compras/Vendas
//   • origem do pagamento: caixa da revenda ou pessoal
//   • veiculo_id opcional (vazio = despesa geral)

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import { Building2, Wallet } from 'lucide-react'
import {
  FORMAS_PAGAMENTO_DESPESA,
  TIPOS_DESPESA,
  type Despesa,
  type FormaPagamentoDespesa,
  type TipoDespesa,
  type Veiculo,
} from '@/types'
import {
  type OrigemDespesa,
  PESSOA_PESSOAL_OUTRO,
  ehDespesaPessoalDono,
  resolverOrigemDespesa,
  resolverPessoaPessoal,
  resolverPessoaPessoalForm,
  rotuloCaixaRevenda,
  sociosParaDespesaPessoal,
  valorPagoPorOrigem,
} from '@/utils/despesaOrigem'
import { socioPrincipal } from '@/utils/socios'
import { Modal } from './Modal'
import { Button } from './Button'
import { MoedaInput } from './MoedaInput'
import { TIPO_META } from './despesaMeta'
import { formatarMoeda } from '@/utils/formatadores'
import { novoIdPb } from '@/lib/pbIds'

interface Props {
  open: boolean
  /** Quando undefined, é cadastro; quando definido, é edição. */
  despesa?: Despesa
  veiculos: Veiculo[]
  socios: string[]
  nomeRevenda: string
  onClose: () => void
  onSubmit: (d: Despesa) => void
}

interface FormState {
  data: string
  tipo: TipoDespesa
  descricao: string
  valor: number
  /** '' = sem veículo (despesa geral). */
  veiculo_id: string
  pago: boolean
  forma_pagamento: FormaPagamentoDespesa
  origem: OrigemDespesa
  /** Sócio cadastrado ou PESSOA_PESSOAL_OUTRO. */
  pessoa_pessoal: string
  pessoa_pessoal_outro: string
  reembolsado: boolean
}

type Errors = Partial<
  Record<keyof FormState | 'origem' | 'pessoa_pessoal', string>
>

function hojeIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function estadoInicial(
  d: Despesa | undefined,
  nomeRevenda: string,
  socios: string[],
): FormState {
  if (d) {
    const formaAtual = (FORMAS_PAGAMENTO_DESPESA as string[]).includes(
      d.forma_pagamento as string,
    )
      ? (d.forma_pagamento as FormaPagamentoDespesa)
      : 'pix'

    const origem = resolverOrigemDespesa(d.pago_por, nomeRevenda, socios)
    const pessoa =
      origem === 'pessoal'
        ? resolverPessoaPessoal(d.pago_por, socios)
        : { select: socioPrincipal(socios), outro: '' }

    return {
      data: d.data,
      tipo: d.tipo,
      descricao: d.descricao,
      valor: d.valor,
      veiculo_id: d.veiculo_id ?? '',
      pago: d.pago,
      forma_pagamento: formaAtual,
      origem,
      pessoa_pessoal: pessoa.select,
      pessoa_pessoal_outro: pessoa.outro,
      reembolsado: origem === 'pessoal' ? Boolean(d.reembolsado) : false,
    }
  }

  const principal = socioPrincipal(socios)

  return {
    data: hojeIso(),
    tipo: 'manutenção',
    descricao: '',
    valor: 0,
    veiculo_id: '',
    pago: true,
    forma_pagamento: 'pix',
    origem: 'revenda',
    pessoa_pessoal: principal,
    pessoa_pessoal_outro: '',
    reembolsado: false,
  }
}

export function DespesaFormModal({
  open,
  despesa,
  veiculos,
  socios,
  nomeRevenda,
  onClose,
  onSubmit,
}: Props) {
  const listaSocios = sociosParaDespesaPessoal(socios)
  const [form, setForm] = useState<FormState>(() =>
    estadoInicial(despesa, nomeRevenda, socios),
  )
  const [errors, setErrors] = useState<Errors>({})
  const editando = !!despesa

  useEffect(() => {
    if (open) {
      setForm(estadoInicial(despesa, nomeRevenda, socios))
      setErrors({})
    }
  }, [open, despesa, nomeRevenda, socios])

  function setCampo<K extends keyof FormState>(k: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [k]: valor }))
  }

  function selecionarOrigem(origem: OrigemDespesa) {
    setForm((f) => ({
      ...f,
      origem,
      pessoa_pessoal:
        origem === 'pessoal' && !f.pessoa_pessoal
          ? socioPrincipal(socios)
          : f.pessoa_pessoal,
      reembolsado: origem === 'pessoal' ? f.reembolsado : false,
    }))
  }

  function pessoaPessoalAtual(): string {
    return resolverPessoaPessoalForm(
      form.pessoa_pessoal,
      form.pessoa_pessoal_outro,
      socios,
    )
  }

  function validar(): Errors {
    const e: Errors = {}
    const hoje = hojeIso()

    if (!form.data) e.data = 'Informe a data.'
    else if (form.data > hoje) e.data = 'A data não pode ser futura.'

    if (!form.tipo) e.tipo = 'Selecione um tipo.'

    const descricaoTrim = form.descricao.trim()
    if (descricaoTrim.length < 2)
      e.descricao = 'Descrição deve ter ao menos 2 caracteres.'

    if (!Number.isFinite(form.valor) || form.valor <= 0)
      e.valor = 'Valor deve ser maior que zero.'

    if (!form.forma_pagamento) e.forma_pagamento = 'Selecione a forma.'

    if (!form.origem) e.origem = 'Selecione a origem do pagamento.'

    if (form.origem === 'pessoal') {
      if (!form.pessoa_pessoal) {
        e.pessoa_pessoal = 'Selecione quem pagou do bolso.'
      } else if (form.pessoa_pessoal === PESSOA_PESSOAL_OUTRO) {
        const outro = form.pessoa_pessoal_outro.trim()
        if (outro.length < 2) {
          e.pessoa_pessoal = 'Informe o nome (mín. 2 caracteres).'
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

    const id = despesa?.id ?? novoIdPb()

    const nova: Despesa = {
      id,
      data: form.data,
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: form.valor,
      veiculo_id: form.veiculo_id || undefined,
      pago: form.pago,
      forma_pagamento: form.forma_pagamento,
      pago_por: valorPagoPorOrigem(
        form.origem,
        nomeRevenda,
        pessoaPessoalAtual(),
      ),
      reembolsado:
        form.origem === 'pessoal' &&
        ehDespesaPessoalDono(pessoaPessoalAtual(), socios)
          ? form.reembolsado
          : false,
    }
    onSubmit(nova)
  }

  const caixaLabel = rotuloCaixaRevenda(nomeRevenda)
  const mostrarOutroPessoa = form.pessoa_pessoal === PESSOA_PESSOAL_OUTRO
  const mostrarReembolso =
    form.origem === 'pessoal' &&
    ehDespesaPessoalDono(pessoaPessoalAtual(), socios)

  return (
    <Modal
      open={open}
      title={editando ? 'Editar despesa' : 'Nova despesa'}
      description={
        editando
          ? 'Atualize os dados da despesa. As alterações refletem imediatamente no Dashboard e nos cálculos de lucro/ROI.'
          : 'Lance um gasto da operação. Pode estar vinculado a um veículo ou ser geral (aluguel, marketing, etc.).'
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-despesa" variant="primary">
            {editando ? 'Salvar alterações' : 'Cadastrar despesa'}
          </Button>
        </>
      }
    >
      <form
        id="form-despesa"
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
      >
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Data *" error={errors.data}>
            <input
              type="date"
              className="input tabular"
              value={form.data}
              max={hojeIso()}
              onChange={(e) => setCampo('data', e.target.value)}
              required
            />
          </Campo>

          <Campo label="Tipo *" error={errors.tipo}>
            <select
              className="input"
              value={form.tipo}
              onChange={(e) =>
                setCampo('tipo', e.target.value as TipoDespesa)
              }
            >
              {TIPOS_DESPESA.map((t) => (
                <option key={t} value={t}>
                  {TIPO_META[t].label}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Valor *"
            error={errors.valor}
            hint={
              form.valor > 0 ? `≈ ${formatarMoeda(form.valor)}` : undefined
            }
          >
            <MoedaInput
              value={form.valor}
              onChange={(n) => setCampo('valor', n)}
            />
          </Campo>

          <Campo
            label="Descrição *"
            error={errors.descricao}
            hint="Ex.: Troca de óleo HB20, IPVA Onix, frete de entrega…"
            full
          >
            <input
              className="input"
              value={form.descricao}
              onChange={(e) => setCampo('descricao', e.target.value)}
              placeholder="Descreva a despesa"
              minLength={2}
              required
            />
          </Campo>

          <Campo
            label="Veículo vinculado"
            hint={
              form.veiculo_id
                ? 'Entra no cálculo de custo/margem deste veículo.'
                : 'Despesa geral — não afeta a margem de um veículo específico.'
            }
          >
            <select
              className="input"
              value={form.veiculo_id}
              onChange={(e) => setCampo('veiculo_id', e.target.value)}
            >
              <option value="">Geral (sem veículo)</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Forma de pagamento *"
            error={errors.forma_pagamento}
          >
            <select
              className="input"
              value={form.forma_pagamento}
              onChange={(e) =>
                setCampo(
                  'forma_pagamento',
                  e.target.value as FormaPagamentoDespesa,
                )
              }
            >
              {FORMAS_PAGAMENTO_DESPESA.map((f) => (
                <option key={f} value={f} className="capitalize">
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Origem do pagamento *"
            error={errors.origem}
            hint={
              form.origem === 'revenda'
                ? `Debita do ${caixaLabel}.`
                : 'Sai do bolso — informe quem pagou.'
            }
            full
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <OrigemOpcao
                selecionado={form.origem === 'revenda'}
                icone={<Building2 size={18} />}
                titulo="Caixa da revenda"
                descricao={caixaLabel}
                onClick={() => selecionarOrigem('revenda')}
              />
              <OrigemOpcao
                selecionado={form.origem === 'pessoal'}
                icone={<Wallet size={18} />}
                titulo="Pessoal"
                descricao="Do bolso — selecione quem pagou"
                onClick={() => selecionarOrigem('pessoal')}
              />
            </div>
          </Campo>

          {form.origem === 'pessoal' && (
            <>
              <Campo
                label="Quem pagou do bolso *"
                error={errors.pessoa_pessoal}
                hint="Sócios cadastrados em Configurações."
              >
                <select
                  className="input"
                  value={form.pessoa_pessoal}
                  onChange={(e) =>
                    setCampo('pessoa_pessoal', e.target.value)
                  }
                >
                  <option value="" disabled>
                    Selecione a pessoa
                  </option>
                  {listaSocios.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={PESSOA_PESSOAL_OUTRO}>Outro</option>
                </select>
              </Campo>

              {mostrarOutroPessoa && (
                <Campo
                  label="Nome (outro) *"
                  error={errors.pessoa_pessoal}
                  hint="Ex.: funcionário, fornecedor…"
                >
                  <input
                    className="input"
                    value={form.pessoa_pessoal_outro}
                    onChange={(e) =>
                      setCampo('pessoa_pessoal_outro', e.target.value)
                    }
                    placeholder="Quem pagou esta despesa?"
                    minLength={2}
                  />
                </Campo>
              )}
            </>
          )}
        </fieldset>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border-light bg-zinc-50 p-3 dark:border-border-dark dark:bg-white/[0.03]">
          <div>
            <span className="block text-sm font-medium">
              {form.pago ? 'Despesa já paga' : 'Despesa em aberto'}
            </span>
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              Em aberto entra no indicador de alerta no topo da página.
            </span>
          </div>
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input
              type="checkbox"
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
              checked={form.pago}
              onChange={(e) => setCampo('pago', e.target.checked)}
              aria-label="Despesa paga"
            />
            <span className="absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-primary dark:bg-white/[0.12]" />
            <span className="absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>

        {mostrarReembolso && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
            <div>
              <span className="block text-sm font-medium">
                Já reembolsado (Banco Pessoal)
              </span>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                Marque quando o negócio já devolveu este valor. Também pode
                marcar em Banco Pessoal → &quot;Devolvido ✓&quot;.
              </span>
            </div>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                checked={form.reembolsado}
                onChange={(e) => setCampo('reembolsado', e.target.checked)}
                aria-label="Já reembolsado"
              />
              <span className="absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-emerald-500 dark:bg-white/[0.12]" />
              <span className="absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        )}
      </form>
    </Modal>
  )
}

function OrigemOpcao({
  selecionado,
  icone,
  titulo,
  descricao,
  onClick,
}: {
  selecionado: boolean
  icone: ReactNode
  titulo: string
  descricao: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        selecionado
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border-light bg-zinc-50/50 hover:border-zinc-300 dark:border-border-dark dark:bg-white/[0.02] dark:hover:border-zinc-600',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          selecionado
            ? 'bg-primary/20 text-primary'
            : 'bg-zinc-200/80 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300',
        ].join(' ')}
      >
        {icone}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
          {descricao}
        </span>
      </span>
    </button>
  )
}

function Campo({
  label,
  hint,
  error,
  children,
  full,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  full?: boolean
}) {
  return (
    <label
      className={['block', full ? 'sm:col-span-2 lg:col-span-3' : ''].join(
        ' ',
      )}
    >
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
