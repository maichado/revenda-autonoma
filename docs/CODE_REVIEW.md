# Code review — sustentabilidade (Etapa 2)

Escopo: `gm-revenda/` (React + Zustand + PocketBase). Data de referência: 2026-08-04.

## Crítico

| Item | Onde | Notas |
|------|------|-------|
| Escalação de tenant via `users.update` | `pocketbase/pb_schema.json` | **Corrigido:** update não pode mudar `tenant` já definido; create não aceita tenant preenchido. Reimportar schema. |
| Import wipe sem filtro de tenant no client | `src/lib/pbApi.ts` `importarParaPb` | **Corrigido:** usa `filtroTenant()`. Continua dependendo das API rules. |
| Senhas seed fracas no repositório | `scripts/seed-pocketbase.js`, README | Trocar no admin após setup; não usar em túnel público sem rotação. |
| Módulos “god” | `utils/bancoPessoal.ts` (~2800), `pages/BancoPessoal.tsx` (~1700) | Dividir em fases futuras (sem mudar regra de negócio). |
| Sync update = getOne + full document | `pbApi.ts` sync*Update | Dobra RTT; risco de race em edição concorrente. |

## Importante

| Item | Onde | Status |
|------|------|--------|
| `useDebounce` duplicado 4× | pages CRUD | **Corrigido** → `hooks/useDebounce.ts` |
| `vite.config.js` + `.ts` | raiz | **Corrigido** — só `.ts` |
| `Placeholder.tsx` / `runPbSync` mortos | pages / pbSyncBridge | **Removidos** |
| Comentários stale no store | `useStore.ts` | **Atualizados** |
| `updateDespesa` vínculos PB desatualizados | `useStore.ts` | **Corrigido** (calcula a partir do snapshot pré-mutação) |
| `fetchAllData` sem filtro client | `pbApi.ts` | **Corrigido** — `filtroTenant()` |
| Header selector duplicado `nome` | `Header.tsx` | **Corrigido** |
| Collections `bp_*` sem uso no frontend | schema vs `bancoPessoal` | Documentado no README; decidir migrar ou remover no schema |
| `pbApi` ↔ store (`EstadoImportavel`) | acoplamento | Pendente: mover tipo para `types/` |
| Form `Campo` duplicado | *FormModal | Pendente (extração) |
| Sem ESLint / testes npm | package.json | Pendente |
| Cadastro aberto + ngrok | Login / Auth | Intencional para clientes; documentar risco de exposição |

## Nice-to-have

| Item | Notas |
|------|-------|
| Tipagem Recharts (`any`) | Concentrada em tooltips |
| Aliases `@deprecated` em bancoPessoal | Manter até migrar call sites |
| `confirmarDevolucaoPessoalVeiculo` sem UI | Mantido na store (API útil); fluxos atuais usam patch pontual |
| Split `calculos.ts` / `VeiculoFormModal` | Próximas fases |
| Fotos base64 → file fields PB | Mudança maior de schema/import |

## Fases futuras sugeridas (não executadas)

1. Extrair `Campo` compartilhado dos FormModals.
2. Mover `EstadoImportavel` para `types/`.
3. Quebrar `bancoPessoal.ts` / `BancoPessoal.tsx` por domínio (funding, simulação, UI cards).
4. Patch parcial no PB (sem getOne + full update).
5. ESLint + Prettier + `npm test` com validadores de cenário.
6. Decisão explícita: remover ou passar a usar `bp_*`.
