import { carrosFromSistema, devolucoesPoolFromLancamentos, lancamentosFromSistema, simularPoolPessoal } from "./src/utils/bancoPessoal.ts"
const capital = 38000
const dono = "Maicon Machado"
const veiculos: any[] = [
  { id:"834gg33rs9xn53j", placa:"CXA6J23", marca:"Fiat", modelo:"Palio", ano:2000, cor:"", quilometragem:0, data_compra:"2026-06-18", valor_compra:6600, valor_venda_pretendido:12000, status:"vendido", tipo_propriedade:"meia", fotos:[], despesas_vinculadas:[], observacoes:"", compra_funding_manual:true, compra_funding_investimento:6600, compra_funding_revenda:0, compra_funding_pessoal:0, compra_funding_investimento_meia_socio:true },
  { id:"a14cgpla6draufc", placa:"MHQG64", marca:"VW", modelo:"Golf", ano:2010, cor:"", quilometragem:0, data_compra:"2026-06-24", valor_compra:43000, valor_venda_pretendido:50000, status:"vendido", tipo_propriedade:"solo", fotos:[], despesas_vinculadas:[], observacoes:"", compra_funding_manual:true, compra_funding_investimento:34700, compra_funding_revenda:0, compra_funding_pessoal:8300, compra_pessoal_reembolsada:true },
  { id:"eamzx6ydj78kc9o", placa:"AFX4631", marca:"VW", modelo:"Gol", ano:2003, cor:"", quilometragem:0, data_compra:"2026-07-14", valor_compra:10000, valor_venda_pretendido:12000, status:"disponível", tipo_propriedade:"meia", fotos:[], despesas_vinculadas:[], observacoes:"", compra_funding_manual:true, compra_funding_revenda:10000, compra_funding_investimento:0, compra_funding_pessoal:0, compra_funding_revenda_meia_socio:true },
  { id:"cxlbin9uwpnisvw", placa:"TESTE123", marca:"Fiat", modelo:"Uno", ano:2010, cor:"", quilometragem:0, data_compra:"2026-07-23", valor_compra:10000, valor_venda_pretendido:12000, status:"em preparação", tipo_propriedade:"meia", fotos:[], despesas_vinculadas:[], observacoes:"", compra_funding_manual:true, compra_funding_revenda:8000, compra_funding_investimento:2000, compra_funding_pessoal:0, compra_funding_revenda_meia_socio:true, compra_funding_investimento_meia_socio:false },
  { id:"deseptlx64cp8ps", placa:"JAP8C88", marca:"Peugeot", modelo:"2008", ano:2018, cor:"", quilometragem:0, data_compra:"2026-07-24", valor_compra:46000, valor_venda_pretendido:50000, status:"em preparação", tipo_propriedade:"solo", fotos:[], despesas_vinculadas:[], observacoes:"", compra_funding_manual:true, compra_funding_investimento:34400, compra_funding_revenda:0, compra_funding_pessoal:11600 },
]
const vendas: any[] = [
  { id:"v1", veiculo_id:"834gg33rs9xn53j", data:"2026-07-10", valor_venda:12000, comprador_nome:"", comprador_contato:"", forma_recebimento:"pix", observacoes:"" },
  { id:"v2", veiculo_id:"a14cgpla6draufc", data:"2026-07-23", valor_venda:50000, comprador_nome:"", comprador_contato:"", forma_recebimento:"pix", observacoes:"" },
]
const despesas: any[] = [
  { id:"d1", descricao:"Consulta", valor:32, data:"2026-06-23", pago_por:dono, reembolsado:true, veiculo_id:"834gg33rs9xn53j", tipo:"outros" },
  { id:"d2", descricao:"Transf", valor:183.9, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"834gg33rs9xn53j", tipo:"outros" },
  { id:"d3", descricao:"Painel", valor:200, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d4", descricao:"Vistoria", valor:190, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d5", descricao:"Transf2", valor:183.9, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d6", descricao:"ConsultaG", valor:32, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d7", descricao:"Estetica", valor:450, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d8", descricao:"Vidro", valor:600, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d9", descricao:"FB", valor:57, data:"2026-07-06", pago_por:dono, reembolsado:true, veiculo_id:"834gg33rs9xn53j", tipo:"outros" },
  { id:"d10", descricao:"Costura", valor:180, data:"2026-07-08", pago_por:dono, reembolsado:true, veiculo_id:"834gg33rs9xn53j", tipo:"outros" },
  { id:"d11", descricao:"FBAD", valor:39.35, data:"2026-07-13", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d12", descricao:"ADDFB", valor:1.98, data:"2026-07-15", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
  { id:"d13", descricao:"Gas", valor:150, data:"2026-07-20", pago_por:dono, reembolsado:true, veiculo_id:"a14cgpla6draufc", tipo:"outros" },
]
const socios = [dono, "Gustavo"]
const base = { despesas, nomeRevenda:"MG", socios }
const lanc = lancamentosFromSistema(despesas, veiculos as any, dono, capital, vendas as any, base)
const op = { ...base, devolucoes: devolucoesPoolFromLancamentos(lanc, vendas as any) }
const s = simularPoolPessoal(veiculos as any, vendas as any, capital, op)
const carros = carrosFromSistema(veiculos as any, despesas as any, vendas as any, capital, op, s)
const uno = carros.find(c => c.placa==="TESTE123")
const peu = carros.find(c => c.placa==="JAP8C88")
console.log(JSON.stringify({
  caixaInvestimento: s.saldoFinal,
  caixaRevenda: s.saldoRevendaFinal,
  aDevolver: lanc.filter(l=>l.status==="a_devolver").reduce((a,l)=>a+l.valor,0),
  uno: { revenda: uno?.do_revenda, investimento: uno?.do_investimento, bolso: uno?.extrapessoal_compra, revSocio: uno?.do_revenda_socio },
  peugeot: { investimento: peu?.do_investimento, bolso: peu?.extrapessoal_compra },
}, null, 2))
