import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import { Loader2, Search } from 'lucide-react'
import type { StatusVeiculo, TipoPropriedade, Veiculo } from '@/types'
import { TIPOS_PROPRIEDADE } from '@/types'
import { Modal } from './Modal'
import { Button } from './Button'
import { FotoUploader } from './FotoUploader'
import { formatarMoeda } from '@/utils/formatadores'
import { sugerirFundingCompraFormulario } from '@/utils/bancoPessoal'
import { socioParceiro, sociosAtivos } from '@/utils/socios'
import { rotuloCaixaRevenda } from '@/utils/despesaOrigem'
import { novoIdPb } from '@/lib/pbIds'
import { useStore } from '@/store/useStore'
import { buscarFipeAuto } from '@/lib/fipe'

interface Props {
  open: boolean
  /** Quando undefined, é cadastro; quando definido, é edição. */
  veiculo?: Veiculo
  onClose: () => void
  onSubmit: (v: Veiculo) => void
}

interface FormState {
  placa: string
  marca: string
  modelo: string
  ano: string
  cor: string
  quilometragem: string
  data_compra: string
  data_anuncio: string
  valor_compra: string
  valor_fipe: string
  valor_venda_pretendido: string
  status: StatusVeiculo
  tipo_propriedade: TipoPropriedade
  socio_parceiro: string
  observacoes: string
  fotos: string[]
  despesas_vinculadas: string[]
  funding_revenda: string
  funding_investimento: string
  funding_pessoal: string
  funding_investimento_meia_socio: boolean
  funding_revenda_meia_socio: boolean
  funding_pessoal_meia_socio: boolean
}

type Errors = Partial<Record<keyof FormState, string>>

const STATUS_OPCOES: { valor: StatusVeiculo; label: string }[] = [
  { valor: 'em preparação', label: 'Em preparação' },
  { valor: 'disponível', label: 'Disponível (anunciado)' },
  { valor: 'reservado', label: 'Reservado' },
  { valor: 'vendido', label: 'Vendido' },
]

function estadoInicial(v?: Veiculo): FormState {
  if (v) {
    return {
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      ano: String(v.ano),
      cor: v.cor,
      quilometragem: String(v.quilometragem),
      data_compra: v.data_compra,
      data_anuncio: v.data_anuncio ?? '',
      valor_compra: String(v.valor_compra),
      valor_fipe: v.valor_fipe != null ? String(v.valor_fipe) : '',
      valor_venda_pretendido: String(v.valor_venda_pretendido),
      status: v.status,
      tipo_propriedade: v.tipo_propriedade ?? 'solo',
      socio_parceiro: v.socio_parceiro ?? '',
      observacoes: v.observacoes,
      fotos: v.fotos,
      despesas_vinculadas: v.despesas_vinculadas,
      funding_revenda:
        v.compra_funding_manual && v.compra_funding_revenda != null
          ? String(v.compra_funding_revenda)
          : '',
      funding_investimento:
        v.compra_funding_manual && v.compra_funding_investimento != null
          ? String(v.compra_funding_investimento)
          : '',
      funding_pessoal:
        v.compra_funding_manual && v.compra_funding_pessoal != null
          ? String(v.compra_funding_pessoal)
          : '',
      funding_investimento_meia_socio: Boolean(
        v.compra_funding_investimento_meia_socio,
      ),
      funding_revenda_meia_socio: Boolean(v.compra_funding_revenda_meia_socio),
      funding_pessoal_meia_socio: Boolean(v.compra_funding_pessoal_meia_socio),
    }
  }
  return {
    placa: '',
    marca: '',
    modelo: '',
    ano: String(new Date().getFullYear()),
    cor: '',
    quilometragem: '0',
    data_compra: format(new Date(), 'yyyy-MM-dd'),
    data_anuncio: '',
    valor_compra: '',
    valor_fipe: '',
    valor_venda_pretendido: '',
    status: 'em preparação',
    tipo_propriedade: 'solo',
    socio_parceiro: '',
    observacoes: '',
    fotos: [],
    despesas_vinculadas: [],
    funding_revenda: '',
    funding_investimento: '',
    funding_pessoal: '',
    funding_investimento_meia_socio: false,
    funding_revenda_meia_socio: false,
    funding_pessoal_meia_socio: false,
  }
}

