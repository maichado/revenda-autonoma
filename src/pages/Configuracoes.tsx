// Módulo Configurações — central de identidade da revenda, meta de lucro,
// gestão de sócios (editável), backup (export/import) e zona
// de perigo (limpar todos os dados com dupla confirmação).
//
// Toda interação reflete no Dashboard/Header em tempo real via store Zustand:
//   • nome_revenda    → Header
//   • meta_lucro_mensal → barra de progresso no Dashboard
//
// Os 4 cards "Resumo atual" no topo da página dão ao usuário noção rápida
// do volume de dados que estão sob seu controle.

import { useEffect, useMemo, useState } from 'react'
import { CONFIGURACOES_PADRAO } from '@/constants/configuracoesPadrao'
import { rotuloCaixaRevenda } from '@/utils/despesaOrigem'
import { normalizarListaSocios, sociosFromFormulario } from '@/utils/socios'
import {
  Building2,
  Database,
  HardDrive,
  PiggyBank,
  Receipt,
  Save,
  ShoppingCart,
  Tag,
  Target,
  Users,
  Wallet,
} from 'lucide-react'

import { useStore } from '@/store/useStore'
import { useToast } from '@/hooks/useToast'
import { useSalvarServidor } from '@/hooks/useSalvarServidor'
import { formatarMoeda, formatarNumero } from '@/utils/formatadores'
import {
  calcularTamanhoEstado,
  consumirFlagBackupAplicado,
} from '@/utils/backup'

import { Button } from '@/components/Button'
import { ConfigSection } from '@/components/ConfigSection'
import { ImportarExportarPainel } from '@/components/ImportarExportarPainel'
import { MigrarLocalStoragePainel } from '@/components/MigrarLocalStoragePainel'
import { KpiCard } from '@/components/KpiCard'
import { MoedaInput } from '@/components/MoedaInput'
import { ZonaPerigo } from '@/components/ZonaPerigo'

const LIMITE_NOME_MIN = 2
const LIMITE_NOME_MAX = 60

