// Store global — dados de negócio no PocketBase; preferências de UI no localStorage.
//
// O módulo de Veículos é a "fonte da verdade" do sistema enquanto os demais
// módulos (Compras/Vendas/Despesas) ainda são placeholders. Por isso o store
// mantém INTEGRIDADE REFERENCIAL automaticamente:
//
//   - Ao cadastrar um veículo: cria-se um registro de Compra atrelado, para
//     que o Dashboard contabilize a aquisição sem depender do módulo Compras.
//     Se o veículo entra já com status="vendido", também cria-se uma Venda
//     placeholder (a ser detalhada quando o módulo Vendas existir).
//   - Ao registrar venda rápida (Veículos): cria a Venda + muda o status.
//   - Ao excluir veículo: cascata em Compras/Vendas/Despesas vinculadas.
//
// Assim, qualquer ação em Veículos reflete imediatamente no Dashboard.
// Cada mutação sincroniza com PocketBase quando o usuário está autenticado.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Compra,
  Configuracoes,
  Despesa,
  SimulacaoNegocio,
  StatusVeiculo,
  Tema,
  Veiculo,
  Venda,
} from '@/types'
import {
  carrosFromSistema,
  nomeDonoCompleto,
  patchesDevolucaoPessoalVeiculo,
} from '@/utils/bancoPessoal'
import {
  comprasSeed,
  configuracoesSeed,
  despesasSeed,
  veiculosSeed,
  vendasSeed,
} from '@/utils/seed'
import { comPersistencia } from '@/store/pbSyncBridge'
import { novoIdPb } from '@/lib/pbIds'
import {
  importarParaPb,
  fetchAllData,
  syncCompraCreate,
  syncCompraDelete,
  syncCompraUpdate,
  syncConfiguracoes,
  syncDespesaCreate,
  syncDespesaDelete,
  syncDespesaUpdate,
  syncSimulacaoCreate,
  syncSimulacaoDelete,
  limparSimulacoesPb,
  syncVeiculoCreate,
  syncVeiculoDeleteCascade,
  syncVeiculoUpdate,
  syncVendaCreate,
  syncVendaDelete,
  syncVendaUpdate,
} from '@/lib/pbApi'
interface EstadoApp {
  veiculos: Veiculo[]
  compras: Compra[]
  vendas: Venda[]
  despesas: Despesa[]
  simulacoes: SimulacaoNegocio[]
  configuracoes: Configuracoes
  tema: Tema
  sidebarColapsada: boolean
  dadosCarregados: boolean
  servidorOnline: boolean
  colecoesFaltando: boolean
  /** false quando a collection `simulacoes` ainda não foi importada no PB. */
  simulacoesColecaoOk: boolean

  // --- PocketBase / sync -------------------------------------------------
  hydrateFromServer: (estado: EstadoImportavel) => void
  setDadosCarregados: (v: boolean) => void
  setServidorOnline: (v: boolean) => void
  setColecoesFaltando: (v: boolean) => void
  setSimulacoesColecaoOk: (v: boolean) => void
  limparDadosNegocio: () => void
  setTema: (t: Tema) => void
  toggleTema: () => void
  setSidebarColapsada: (v: boolean) => void
  resetarParaSeed: () => Promise<void>
  /** Apaga todos os registros (mantém configurações e preferências). */
  limparTudo: () => Promise<void>

  // --- Configurações -----------------------------------------------------
  /** Atualiza um subconjunto das configurações sem mexer no restante. */
  updateConfiguracoes: (parcial: Partial<Configuracoes>) => Promise<void>

  // --- Backup ------------------------------------------------------------
  /**
   * Substitui em bloco veiculos/compras/vendas/despesas/configuracoes
   * com o estado importado de um arquivo JSON. Preferências locais
   * (tema, sidebarColapsada) são preservadas porque dizem respeito ao
   * dispositivo atual, não ao backup do usuário.
   */
  importarEstado: (estado: EstadoImportavel) => Promise<void>

