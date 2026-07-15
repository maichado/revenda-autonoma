/** Sócios padrão — índice 0 = principal (Banco Pessoal). Personalize em Configurações. */
export const SOCIOS_PADRAO = ['Sócio principal', 'Sócio parceiro'] as const

export function normalizarNomeSocio(n: string): string {
  return n
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Garante sempre 2 sócios (usa padrão se faltar). */
export function normalizarListaSocios(
  socios?: string[] | null,
): [string, string] {
  const s0 = socios?.[0]?.trim() || SOCIOS_PADRAO[0]
  const s1 = socios?.[1]?.trim() || SOCIOS_PADRAO[1]
  return [s0, s1]
}

/** Lista para selects/datalists (sem nomes vazios). */
export function sociosAtivos(socios: string[]): string[] {
  return normalizarListaSocios(socios).filter(Boolean)
}

export function socioPrincipal(socios: string[]): string {
  return normalizarListaSocios(socios)[0]
}

export function socioParceiro(socios: string[]): string {
  return normalizarListaSocios(socios)[1]
}

export function primeiroNomeSocio(nome: string): string {
  const t = nome.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] || t
}

/** Verifica se `nome` corresponde a algum sócio cadastrado (match exato ou 1º nome). */
export function correspondeSocio(nome: string, socios: string[]): boolean {
  const alvo = normalizarNomeSocio(nome)
  if (!alvo) return false
  for (const s of sociosAtivos(socios)) {
    const cad = normalizarNomeSocio(s)
    if (alvo === cad) return true
    const priCad = cad.split(/\s+/)[0]
    const priAlvo = alvo.split(/\s+/)[0]
    if (priCad && priCad === priAlvo) return true
  }
  return false
}

/** Encontra o nome canônico do cadastro (para selects). */
export function resolverNomeSocio(
  nome: string,
  socios: string[],
): string | undefined {
  const alvo = normalizarNomeSocio(nome)
  if (!alvo) return undefined
  for (const s of sociosAtivos(socios)) {
    if (normalizarNomeSocio(s) === alvo) return s
  }
  for (const s of sociosAtivos(socios)) {
    const priCad = normalizarNomeSocio(s).split(/\s+/)[0]
    const priAlvo = alvo.split(/\s+/)[0]
    if (priCad && priCad === priAlvo) return s
  }
  return undefined
}

export function sociosFromFormulario(socio1: string, socio2: string): string[] {
  const [d0, d1] = SOCIOS_PADRAO
  return [socio1.trim() || d0, socio2.trim() || d1]
}
