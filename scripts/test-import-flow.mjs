/**
 * Testa importação completa com estrutura do backup do usuário (CXA6J23).
 * Uso: node scripts/test-import-flow.mjs
 */
import PocketBase from 'pocketbase'

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090'
const EMAIL = process.env.PB_APP_EMAIL || 'admin@revenda.local'
const PASSWORD = process.env.PB_APP_PASSWORD || 'RevendaAutonoma2024!'

const FOTO_GRANDE = 'data:image/jpeg;base64,' + 'A'.repeat(2_500_000)

const estado = {
  veiculos: [
    {
      id: 'veic-cxa6j23',
      placa: 'CXA6J23',
      marca: 'Chevrolet',
      modelo: 'Onix LT',
      ano: 2019,
      cor: 'Prata',
      quilometragem: 62000,
      data_compra: '2025-03-15T00:00:00.000Z',
      valor_compra: 42000,
      valor_fipe: 48000,
      valor_venda_pretendido: 52000,
      status: 'disponível',
      observacoes: 'Veículo de teste backup',
      fotos: [FOTO_GRANDE, FOTO_GRANDE],
      despesas_vinculadas: ['desp-001'],
    },
    {
      id: 'veic-outro',
      placa: 'ABC1D23',
      marca: 'Fiat',
      modelo: 'Argo',
      ano: 2020,
      cor: 'Branco',
      quilometragem: 30000,
      data_compra: '2025-02-01',
      valor_compra: 55000,
      valor_venda_pretendido: 60000,
      status: 'disponivel',
      observacoes: '',
      fotos: [],
      despesas_vinculadas: [],
    },
  ],
  compras: [
    {
      id: 'comp-001',
      data: '2025-03-15',
      veiculo_id: 'veic-cxa6j23',
      valor_pago: 42000,
      forma_pagamento: 'pix',
      vendedor_nome: 'João',
      vendedor_contato: '',
      origem: 'particular',
      observacoes: '',
    },
    {
      id: 'comp-002',
      data: '2025-02-01',
      veiculo_id: 'veic-outro',
      valor_pago: 55000,
      forma_pagamento: 'pix',
      vendedor_nome: 'Maria',
      vendedor_contato: '',
      origem: 'loja',
      observacoes: '',
    },
  ],
  vendas: [],
  despesas: [
    {
      id: 'desp-001',
      data: '2025-03-20',
      tipo: 'manutencao',
      descricao: 'Revisão',
      valor: 800,
      veiculo_id: 'veic-cxa6j23',
      pago: true,
      forma_pagamento: 'pix',
      pago_por: 'Maicon',
    },
    {
      id: 'desp-002',
      data: '2025-03-22',
      tipo: 'documentação',
      descricao: 'Transferência',
      valor: 350,
      veiculo_id: 'veic-cxa6j23',
      pago: true,
      forma_pagamento: 'pix',
      pago_por: 'Maicon',
    },
    {
      id: 'desp-003',
      data: '2025-04-01',
      tipo: 'marketing',
      descricao: 'Anúncio OLX',
      valor: 120,
      pago: true,
      forma_pagamento: 'pix',
      pago_por: 'Caixa',
    },
  ],
  configuracoes: {
    nome_revenda: 'RVD Autônoma',
    socios: ['Maicon Machado'],
    meta_lucro_mensal: 5000,
  },
}

// Inline minimal prep (mirrors src/lib/pbImportPrep.ts)
function normalizarDataPb(valor) {
  const bruto = String(valor ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(bruto)) return bruto.slice(0, 10)
  const parsed = new Date(bruto)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return bruto.slice(0, 10)
}

const STATUS = {
  disponível: 'disponível',
  disponivel: 'disponível',
  reservado: 'reservado',
  vendido: 'vendido',
}

function prepareVeiculo(v) {
  return {
    placa: String(v.placa).trim(),
    marca: v.marca,
    modelo: v.modelo,
    ano: Math.round(Number(v.ano)),
    cor: v.cor ?? '',
    quilometragem: Math.round(Number(v.quilometragem ?? 0)),
    data_compra: normalizarDataPb(v.data_compra),
    valor_compra: Number(v.valor_compra),
    valor_fipe: v.valor_fipe ?? null,
    valor_venda_pretendido: Number(v.valor_venda_pretendido ?? 0),
    status: STATUS[String(v.status).toLowerCase()] ?? 'disponível',
    observacoes: v.observacoes ?? '',
    fotos: [],
    despesas_vinculadas: [],
  }
}

async function limparColecao(pb, nome) {
  const items = await pb.collection(nome).getFullList({ fields: 'id' })
  for (const item of items) await pb.collection(nome).delete(item.id)
}

async function main() {
  const pb = new PocketBase(PB_URL)
  await pb.collection('users').authWithPassword(EMAIL, PASSWORD)

  for (const col of ['despesas', 'compras', 'vendas', 'veiculos']) {
    await limparColecao(pb, col)
  }

  const idMap = new Map()
  for (const v of estado.veiculos) {
    const created = await pb.collection('veiculos').create(prepareVeiculo(v))
    idMap.set(v.id, created.id)
    console.log(`✓ veículo ${v.placa} → ${created.id}`)
  }

  for (const c of estado.compras) {
    const created = await pb.collection('compras').create({
      data: normalizarDataPb(c.data),
      veiculo: idMap.get(c.veiculo_id),
      valor_pago: c.valor_pago,
      forma_pagamento: c.forma_pagamento,
      vendedor_nome: c.vendedor_nome,
      vendedor_contato: c.vendedor_contato,
      origem: c.origem,
      observacoes: c.observacoes,
    })
    idMap.set(c.id, created.id)
    console.log(`✓ compra ${c.id}`)
  }

  for (const d of estado.despesas) {
    const body = {
      data: normalizarDataPb(d.data),
      tipo: d.tipo === 'manutencao' ? 'manutenção' : d.tipo,
      descricao: d.descricao,
      valor: d.valor,
      pago: d.pago,
      forma_pagamento: d.forma_pagamento,
      pago_por: d.pago_por,
    }
    if (d.veiculo_id) body.veiculo = idMap.get(d.veiculo_id)
    const created = await pb.collection('despesas').create(body)
    idMap.set(d.id, created.id)
    console.log(`✓ despesa ${d.descricao}`)
  }

  const v0 = estado.veiculos[0]
  const pbId = idMap.get(v0.id)
  const despesasVinc = v0.despesas_vinculadas.map((id) => idMap.get(id))
  await pb.collection('veiculos').update(pbId, {
    despesas_vinculadas: despesasVinc,
  })
  console.log('✓ despesas vinculadas ao CXA6J23')

  const cfg = await pb
    .collection('configuracoes')
    .getList(1, 1, { filter: 'slug = "default"' })
  const cfgBody = {
    slug: 'default',
    nome_revenda: estado.configuracoes.nome_revenda,
    socios: estado.configuracoes.socios,
    meta_lucro_mensal: estado.configuracoes.meta_lucro_mensal,
  }
  if (cfg.items.length) {
    await pb.collection('configuracoes').update(cfg.items[0].id, cfgBody)
  } else {
    await pb.collection('configuracoes').create(cfgBody)
  }
  console.log('✓ configuracoes')

  console.log('\nImportação simulada OK (2 veículos, 2 compras, 3 despesas)')
}

main().catch((e) => {
  console.error('FALHA:', e.response ?? e.message ?? e)
  process.exit(1)
})