  // --- Veículos ----------------------------------------------------------
  addVeiculo: (v: Veiculo) => Promise<void>
  updateVeiculo: (id: string, patch: Partial<Veiculo>) => Promise<void>
  /**
   * Remove o veículo e as compras/vendas vinculadas (cascata), mas PRESERVA
   * as despesas convertendo-as em "gerais" (veiculo_id = undefined). Isso
   * mantém o histórico financeiro do mês mesmo após excluir um carro, em
   * vez de apagar registros pagos.
   *
   * Retorna a quantidade de despesas convertidas, para que a UI possa
   * informar o usuário no toast de confirmação.
   */
  deleteVeiculo: (id: string) => Promise<number>
  setVeiculoStatus: (id: string, status: StatusVeiculo) => Promise<void>
  /**
   * Registro rápido de venda a partir da tela de Veículos: cria uma Venda
   * placeholder e marca o veículo como "vendido". O módulo Vendas, quando
   * existir, permitirá enriquecer os dados do comprador.
   */
  registrarVendaRapida: (
    veiculoId: string,
    valor: number,
    data?: string,
  ) => Promise<void>

  // --- Compras (já existente) -------------------------------------------
  // Compras vinculadas a um veículo existente. Excluir UMA compra não
  // mexe no veículo; mas excluir o VEÍCULO remove suas compras (cascata).
  addCompra: (c: Compra) => Promise<void>
  updateCompra: (id: string, patch: Partial<Compra>) => Promise<void>
  deleteCompra: (id: string) => Promise<void>

  // --- Vendas -----------------------------------------------------------
  // Vendas com integridade referencial com o veículo: adicionar marca o
  // veículo como "vendido"; excluir devolve o veículo para "disponível";
  // editar e trocar o veículo de uma venda re-equilibra ambos os status.
  addVenda: (v: Venda) => Promise<void>
  updateVenda: (id: string, patch: Partial<Venda>) => Promise<void>
  deleteVenda: (id: string) => Promise<void>

  // --- Despesas ---------------------------------------------------------
  // Despesas com veiculo_id opcional (despesas fixas — aluguel, marketing —
  // não têm veículo). Ao adicionar/atualizar/excluir, mantemos sincronizado
  // o array `Veiculo.despesas_vinculadas` para preservar a consistência do
  // tipo. O Dashboard consome o array global `despesas` em todos os cálculos.
  addDespesa: (d: Despesa) => Promise<void>
  updateDespesa: (id: string, patch: Partial<Despesa>) => Promise<void>
  deleteDespesa: (id: string) => Promise<void>
  /** Marca/desmarca como paga sem precisar abrir o form. */
  toggleDespesaPaga: (id: string) => Promise<void>
  /** Banco Pessoal: confirma pessoal recuperado na venda do veículo. */
  confirmarDevolucaoPessoalVeiculo: (veiculoId: string) => Promise<void>
  /** Zera flags de devolução (nada reembolsado ainda). */
  resetTodasDevolucoesPessoais: () => Promise<void>

  // --- Calculadora -------------------------------------------------------
  addSimulacao: (s: SimulacaoNegocio) => Promise<void>
  deleteSimulacao: (id: string) => Promise<void>
}

// Chave legada (dados completos) — usada só para migração ao PocketBase.
export const STORAGE_KEY = 'gm-revenda-state'

// Preferências de UI (tema, sidebar) — persistidas localmente.
export const PREFS_STORAGE_KEY = 'gm-revenda-prefs'

// Versão atual do schema persistido. Bate com `version` em `persist()` abaixo
// e é gravada em todo arquivo de backup; a importação valida que o arquivo
// não é de uma versão MAIS NOVA do que a que o app sabe ler.
export const STORE_VERSION = 6

/**
 * Shape mínimo de um backup importável. Mantemos as preferências de UI
 * (tema, sidebar) FORA daqui de propósito — ver `importarEstado`.
 */