export default function Configuracoes() {
  const configuracoes = useStore((s) => s.configuracoes)
  const updateConfiguracoes = useStore((s) => s.updateConfiguracoes)
  const veiculos = useStore((s) => s.veiculos)
  const compras = useStore((s) => s.compras)
  const vendas = useStore((s) => s.vendas)
  const despesas = useStore((s) => s.despesas)
  const toast = useToast()
  const salvarServidor = useSalvarServidor()

  // -------- Forms locais ---------------------------------------------------
  // Mantemos o "rascunho" em estado local pra permitir cancelar sem salvar.
  const [nomeRascunho, setNomeRascunho] = useState(configuracoes.nome_revenda)
  const [metaRascunho, setMetaRascunho] = useState(
    configuracoes.meta_lucro_mensal,
  )
  const [capitalRascunho, setCapitalRascunho] = useState(
    configuracoes.capital_inicial_pessoal,
  )
  const [socio1Rascunho, setSocio1Rascunho] = useState('')
  const [socio2Rascunho, setSocio2Rascunho] = useState('')

  const sociosAtuais = useMemo(
    () => normalizarListaSocios(configuracoes.socios),
    [configuracoes.socios],
  )

  // Sincroniza rascunhos quando o store muda externamente (ex.: importação).
  useEffect(() => {
    setNomeRascunho(configuracoes.nome_revenda)
  }, [configuracoes.nome_revenda])
  useEffect(() => {
    setMetaRascunho(configuracoes.meta_lucro_mensal)
  }, [configuracoes.meta_lucro_mensal])
  useEffect(() => {
    setCapitalRascunho(configuracoes.capital_inicial_pessoal)
  }, [configuracoes.capital_inicial_pessoal])
  useEffect(() => {
    const [s1, s2] = normalizarListaSocios(configuracoes.socios)
    setSocio1Rascunho(s1)
    setSocio2Rascunho(s2)
  }, [configuracoes.socios])

  // -------- Toast pós-reload (importação de versão antiga) -----------------
  useEffect(() => {
    if (consumirFlagBackupAplicado()) {
      toast.success(
        'Dados importados com sucesso',
        'O backup foi aplicado e o app recarregado.',
      )
    }
    // Executa só na montagem; o toast não muda referência relevante aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------- Validações -----------------------------------------------------
  const nomeNormalizado = nomeRascunho.trim()
  const nomeValido =
    nomeNormalizado.length >= LIMITE_NOME_MIN &&
    nomeNormalizado.length <= LIMITE_NOME_MAX
  const nomeAlterado = nomeNormalizado !== configuracoes.nome_revenda

  const metaValida = metaRascunho >= 0
  const metaAlterada = metaRascunho !== configuracoes.meta_lucro_mensal

  const capitalValido = capitalRascunho >= 0
  const capitalAlterado =
    capitalRascunho !== configuracoes.capital_inicial_pessoal

  const socio1Normalizado = socio1Rascunho.trim()
  const socio2Normalizado = socio2Rascunho.trim()
  const socio1Valido =
    socio1Normalizado.length >= LIMITE_NOME_MIN &&
    socio1Normalizado.length <= LIMITE_NOME_MAX
  const socio2Valido =
    socio2Normalizado.length >= LIMITE_NOME_MIN &&
    socio2Normalizado.length <= LIMITE_NOME_MAX
  const sociosValidos = socio1Valido && socio2Valido
  const sociosAlterados =
    socio1Normalizado !== sociosAtuais[0] ||
    socio2Normalizado !== sociosAtuais[1]

  // -------- Tamanho do estado em KB (recalcula quando dados mudam) ---------
  const tamanhoKb = useMemo(
    () => calcularTamanhoEstado(),
    // Inclui configurações + arrays para que o número responda às mudanças.
    [veiculos, compras, vendas, despesas, configuracoes],
  )

  // -------- Handlers -------------------------------------------------------
  async function salvarNome() {
    if (!nomeValido) return
    await salvarServidor(
      () => updateConfiguracoes({ nome_revenda: nomeNormalizado }),
      'Nome atualizado',
      `Revenda: "${nomeNormalizado}". Em Despesas o caixa passa a ser ${rotuloCaixaRevenda(nomeNormalizado)}.`,
    )
  }

  async function salvarMeta() {
    if (!metaValida) return
    await salvarServidor(
      () => updateConfiguracoes({ meta_lucro_mensal: metaRascunho }),
      'Meta atualizada',
      `Nova meta mensal: ${formatarMoeda(metaRascunho)}.`,
    )
  }

  async function salvarCapital() {
    if (!capitalValido) return
    await salvarServidor(
      () =>
        updateConfiguracoes({ capital_inicial_pessoal: capitalRascunho }),
      'Capital inicial atualizado',
      `Novo capital pessoal: ${formatarMoeda(capitalRascunho)}.`,
    )
  }

  async function salvarSocios() {
    if (!sociosValidos) return
    const lista = sociosFromFormulario(socio1Normalizado, socio2Normalizado)
    await salvarServidor(
      () => updateConfiguracoes({ socios: lista }),
      'Sócios atualizados',
      `${lista[0]} e ${lista[1]} passam a valer em todo o sistema.`,
    )
  }

  // -------- Render ---------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Cabeçalho ----------------------------------------------------------- */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Identidade da revenda, meta de lucro, sócios e backup completo dos
          dados. Tudo persistido localmente no navegador.
        </p>
      </header>

      {/* Resumo atual ------------------------------------------------------- */}
      <section
        aria-label="Resumo do estado atual"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <KpiCard
          titulo="Veículos"
          valor={formatarNumero(veiculos.length)}
          icone={<Tag size={16} />}
        />
        <KpiCard
          titulo="Compras"
          valor={formatarNumero(compras.length)}
          icone={<ShoppingCart size={16} />}
        />
        <KpiCard
          titulo="Vendas"
          valor={formatarNumero(vendas.length)}
          icone={<Wallet size={16} />}
        />
        <KpiCard
          titulo="Despesas"
          valor={formatarNumero(despesas.length)}
          icone={<Receipt size={16} />}
        />
        <KpiCard
          titulo="Armazenado"
          valor={formatarKb(tamanhoKb)}
          icone={<HardDrive size={16} />}
        />
      </section>

      {/* Identidade --------------------------------------------------------- */}
      <ConfigSection
        icone={<Building2 size={20} />}
        titulo="Identidade"
        descricao="Nome da loja no sistema. Em Despesas, o caixa da empresa aparece como “Caixa {seu nome}” em Quem pagou."
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Nome da revenda
            </span>
            <input
              type="text"
              value={nomeRascunho}
              onChange={(e) => setNomeRascunho(e.target.value)}
              maxLength={LIMITE_NOME_MAX + 10 /* sem barrar digitação além do limite */}
              className="input"
              placeholder="Ex.: RVD Autônoma"
              aria-invalid={!nomeValido}
            />
            <span
              className={[
                'mt-1 block text-xs',
                nomeValido
                  ? 'text-zinc-500 dark:text-zinc-400'
                  : 'text-red-500',
              ].join(' ')}
            >
              {nomeValido
                ? `${nomeNormalizado.length}/${LIMITE_NOME_MAX} caracteres · Despesas: ${rotuloCaixaRevenda(nomeNormalizado)}`
                : `Use entre ${LIMITE_NOME_MIN} e ${LIMITE_NOME_MAX} caracteres.`}
            </span>
          </label>

          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            disabled={!nomeValido || !nomeAlterado}
            onClick={salvarNome}
          >
            Salvar
          </Button>
        </div>
      </ConfigSection>

      {/* Sócios ------------------------------------------------------------- */}
      <ConfigSection
        icone={<Users size={20} />}
        titulo="Sócios"
        descricao="Nomes usados em despesas, carros a meia, Banco Pessoal e calculadora de divisão."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sócio 1 — principal
            </span>
            <input
              type="text"
              value={socio1Rascunho}
              onChange={(e) => setSocio1Rascunho(e.target.value)}
              maxLength={LIMITE_NOME_MAX + 10}
              className="input"
              placeholder={CONFIGURACOES_PADRAO.socios[0]}
              aria-invalid={!socio1Valido}
            />
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Dono do Banco Pessoal e referência em &quot;quem pagou&quot;.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sócio 2 — parceiro
            </span>
            <input
              type="text"
              value={socio2Rascunho}
              onChange={(e) => setSocio2Rascunho(e.target.value)}
              maxLength={LIMITE_NOME_MAX + 10}
              className="input"
              placeholder={CONFIGURACOES_PADRAO.socios[1]}
              aria-invalid={!socio2Valido}
            />
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Sugerido em carros a meia e nas divisões com sócio.
            </span>
          </label>
        </div>

        {!sociosValidos && (
          <p className="mt-2 text-xs text-red-500">
            Cada sócio precisa ter entre {LIMITE_NOME_MIN} e {LIMITE_NOME_MAX}{' '}
            caracteres.
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            disabled={!sociosValidos || !sociosAlterados}
            onClick={salvarSocios}
          >
            Salvar sócios
          </Button>
        </div>
      </ConfigSection>

      {/* Meta de lucro mensal ----------------------------------------------- */}
      <ConfigSection
        icone={<Target size={20} />}
        titulo="Meta de lucro mensal"
        descricao="Valor de referência usado na barra de progresso do Dashboard."
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Meta (R$)
            </span>
            <MoedaInput
              value={metaRascunho}
              onChange={setMetaRascunho}
              aria-invalid={!metaValida}
            />
            <span
              className={[
                'mt-1 block text-xs',
                metaValida
                  ? 'text-zinc-500 dark:text-zinc-400'
                  : 'text-red-500',
              ].join(' ')}
            >
              {metaValida
                ? 'A meta precisa ser maior ou igual a zero.'
                : 'Valor inválido — informe um número >= 0.'}
            </span>
          </label>

          <div className="flex flex-col">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Preview
            </span>
            <span className="tabular inline-flex h-10 items-center rounded-lg border border-border-light bg-zinc-50/60 px-3 text-sm font-semibold dark:border-border-dark dark:bg-white/[0.02]">
              {formatarMoeda(metaRascunho)}
            </span>
          </div>

          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            disabled={!metaValida || !metaAlterada}
            onClick={salvarMeta}
          >
            Salvar
          </Button>
        </div>
      </ConfigSection>

      {/* Capital pessoal inicial (Banco Pessoal) ----------------------------- */}
      <ConfigSection
        icone={<PiggyBank size={20} />}
        titulo="Capital pessoal inicial"
        descricao="Valor que você colocou do bolso no negócio. Usado no Banco Pessoal para calcular compras dentro do capital e o que passou (ex.: Golf)."
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Capital inicial (R$)
            </span>
            <MoedaInput
              value={capitalRascunho}
              onChange={setCapitalRascunho}
              aria-invalid={!capitalValido}
            />
            <span
              className={[
                'mt-1 block text-xs',
                capitalValido
                  ? 'text-zinc-500 dark:text-zinc-400'
                  : 'text-red-500',
              ].join(' ')}
            >
              {capitalValido
                ? 'Padrão: R$ 38.000 — ajuste se o valor real for outro.'
                : 'Valor inválido — informe um número >= 0.'}
            </span>
          </label>

          <div className="flex flex-col">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Preview
            </span>
            <span className="tabular inline-flex h-10 items-center rounded-lg border border-border-light bg-zinc-50/60 px-3 text-sm font-semibold dark:border-border-dark dark:bg-white/[0.02]">
              {formatarMoeda(capitalRascunho)}
            </span>
          </div>

          <Button
            variant="primary"
            leftIcon={<Save size={16} />}
            disabled={!capitalValido || !capitalAlterado}
            onClick={salvarCapital}
          >
            Salvar
          </Button>
        </div>
      </ConfigSection>

      {/* Backup ------------------------------------------------------------- */}
      <ConfigSection
        icone={<Database size={20} />}
        titulo="Backup"
        descricao="Exporte um snapshot completo ou restaure um backup anterior."
      >
        <ImportarExportarPainel />
        <div className="mt-4">
          <MigrarLocalStoragePainel />
        </div>
      </ConfigSection>

      {/* Zona de Perigo ----------------------------------------------------- */}
      <ConfigSection
        icone={<Database size={20} />}
        titulo="Zona de perigo"
        descricao="Operações destrutivas — leia com calma antes de continuar."
        perigo
      >
        <ZonaPerigo
          totais={{
            veiculos: veiculos.length,
            compras: compras.length,
            vendas: vendas.length,
            despesas: despesas.length,
          }}
        />
      </ConfigSection>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers de exibição.
// -----------------------------------------------------------------------------

// Formata "12.3 KB" / "1.0 MB" quando o tamanho cresce.
function formatarKb(kb: number): string {
  if (!isFinite(kb) || kb <= 0) return '0,0 KB'
  if (kb >= 1024) {
    const mb = kb / 1024
    return `${mb.toFixed(2).replace('.', ',')} MB`
  }
  return `${kb.toFixed(1).replace('.', ',')} KB`
}