// Converte string para número, aceitando tanto formato JS (1000.5) — usado
// pelos <input type="number"> — quanto BR (1.234,56) caso o usuário cole.
function paraNumero(input: string): number {
  if (input === '' || input == null) return NaN
  let limpo = input.replace(/[^\d.,-]/g, '')
  if (limpo.includes(',')) {
    // Formato BR: ponto é separador de milhar, vírgula é decimal.
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  }
  const n = Number(limpo)
  return Number.isFinite(n) ? n : NaN
}

/** Valores de origem da compra — vazio conta como zero. */
function fundingNumero(input: string): number {
  if (input === '' || input == null) return 0
  const n = paraNumero(input)
  return Number.isFinite(n) ? n : NaN
}

// Formato BRL para o input de preview (sem currency style — só pontos/vírgula).
function formatarMoedaPreview(input: string): string {
  const n = paraNumero(input)
  if (!Number.isFinite(n)) return ''
  return formatarMoeda(n)
}

// Modal de cadastro/edição.
export function VeiculoFormModal({ open, veiculo, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(() => estadoInicial(veiculo))
  const [errors, setErrors] = useState<Errors>({})
  const socios = useStore((s) => s.configuracoes.socios)
  const listaSocios = sociosAtivos(socios)
  const veiculos = useStore((s) => s.veiculos)
  const vendas = useStore((s) => s.vendas)
  const despesas = useStore((s) => s.despesas)
  const capitalInicial = useStore(
    (s) => s.configuracoes.capital_inicial_pessoal,
  )
  const nomeRevenda = useStore((s) => s.configuracoes.nome_revenda)

  // --- Consulta FIPE automática --------------------------------------------
  const [fipeStatus, setFipeStatus] = useState<
    'idle' | 'loading' | 'ok' | 'erro'
  >('idle')
  const [fipeMsg, setFipeMsg] = useState('')
  // Guarda a última combinação marca|modelo|ano já consultada, evitando
  // repetir a busca (inclusive após preencher os campos com o resultado).
  const ultimaBuscaFipe = useRef<string>('')
  const fundingEditado = useRef(false)

  const chaveFipe = (marca: string, modelo: string, ano: string) =>
    `${marca.trim().toLowerCase()}|${modelo.trim().toLowerCase()}|${ano}`

  // Reset ao reabrir / trocar veículo editado.
  useEffect(() => {
    if (open) {
      setForm(estadoInicial(veiculo))
      setErrors({})
      setFipeStatus('idle')
      setFipeMsg('')
      fundingEditado.current = Boolean(veiculo?.compra_funding_manual)
      ultimaBuscaFipe.current = veiculo
        ? chaveFipe(veiculo.marca, veiculo.modelo, String(veiculo.ano))
        : ''
    }
  }, [open, veiculo])

  function veiculoHipoteticoDoForm(id: string): Veiculo {
    const valorCompra = paraNumero(form.valor_compra)
    return {
      id,
      placa: form.placa.trim() || '—',
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: Number(form.ano) || new Date().getFullYear(),
      cor: form.cor.trim(),
      quilometragem: Number(form.quilometragem) || 0,
      data_compra: form.data_compra,
      data_anuncio: form.data_anuncio.trim() || undefined,
      valor_compra: Number.isFinite(valorCompra) ? valorCompra : 0,
      valor_fipe: form.valor_fipe.trim()
        ? paraNumero(form.valor_fipe)
        : undefined,
      valor_venda_pretendido: paraNumero(form.valor_venda_pretendido) || 0,
      status: form.status,
      tipo_propriedade: form.tipo_propriedade,
      socio_parceiro: form.socio_parceiro.trim() || undefined,
      observacoes: form.observacoes.trim(),
      fotos: form.fotos,
      despesas_vinculadas: form.despesas_vinculadas,
    }
  }

  function aplicarSugestaoFunding() {
    const valorCompra = paraNumero(form.valor_compra)
    if (!Number.isFinite(valorCompra) || valorCompra <= 0) return
    if (!form.data_compra.trim()) return

    const id = veiculo?.id ?? 'preview-novo'
    const sug = sugerirFundingCompraFormulario(
      veiculoHipoteticoDoForm(id),
      veiculos,
      vendas,
      capitalInicial,
      { despesas, nomeRevenda, socios },
    )
    fundingEditado.current = false
    setForm((f) => ({
      ...f,
      funding_revenda: String(sug.revenda),
      funding_investimento: String(sug.investimento),
      funding_pessoal: String(sug.pessoal),
      funding_investimento_meia_socio:
        f.tipo_propriedade === 'meia' && sug.investimento > 0,
      funding_revenda_meia_socio:
        f.tipo_propriedade === 'meia' && sug.revenda > 0,
      funding_pessoal_meia_socio:
        f.tipo_propriedade === 'meia' && sug.pessoal > 0,
    }))
  }

  useEffect(() => {
    if (!open || fundingEditado.current) return
    aplicarSugestaoFunding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    form.valor_compra,
    form.data_compra,
    form.tipo_propriedade,
    veiculo?.id,
    veiculos,
    vendas,
    capitalInicial,
    despesas,
    nomeRevenda,
    socios,
  ])

  const editando = !!veiculo
  const anoAtual = useMemo(() => new Date().getFullYear(), [])

  const fundingResumo = useMemo(() => {
    const valorCompra = paraNumero(form.valor_compra)
    const revenda = fundingNumero(form.funding_revenda)
    const investimento = fundingNumero(form.funding_investimento)
    const pessoal = fundingNumero(form.funding_pessoal)
    const revendaSocio = form.funding_revenda_meia_socio ? revenda / 2 : 0
    const revendaMeu = revenda - revendaSocio
    const investimentoSocio = form.funding_investimento_meia_socio
      ? investimento / 2
      : 0
    const investimentoMeu = investimento - investimentoSocio
    const pessoalSocio = form.funding_pessoal_meia_socio ? pessoal / 2 : 0
    const pessoalMeu = pessoal - pessoalSocio
    const soma =
      Number.isFinite(revenda) &&
      Number.isFinite(investimento) &&
      Number.isFinite(pessoal)
        ? revenda + investimento + pessoal
        : 0
    const restante =
      Number.isFinite(valorCompra) && valorCompra > 0 ? valorCompra - soma : 0
    const metadeCompra =
      Number.isFinite(valorCompra) && valorCompra > 0 ? valorCompra / 2 : 0
    const meiaFechada =
      form.tipo_propriedade === 'meia' &&
      Math.abs(soma + restante - valorCompra) < 0.01
    const restanteEhMetadeSocio =
      form.tipo_propriedade === 'meia' &&
      Math.abs(restante - metadeCompra) < 0.01
    return {
      valorCompra,
      revenda,
      revendaMeu,
      revendaSocio,
      investimento,
      investimentoMeu,
      investimentoSocio,
      pessoal,
      pessoalMeu,
      pessoalSocio,
      soma,
      restante,
      metadeCompra,
      meiaFechada,
      restanteEhMetadeSocio,
    }
  }, [
    form.valor_compra,
    form.funding_revenda,
    form.funding_investimento,
    form.funding_pessoal,
    form.funding_investimento_meia_socio,
    form.funding_revenda_meia_socio,
    form.funding_pessoal_meia_socio,
    form.tipo_propriedade,
  ])

  function marcarFundingEditado<K extends keyof FormState>(
    k: K,
    valor: FormState[K],
  ) {
    fundingEditado.current = true
    setCampo(k, valor)
  }

  function setCampo<K extends keyof FormState>(k: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [k]: valor }))
  }

  function setStatus(novo: StatusVeiculo) {
    setForm((f) => {
      const next = { ...f, status: novo }
      if (novo === 'em preparação') {
        next.data_anuncio = ''
      } else if (
        !f.data_anuncio &&
        (novo === 'disponível' || novo === 'reservado')
      ) {
        next.data_anuncio = format(new Date(), 'yyyy-MM-dd')
      }
      return next
    })
  }

  // Consulta a FIPE com a marca/modelo/ano atuais e preenche os campos.
  async function executarBuscaFipe() {
    const marca = form.marca.trim()
    const modelo = form.modelo.trim()
    const ano = Number(form.ano)
    if (!marca || !modelo || !Number.isInteger(ano) || ano < 1950) {
      setFipeStatus('erro')
      setFipeMsg('Preencha marca, modelo e ano para buscar na FIPE.')
      return
    }

    ultimaBuscaFipe.current = chaveFipe(form.marca, form.modelo, form.ano)
    setFipeStatus('loading')
    setFipeMsg('Buscando na tabela FIPE...')

    const r = await buscarFipeAuto({ marca, modelo, ano })
    if (!r.ok) {
      setFipeStatus('erro')
      setFipeMsg(r.motivo)
      return
    }

    const { resultado } = r
    // Preenche marca/modelo/ano (canônicos da FIPE) + valor FIPE.
    setForm((f) => ({
      ...f,
      marca: resultado.marca,
      modelo: resultado.modelo,
      ano: String(resultado.ano),
      valor_fipe: String(resultado.valor),
    }))
    // Atualiza a assinatura para os valores canônicos, evitando re-disparo.
    ultimaBuscaFipe.current = chaveFipe(
      resultado.marca,
      resultado.modelo,
      String(resultado.ano),
    )
    setFipeStatus('ok')
    setFipeMsg(
      `FIPE ${formatarMoeda(resultado.valor)} — ${resultado.modelo} ${resultado.ano}` +
        (resultado.mesReferencia ? ` (${resultado.mesReferencia})` : ''),
    )
  }

  // Dispara a busca automaticamente quando marca, modelo e ano estão
  // preenchidos e ainda não há valor FIPE informado (não sobrescreve edição
  // manual). Debounce para não consultar a cada tecla.
  useEffect(() => {
    if (!open) return
    const marca = form.marca.trim()
    const modelo = form.modelo.trim()
    const ano = Number(form.ano)
    if (!marca || !modelo || !Number.isInteger(ano) || ano < 1950) return
    if (form.valor_fipe.trim()) return
    const chave = chaveFipe(form.marca, form.modelo, form.ano)
    if (chave === ultimaBuscaFipe.current) return

    const t = window.setTimeout(() => {
      void executarBuscaFipe()
    }, 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.marca, form.modelo, form.ano, form.valor_fipe])

  function validar(): Errors {
    const e: Errors = {}
    if (!form.placa.trim()) e.placa = 'Informe a placa.'
    if (!form.marca.trim()) e.marca = 'Informe a marca.'
    if (!form.modelo.trim()) e.modelo = 'Informe o modelo.'

    const anoN = Number(form.ano)
    if (!Number.isInteger(anoN) || anoN < 1950 || anoN > anoAtual + 1) {
      e.ano = `Ano deve estar entre 1950 e ${anoAtual + 1}.`
    }

    const vCompra = paraNumero(form.valor_compra)
    if (!Number.isFinite(vCompra) || vCompra <= 0) {
      e.valor_compra = 'Valor de compra deve ser maior que zero.'
    }

    const vVenda = paraNumero(form.valor_venda_pretendido)
    if (!Number.isFinite(vVenda) || vVenda <= 0) {
      e.valor_venda_pretendido = 'Valor de venda deve ser maior que zero.'
    }

    if (form.valor_fipe.trim()) {
      const vFipe = paraNumero(form.valor_fipe)
      if (!Number.isFinite(vFipe) || vFipe < 0) {
        e.valor_fipe = 'Valor FIPE inválido.'
      }
    }

    const km = Number(form.quilometragem)
    if (!Number.isFinite(km) || km < 0) {
      e.quilometragem = 'KM deve ser um número >= 0.'
    }

    const vCompraOk = Number.isFinite(vCompra) && vCompra > 0
    const rev = fundingNumero(form.funding_revenda)
    const inv = fundingNumero(form.funding_investimento)
    const pes = fundingNumero(form.funding_pessoal)
    if (
      !Number.isFinite(rev) ||
      rev < 0 ||
      !Number.isFinite(inv) ||
      inv < 0 ||
      !Number.isFinite(pes) ||
      pes < 0
    ) {
      e.funding_revenda = 'Informe valores válidos para a origem da compra.'
    } else if (vCompraOk) {
      const soma = rev + inv + pes
      if (soma > vCompra + 0.01) {
        e.funding_revenda =
          'Revenda + investimento + pessoal não pode passar do valor da compra.'
      } else if (form.tipo_propriedade === 'solo') {
        if (Math.abs(soma - vCompra) > 0.01) {
          e.funding_revenda =
            'No carro solo, a soma deve fechar exatamente o valor da compra.'
        }
      } else if (Math.abs(soma - vCompra) > 0.01 && soma > vCompra / 2 + 0.01) {
        // A meia: sua parte (rev+inv+pessoal) não pode passar de 50% da compra.
        e.funding_revenda =
          'No carro a meia, o que você informou não pode passar da metade da compra.'
      }
    }

    if (
      form.data_anuncio &&
      form.data_compra &&
      form.data_anuncio < form.data_compra
    ) {
      e.data_anuncio = 'A data do anúncio não pode ser antes da compra.'
    }

    if (
      form.status !== 'em preparação' &&
      form.status !== 'vendido' &&
      !form.data_anuncio.trim()
    ) {
      e.data_anuncio =
        'Informe quando o carro foi anunciado (ou mantenha em preparação).'
    }

    return e
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    const errs = validar()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const id = veiculo?.id ?? novoIdPb()

    const novo: Veiculo = {
      id,
      placa: form.placa.trim().toUpperCase(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      ano: Number(form.ano),
      cor: form.cor.trim(),
      quilometragem: Number(form.quilometragem) || 0,
      data_compra: form.data_compra,
      data_anuncio:
        form.status === 'em preparação'
          ? undefined
          : form.data_anuncio.trim() || undefined,
      valor_compra: paraNumero(form.valor_compra),
      valor_fipe: form.valor_fipe.trim()
        ? paraNumero(form.valor_fipe)
        : undefined,
      valor_venda_pretendido: paraNumero(form.valor_venda_pretendido),
      status: form.status,
      tipo_propriedade: form.tipo_propriedade,
      socio_parceiro:
        form.tipo_propriedade === 'meia'
          ? form.socio_parceiro.trim() || undefined
          : undefined,
      observacoes: form.observacoes,
      fotos: form.fotos,
      despesas_vinculadas: form.despesas_vinculadas,
      compra_funding_revenda: fundingNumero(form.funding_revenda),
      compra_funding_investimento: fundingNumero(form.funding_investimento),
      compra_funding_pessoal: fundingNumero(form.funding_pessoal),
      compra_funding_manual: true,
      compra_funding_investimento_meia_socio: form.funding_investimento_meia_socio,
      compra_funding_revenda_meia_socio: form.funding_revenda_meia_socio,
      compra_funding_pessoal_meia_socio: form.funding_pessoal_meia_socio,
    }

    onSubmit(novo)
  }

  return (
    <Modal
      open={open}
      title={editando ? 'Editar veículo' : 'Cadastrar veículo'}
      description={
        editando
          ? 'Atualize os dados do veículo. As alterações refletem em todo o sistema.'
          : 'Preencha os dados do veículo para adicioná-lo ao estoque.'
      }
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-veiculo"
            variant="primary"
          >
            {editando ? 'Salvar alterações' : 'Cadastrar veículo'}
          </Button>
        </>
      }
    >
      <form
        id="form-veiculo"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {/* Identificação ----------------------------------------------------- */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Placa *" error={errors.placa}>
            <input
              className="input uppercase tracking-wider"
              value={form.placa}
              onChange={(e) => setCampo('placa', e.target.value.toUpperCase())}
              placeholder="AAA-1A23"
              maxLength={10}
              required
            />
          </Campo>
          <Campo label="Marca *" error={errors.marca}>
            <input
              className="input"
              value={form.marca}
              onChange={(e) => setCampo('marca', e.target.value)}
              placeholder="Ex.: Volkswagen"
              required
            />
          </Campo>
          <Campo label="Modelo *" error={errors.modelo}>
            <input
              className="input"
              value={form.modelo}
              onChange={(e) => setCampo('modelo', e.target.value)}
              placeholder="Ex.: Polo Highline"
              required
            />
          </Campo>
          <Campo label="Ano *" error={errors.ano}>
            <input
              type="number"
              min={1950}
              max={anoAtual + 1}
              className="input tabular"
              value={form.ano}
              onChange={(e) => setCampo('ano', e.target.value)}
              required
            />
          </Campo>
          <Campo label="Cor">
            <input
              className="input"
              value={form.cor}
              onChange={(e) => setCampo('cor', e.target.value)}
              placeholder="Ex.: Prata"
            />
          </Campo>
          <Campo
            label="Quilometragem"
            error={errors.quilometragem}
            hint="Em km."
          >
            <input
              type="number"
              min={0}
              className="input tabular"
              value={form.quilometragem}
              onChange={(e) => setCampo('quilometragem', e.target.value)}
            />
          </Campo>
        </fieldset>

        {/* Valores ----------------------------------------------------------- */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo
            label="Valor de compra *"
            error={errors.valor_compra}
            hint={
              form.valor_compra ? formatarMoedaPreview(form.valor_compra) : 'R$'
            }
          >
            <input
              type="number"
              step="0.01"
              min={0}
              className="input tabular"
              value={form.valor_compra}
              onChange={(e) => setCampo('valor_compra', e.target.value)}
              placeholder="0,00"
              required
            />
          </Campo>
          <Campo
            label="Valor FIPE"
            error={errors.valor_fipe}
            hint={
              fipeStatus === 'idle'
                ? form.valor_fipe
                  ? formatarMoedaPreview(form.valor_fipe)
                  : 'Preencha marca/modelo/ano — busco na FIPE'
                : undefined
            }
          >
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min={0}
                className="input tabular flex-1"
                value={form.valor_fipe}
                onChange={(e) => setCampo('valor_fipe', e.target.value)}
                placeholder="0,00"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => void executarBuscaFipe()}
                disabled={fipeStatus === 'loading'}
                title="Buscar valor na tabela FIPE"
                aria-label="Buscar valor na tabela FIPE"
              >
                {fipeStatus === 'loading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
              </Button>
            </div>
            {fipeStatus !== 'idle' && (
              <span
                className={[
                  'mt-1 block text-[11px]',
                  fipeStatus === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : fipeStatus === 'erro'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-500 dark:text-zinc-400',
                ].join(' ')}
              >
                {fipeMsg}
              </span>
            )}
          </Campo>
          <Campo
            label="Valor de venda pretendido *"
            error={errors.valor_venda_pretendido}
            hint={
              form.valor_venda_pretendido
                ? formatarMoedaPreview(form.valor_venda_pretendido)
                : 'R$'
            }
          >
            <input
              type="number"
              step="0.01"
              min={0}
              className="input tabular"
              value={form.valor_venda_pretendido}
              onChange={(e) =>
                setCampo('valor_venda_pretendido', e.target.value)
              }
              placeholder="0,00"
              required
            />
          </Campo>
          <Campo label="Data da compra">
            <input
              type="date"
              className="input tabular"
              value={form.data_compra}
              onChange={(e) => setCampo('data_compra', e.target.value)}
            />
          </Campo>
          <Campo label="Status">
            <select
              className="input"
              value={form.status}
              onChange={(e) => setStatus(e.target.value as StatusVeiculo)}
            >
              {STATUS_OPCOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            label="Data do anúncio"
            error={errors.data_anuncio}
            hint={
              form.status === 'em preparação'
                ? 'Preencha ao mudar para Disponível ou Reservado.'
                : 'Quando o carro foi publicado/disponibilizado para venda.'
            }
          >
            <input
              type="date"
              className="input tabular"
              value={form.data_anuncio}
              onChange={(e) => setCampo('data_anuncio', e.target.value)}
              disabled={form.status === 'em preparação'}
            />
          </Campo>
        </fieldset>

        {/* Propriedade ------------------------------------------------------- */}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            label="Propriedade"
            hint={
              form.tipo_propriedade === 'meia'
                ? 'O lucro deste carro é dividido 50/50 — sua parte é a metade.'
                : 'Carro 100% seu — o lucro inteiro é seu.'
            }
          >
            <select
              className="input"
              value={form.tipo_propriedade}
              onChange={(e) => {
                const v = e.target.value as TipoPropriedade
                setCampo('tipo_propriedade', v)
                if (v === 'meia' && !form.socio_parceiro.trim()) {
                  setCampo('socio_parceiro', socioParceiro(socios))
                }
              }}
            >
              {TIPOS_PROPRIEDADE.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </Campo>
          {form.tipo_propriedade === 'meia' && (
            <Campo
              label="Sócio parceiro"
              hint="Com quem este carro é dividido (opcional)."
            >
              <input
                className="input"
                list="lista-socios-veiculo"
                value={form.socio_parceiro}
                onChange={(e) => setCampo('socio_parceiro', e.target.value)}
                placeholder="Nome do sócio"
              />
              <datalist id="lista-socios-veiculo">
                {listaSocios.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Campo>
          )}
        </fieldset>

        {Number.isFinite(fundingResumo.valorCompra) &&
          fundingResumo.valorCompra > 0 && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Origem da compra
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    De onde saiu cada parte — ex.: revenda R$ 12 mil + R$ 1,5
                    mil investimento + R$ 1,5 mil pessoal = R$ 15 mil.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={aplicarSugestaoFunding}
                >
                  Sugerir automaticamente
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FundingOrigemColuna
                  label={rotuloCaixaRevenda(nomeRevenda)}
                  hint={
                    fundingResumo.revenda > 0 && form.funding_revenda_meia_socio
                      ? `Total na compra — sua parte: ${formatarMoeda(fundingResumo.revendaMeu)}`
                      : 'Valor total usado do caixa da loja'
                  }
                  error={errors.funding_revenda}
                  valor={form.funding_revenda}
                  onValorChange={(v) => marcarFundingEditado('funding_revenda', v)}
                  meiaSocio={form.funding_revenda_meia_socio}
                  onMeiaSocioChange={(v) =>
                    marcarFundingEditado('funding_revenda_meia_socio', v)
                  }
                  meu={fundingResumo.revendaMeu}
                  socio={fundingResumo.revendaSocio}
                  rotuloSocio="Metade da revenda é do sócio"
                  detalheSocio="Metade atribuída ao parceiro no caixa da loja"
                />
                <FundingOrigemColuna
                  label="Investimento"
                  hint={
                    fundingResumo.investimento > 0 &&
                    form.funding_investimento_meia_socio
                      ? `Total na compra — seu pool: ${formatarMoeda(fundingResumo.investimentoMeu)}`
                      : 'Pool (capital + reinvestimento) usado na compra'
                  }
                  valor={form.funding_investimento}
                  onValorChange={(v) =>
                    marcarFundingEditado('funding_investimento', v)
                  }
                  meiaSocio={form.funding_investimento_meia_socio}
                  onMeiaSocioChange={(v) =>
                    marcarFundingEditado('funding_investimento_meia_socio', v)
                  }
                  meu={fundingResumo.investimentoMeu}
                  socio={fundingResumo.investimentoSocio}
                  rotuloSocio="Metade do investimento é do sócio"
                  detalheSocio="Só a sua metade sai do pool pessoal"
                />
                <FundingOrigemColuna
                  label="Pessoal"
                  hint={
                    fundingResumo.pessoal > 0 && form.funding_pessoal_meia_socio
                      ? `Total na compra — a devolver seu: ${formatarMoeda(fundingResumo.pessoalMeu)}`
                      : 'Do seu bolso (a devolver)'
                  }
                  valor={form.funding_pessoal}
                  onValorChange={(v) => marcarFundingEditado('funding_pessoal', v)}
                  meiaSocio={form.funding_pessoal_meia_socio}
                  onMeiaSocioChange={(v) =>
                    marcarFundingEditado('funding_pessoal_meia_socio', v)
                  }
                  meu={fundingResumo.pessoalMeu}
                  socio={fundingResumo.pessoalSocio}
                  rotuloSocio="Metade do pessoal é do sócio"
                  detalheSocio="Só a sua metade entra em A devolver"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-zinc-500">
                  Compra:{' '}
                  <strong className="tabular text-zinc-800 dark:text-zinc-100">
                    {formatarMoeda(fundingResumo.valorCompra)}
                  </strong>
                </span>
                <span className="text-zinc-500">
                  Soma:{' '}
                  <strong className="tabular text-zinc-800 dark:text-zinc-100">
                    {formatarMoeda(fundingResumo.soma)}
                  </strong>
                </span>
                <span
                  className={
                    fundingResumo.meiaFechada
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : Math.abs(fundingResumo.restante) < 0.01
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : fundingResumo.restante > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500'
                  }
                >
                  {form.tipo_propriedade === 'meia' &&
                  fundingResumo.restanteEhMetadeSocio ? (
                    <>
                      Parte do sócio (50%):{' '}
                      <strong className="tabular">
                        {formatarMoeda(fundingResumo.restante)}
                      </strong>
                      {fundingResumo.meiaFechada && ' — contas fechadas ✓'}
                    </>
                  ) : (
                    <>
                      Restante:{' '}
                      <strong className="tabular">
                        {formatarMoeda(fundingResumo.restante)}
                      </strong>
                      {form.tipo_propriedade === 'meia' &&
                        fundingResumo.restante > 0.01 &&
                        ' (provável parte do sócio)'}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

        {/* Observações ------------------------------------------------------- */}
        <Campo label="Observações">
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.observacoes}
            onChange={(e) => setCampo('observacoes', e.target.value)}
            placeholder="Detalhes relevantes do veículo, condições, histórico..."
          />
        </Campo>

        {/* Fotos ------------------------------------------------------------- */}
        <FotoUploader
          fotos={form.fotos}
          onChange={(fs) => setCampo('fotos', fs)}
        />
      </form>
    </Modal>
  )
}

function FundingOrigemColuna({
  label,
  hint,
  error,
  valor,
  onValorChange,
  meiaSocio,
  onMeiaSocioChange,
  meu,
  socio,
  rotuloSocio,
  detalheSocio,
}: {
  label: string
  hint?: string
  error?: string
  valor: string
  onValorChange: (v: string) => void
  meiaSocio: boolean
  onMeiaSocioChange: (v: boolean) => void
  meu: number
  socio: number
  rotuloSocio: string
  detalheSocio: string
}) {
  const temValor = (fundingNumero(valor) || 0) > 0
  return (
    <div className="space-y-2">
      <Campo label={label} hint={hint} error={error}>
        <input
          type="number"
          step="0.01"
          min={0}
          className="input tabular"
          value={valor}
          onChange={(e) => onValorChange(e.target.value)}
          placeholder="0"
        />
      </Campo>
      {temValor && (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border-light px-2.5 py-2 dark:border-border-dark">
          <input
            type="checkbox"
            checked={meiaSocio}
            onChange={(e) => onMeiaSocioChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-primary"
          />
          <span className="min-w-0 text-xs">
            <span className="font-medium">{rotuloSocio}</span>
            <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
              {detalheSocio}
              {meiaSocio && socio > 0 && (
                <>
                  {' '}
                  ({formatarMoeda(meu)} seu · {formatarMoeda(socio)} sócio)
                </>
              )}
            </span>
          </span>
        </label>
      )}
    </div>
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