export interface EstadoImportavel {
  veiculos: Veiculo[]
  compras: Compra[]
  vendas: Venda[]
  despesas: Despesa[]
  simulacoes?: SimulacaoNegocio[]
  configuracoes: Configuracoes
}

// Util: ids compatíveis com PocketBase (15 chars a-z0-9).
function novoId(): string {
  return novoIdPb()
}

function dataHojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Constrói um registro de Compra a partir de um Veículo recém-cadastrado.
function compraDeVeiculo(v: Veiculo): Compra {
  return {
    id: novoId(),
    data: v.data_compra,
    veiculo_id: v.id,
    valor_pago: v.valor_compra,
    forma_pagamento: 'dinheiro',
    vendedor_nome: '—',
    vendedor_contato: '',
    origem: '—',
    observacoes: 'Compra gerada automaticamente no cadastro do veículo.',
  }
}

// Constrói uma Venda placeholder a partir de um Veículo + valor.
function vendaDeVeiculo(v: Veiculo, valor: number, data: string): Venda {
  return {
    id: novoId(),
    data,
    veiculo_id: v.id,
    comprador_nome: '—',
    comprador_contato: '',
    valor_venda: valor,
    forma_recebimento: 'dinheiro',
    observacoes:
      'Venda registrada rapidamente. Complete os dados do comprador no módulo Vendas.',
  }
}

export const useStore = create<EstadoApp>()(
  persist(
    (set, get) => ({
      veiculos: [],
      compras: [],
      vendas: [],
      despesas: [],
      simulacoes: [],
      configuracoes: configuracoesSeed,
      tema: 'dark',
      sidebarColapsada: false,
      dadosCarregados: false,
      servidorOnline: true,
      colecoesFaltando: false,
      simulacoesColecaoOk: true,

      hydrateFromServer: (estado) =>
        set({
          veiculos: estado.veiculos,
          compras: estado.compras,
          vendas: estado.vendas,
          despesas: estado.despesas.map((d) => ({
            ...d,
            pago_por: d.pago_por ?? '',
            reembolsado: d.reembolsado ?? false,
          })),
          simulacoes: estado.simulacoes ?? [],
          configuracoes: estado.configuracoes,
          dadosCarregados: true,
        }),

      setDadosCarregados: (dadosCarregados) => set({ dadosCarregados }),
      setServidorOnline: (servidorOnline) => set({ servidorOnline }),
      setColecoesFaltando: (colecoesFaltando) => set({ colecoesFaltando }),
      setSimulacoesColecaoOk: (simulacoesColecaoOk) =>
        set({ simulacoesColecaoOk }),

      limparDadosNegocio: () =>
        set({
          veiculos: [],
          compras: [],
          vendas: [],
          despesas: [],
          simulacoes: [],
          configuracoes: configuracoesSeed,
          dadosCarregados: false,
        }),

      // ------- Preferências / dados -------
      setTema: (tema) => set({ tema }),
      toggleTema: () =>
        set((s) => ({ tema: s.tema === 'dark' ? 'light' : 'dark' })),
      setSidebarColapsada: (sidebarColapsada) => set({ sidebarColapsada }),

      resetarParaSeed: async () => {
        const estado = {
          veiculos: veiculosSeed,
          compras: comprasSeed,
          vendas: vendasSeed,
          despesas: despesasSeed,
          configuracoes: configuracoesSeed,
        }
        await comPersistencia(
          () => importarParaPb(estado),
          async () => {
            const dados = await fetchAllData()
            set(dados)
          },
        )
      },

      // Limpa registros e preserva preferências (tema, sidebar) — os dados
      // de identidade/meta também ficam intactos porque o usuário acabou de
      // configurá-los.
      limparTudo: async () => {
        const estado = get()
        await comPersistencia(
          async () => {
            await importarParaPb({
              ...estado,
              veiculos: [],
              compras: [],
              vendas: [],
              despesas: [],
            })
            await limparSimulacoesPb()
          },
          () =>
            set({
              veiculos: [],
              compras: [],
              vendas: [],
              despesas: [],
              simulacoes: [],
            }),
        )
      },

      // ------- Configurações -------
      updateConfiguracoes: async (parcial) => {
        const next = { ...get().configuracoes, ...parcial }
        await comPersistencia(
          () => syncConfiguracoes(next),
          () => set({ configuracoes: next }),
        )
      },

      // ------- Backup (importação em bloco) -------
      importarEstado: async (estado) => {
        const normalizado = {
          veiculos: estado.veiculos,
          compras: estado.compras,
          vendas: estado.vendas,
          despesas: (estado.despesas ?? []).map((d) => ({
            ...d,
            pago_por: d.pago_por ?? '',
            reembolsado: d.reembolsado ?? false,
          })),
          configuracoes: estado.configuracoes,
        }
        await comPersistencia(
          () => importarParaPb(normalizado),
          async () => {
            const dados = await fetchAllData()
            set(dados)
          },
        )
      },

      // ------- Veículos -------
      addVeiculo: async (veiculo) => {
        const compra = compraDeVeiculo(veiculo)
        const novaVenda =
          veiculo.status === 'vendido'
            ? vendaDeVeiculo(
                veiculo,
                veiculo.valor_venda_pretendido,
                dataHojeIso(),
              )
            : null

        await comPersistencia(
          async () => {
            await syncVeiculoCreate(veiculo)
            await syncCompraCreate(compra)
            if (novaVenda) await syncVendaCreate(novaVenda)
          },
          () =>
            set((s) => {
              const veiculos = [veiculo, ...s.veiculos]
              const compras = [compra, ...s.compras]
              let vendas = s.vendas
              if (
                novaVenda &&
                !s.vendas.some((v) => v.veiculo_id === veiculo.id)
              ) {
                vendas = [novaVenda, ...s.vendas]
              }
              return { veiculos, compras, vendas }
            }),
        )
      },

      updateVeiculo: async (id, patch) => {
        let novaVenda: Venda | null = null
        const s0 = get()
        const atual = s0.veiculos.find((v) => v.id === id)
        if (!atual) return

        const atualizado: Veiculo = { ...atual, ...patch }
        let vendasPreview = s0.vendas
        if (
          atualizado.status === 'vendido' &&
          atual.status !== 'vendido' &&
          !s0.vendas.some((v) => v.veiculo_id === id)
        ) {
          novaVenda = vendaDeVeiculo(
            atualizado,
            atualizado.valor_venda_pretendido,
            dataHojeIso(),
          )
          vendasPreview = [novaVenda, ...s0.vendas]
        }

        const compraAuto = s0.compras.find(
          (c) =>
            c.veiculo_id === id &&
            c.observacoes.startsWith('Compra gerada automaticamente'),
        )

        await comPersistencia(
          async () => {
            await syncVeiculoUpdate(id, patch)
            if (
              compraAuto &&
              (patch.data_compra != null || patch.valor_compra != null)
            ) {
              await syncCompraUpdate(compraAuto.id, {
                data: patch.data_compra,
                valor_pago: patch.valor_compra,
              })
            }
            if (novaVenda) await syncVendaCreate(novaVenda)
          },
          () =>
            set((s) => {
              const veiculos = s.veiculos.map((v) =>
                v.id === id ? atualizado : v,
              )
              const compras = s.compras.map((c) =>
                c.veiculo_id === id &&
                c.observacoes.startsWith('Compra gerada automaticamente')
                  ? {
                      ...c,
                      data: atualizado.data_compra,
                      valor_pago: atualizado.valor_compra,
                    }
                  : c,
              )
              return { veiculos, compras, vendas: vendasPreview }
            }),
        )
      },

      deleteVeiculo: async (id) => {
        const s = get()
        const compraIds = s.compras
          .filter((c) => c.veiculo_id === id)
          .map((c) => c.id)
        const vendaIds = s.vendas
          .filter((v) => v.veiculo_id === id)
          .map((v) => v.id)
        const despesaIds = s.despesas
          .filter((d) => d.veiculo_id === id)
          .map((d) => d.id)
        const convertidas = despesaIds.length

        await comPersistencia(
          () => syncVeiculoDeleteCascade(id, compraIds, vendaIds, despesaIds),
          () =>
            set((state) => ({
              veiculos: state.veiculos.filter((v) => v.id !== id),
              compras: state.compras.filter((c) => c.veiculo_id !== id),
              vendas: state.vendas.filter((v) => v.veiculo_id !== id),
              despesas: state.despesas.map((d) =>
                d.veiculo_id === id ? { ...d, veiculo_id: undefined } : d,
              ),
            })),
        )
        return convertidas
      },

      setVeiculoStatus: async (id, status) => {
        await comPersistencia(
          () => syncVeiculoUpdate(id, { status }),
          () =>
            set((s) => ({
              veiculos: s.veiculos.map((v) =>
                v.id === id ? { ...v, status } : v,
              ),
            })),
        )
      },

      registrarVendaRapida: async (veiculoId, valor, data) => {
        const s0 = get()
        const veiculo = s0.veiculos.find((v) => v.id === veiculoId)
        if (!veiculo) return

        const dataIso = data ?? dataHojeIso()
        const jaTemVenda = s0.vendas.some((v) => v.veiculo_id === veiculoId)
        const novaVenda = jaTemVenda
          ? null
          : vendaDeVeiculo(veiculo, valor, dataIso)

        await comPersistencia(
          async () => {
            await syncVeiculoUpdate(veiculoId, { status: 'vendido' })
            if (novaVenda) await syncVendaCreate(novaVenda)
          },
          () =>
            set((s) => {
              const vendas =
                novaVenda && !jaTemVenda
                  ? [novaVenda, ...s.vendas]
                  : s.vendas
              const veiculos = s.veiculos.map((v) =>
                v.id === veiculoId
                  ? { ...v, status: 'vendido' as StatusVeiculo }
                  : v,
              )
              return { vendas, veiculos }
            }),
        )
      },

      // ------- Compras -------
      addCompra: async (compra) => {
        await comPersistencia(
          () => syncCompraCreate(compra),
          () => set((s) => ({ compras: [compra, ...s.compras] })),
        )
      },
      updateCompra: async (id, patch) => {
        await comPersistencia(
          () => syncCompraUpdate(id, patch),
          () =>
            set((s) => ({
              compras: s.compras.map((c) =>
                c.id === id ? { ...c, ...patch } : c,
              ),
            })),
        )
      },
      deleteCompra: async (id) => {
        await comPersistencia(
          () => syncCompraDelete(id),
          () =>
            set((s) => ({
              compras: s.compras.filter((c) => c.id !== id),
            })),
        )
      },

      // ------- Vendas -------
      addVenda: async (venda) => {
        await comPersistencia(
          async () => {
            await syncVendaCreate(venda)
            await syncVeiculoUpdate(venda.veiculo_id, { status: 'vendido' })
          },
          () =>
            set((s) => {
              const vendas = [venda, ...s.vendas]
              const veiculos = s.veiculos.map((v) =>
                v.id === venda.veiculo_id
                  ? { ...v, status: 'vendido' as StatusVeiculo }
                  : v,
              )
              return { vendas, veiculos }
            }),
        )
      },

      updateVenda: async (id, patch) => {
        const s0 = get()
        const atual = s0.vendas.find((v) => v.id === id)
        if (!atual) return

        const atualizada: Venda = { ...atual, ...patch }
        const veiculoAnterior =
          atual.veiculo_id !== atualizada.veiculo_id
            ? atual.veiculo_id
            : undefined
        const veiculoNovo =
          atual.veiculo_id !== atualizada.veiculo_id
            ? atualizada.veiculo_id
            : undefined

        await comPersistencia(
          async () => {
            await syncVendaUpdate(id, patch)
            if (veiculoAnterior && veiculoNovo) {
              await syncVeiculoUpdate(veiculoAnterior, { status: 'disponível' })
              await syncVeiculoUpdate(veiculoNovo, { status: 'vendido' })
            } else if (patch.veiculo_id) {
              await syncVeiculoUpdate(patch.veiculo_id, { status: 'vendido' })
            }
          },
          () =>
            set((s) => {
              const vendas = s.vendas.map((v) => (v.id === id ? atualizada : v))
              let veiculos = s.veiculos
              if (veiculoAnterior && veiculoNovo) {
                veiculos = s.veiculos.map((v) => {
                  if (v.id === veiculoAnterior) {
                    return { ...v, status: 'disponível' as StatusVeiculo }
                  }
                  if (v.id === veiculoNovo) {
                    return { ...v, status: 'vendido' as StatusVeiculo }
                  }
                  return v
                })
              } else {
                veiculos = s.veiculos.map((v) =>
                  v.id === atualizada.veiculo_id && v.status !== 'vendido'
                    ? { ...v, status: 'vendido' as StatusVeiculo }
                    : v,
                )
              }
              return { vendas, veiculos }
            }),
        )
      },

      deleteVenda: async (id) => {
        const alvo = get().vendas.find((v) => v.id === id)
        if (!alvo) return
        const veiculoId = alvo.veiculo_id

        await comPersistencia(
          async () => {
            await syncVendaDelete(id)
            await syncVeiculoUpdate(veiculoId, { status: 'disponível' })
          },
          () =>
            set((s) => ({
              vendas: s.vendas.filter((v) => v.id !== id),
              veiculos: s.veiculos.map((v) =>
                v.id === veiculoId
                  ? { ...v, status: 'disponível' as StatusVeiculo }
                  : v,
              ),
            })),
        )
      },

      // ------- Despesas -------
      addDespesa: async (despesa) => {
        await comPersistencia(
          () => syncDespesaCreate(despesa),
          () =>
            set((s) => {
              const despesas = [despesa, ...s.despesas]
              const veiculos = despesa.veiculo_id
                ? s.veiculos.map((v) =>
                    v.id === despesa.veiculo_id &&
                    !v.despesas_vinculadas.includes(despesa.id)
                      ? {
                          ...v,
                          despesas_vinculadas: [
                            ...v.despesas_vinculadas,
                            despesa.id,
                          ],
                        }
                      : v,
                  )
                : s.veiculos
              return { despesas, veiculos }
            }),
        )
      },

      updateDespesa: async (id, patch) => {
        const s0 = get()
        const atual = s0.despesas.find((d) => d.id === id)
        if (!atual) return
        const atualizada: Despesa = { ...atual, ...patch }

        await comPersistencia(
          async () => {
            await syncDespesaUpdate(id, patch)
            if (patch.veiculo_id !== undefined) {
              const veiculo = get().veiculos.find(
                (v) => v.id === patch.veiculo_id,
              )
              if (veiculo) {
                await syncVeiculoUpdate(veiculo.id, {
                  despesas_vinculadas: veiculo.despesas_vinculadas,
                })
              }
            }
          },
          () =>
            set((s) => {
              const despesas = s.despesas.map((d) =>
                d.id === id ? atualizada : d,
              )
              let veiculos = s.veiculos
              if (atual.veiculo_id !== atualizada.veiculo_id) {
                veiculos = s.veiculos.map((v) => {
                  if (v.id === atual.veiculo_id) {
                    return {
                      ...v,
                      despesas_vinculadas: v.despesas_vinculadas.filter(
                        (dId) => dId !== id,
                      ),
                    }
                  }
                  if (
                    v.id === atualizada.veiculo_id &&
                    !v.despesas_vinculadas.includes(id)
                  ) {
                    return {
                      ...v,
                      despesas_vinculadas: [...v.despesas_vinculadas, id],
                    }
                  }
                  return v
                })
              }
              return { despesas, veiculos }
            }),
        )
      },

      confirmarDevolucaoPessoalVeiculo: async (veiculoId) => {
        const s0 = get()
        const dono = nomeDonoCompleto(s0.configuracoes.socios)
        const capitalInicial = s0.configuracoes.capital_inicial_pessoal
        const carros = carrosFromSistema(
          s0.veiculos,
          s0.despesas,
          s0.vendas,
          capitalInicial,
          {
            nomeRevenda: s0.configuracoes.nome_revenda,
            socios: s0.configuracoes.socios,
          },
        )
        const { veiculo, despesas: despPatches } = patchesDevolucaoPessoalVeiculo(
          veiculoId,
          s0.veiculos,
          s0.despesas,
          carros,
          dono,
        )
        await get().updateVeiculo(veiculoId, veiculo)
        for (const d of despPatches) {
          await get().updateDespesa(d.id, d.patch)
        }
      },

      resetTodasDevolucoesPessoais: async () => {
        const s0 = get()
        await comPersistencia(
          async () => {
            for (const v of s0.veiculos) {
              if (
                v.compra_pessoal_reembolsada ||
                v.investimento_pessoal_devolvido
              ) {
                await syncVeiculoUpdate(v.id, {
                  compra_pessoal_reembolsada: false,
                  investimento_pessoal_devolvido: false,
                })
              }
            }
            for (const d of s0.despesas) {
              if (d.reembolsado) {
                await syncDespesaUpdate(d.id, { reembolsado: false })
              }
            }
          },
          () =>
            set((s) => ({
              veiculos: s.veiculos.map((v) => ({
                ...v,
                compra_pessoal_reembolsada: false,
                investimento_pessoal_devolvido: false,
              })),
              despesas: s.despesas.map((d) => ({
                ...d,
                reembolsado: false,
              })),
            })),
        )
      },

      deleteDespesa: async (id) => {
        const alvo = get().despesas.find((d) => d.id === id)
        if (!alvo) return
        const veiculoId = alvo.veiculo_id

        await comPersistencia(
          () => syncDespesaDelete(id),
          () =>
            set((s) => ({
              despesas: s.despesas.filter((d) => d.id !== id),
              veiculos: veiculoId
                ? s.veiculos.map((v) =>
                    v.id === veiculoId
                      ? {
                          ...v,
                          despesas_vinculadas: v.despesas_vinculadas.filter(
                            (dId) => dId !== id,
                          ),
                        }
                      : v,
                  )
                : s.veiculos,
            })),
        )
      },

      toggleDespesaPaga: async (id) => {
        const atual = get().despesas.find((d) => d.id === id)
        if (!atual) return
        const pago = !atual.pago
        await comPersistencia(
          () => syncDespesaUpdate(id, { pago }),
          () =>
            set((s) => ({
              despesas: s.despesas.map((d) =>
                d.id === id ? { ...d, pago } : d,
              ),
            })),
        )
      },

      addSimulacao: async (simulacao) => {
        await comPersistencia(
          () => syncSimulacaoCreate(simulacao),
          () =>
            set((s) => ({
              simulacoes: [simulacao, ...s.simulacoes],
            })),
        )
      },

      deleteSimulacao: async (id) => {
        await comPersistencia(
          () => syncSimulacaoDelete(id),
          () =>
            set((s) => ({
              simulacoes: s.simulacoes.filter((x) => x.id !== id),
            })),
        )
      },
    }),
    {
      name: PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tema: state.tema,
        sidebarColapsada: state.sidebarColapsada,
      }),
      version: 1,
    },
  ),
)
