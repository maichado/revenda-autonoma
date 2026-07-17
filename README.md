# RVD Autônoma

Sistema completo e **configurável** de gestão para **revenda de veículos usados**: estoque, compras, vendas, despesas, banco pessoal dos sócios, relatórios (WhatsApp/PDF) e dashboard financeiro.

O **nome da loja**, **sócios** e **meta de lucro** são definidos em **Configurações** — nada fica preso a uma marca fixa. O padrão de fábrica é **RVD Autônoma**.

Roda **no seu PC** com frontend React e backend **PocketBase** local (gratuito, open source). Cada conta tem seus dados isolados (**multi-tenant**); o navegador guarda só preferências de interface e sessão de login.

**Repositório:** [github.com/maichado/revenda-autonoma](https://github.com/maichado/revenda-autonoma)  
**Branch de desenvolvimento:** `rvd-autonoma`

> Guia rápido só de inicialização (local e ngrok): **[COMO-INICIAR.txt](COMO-INICIAR.txt)**

---

## Índice

1. [Início rápido](#início-rápido)
2. [Funcionalidades](#funcionalidades)
3. [Tecnologias](#tecnologias)
4. [Arquitetura](#arquitetura)
5. [Contas e isolamento (multi-tenant)](#contas-e-isolamento-multi-tenant)
6. [Segurança — o que NÃO vai para o Git](#segurança--o-que-não-vai-para-o-git)
7. [Pré-requisitos](#pré-requisitos)
8. [Primeira instalação (clone)](#primeira-instalação-clone)
9. [Uso diário — local](#uso-diário--local)
10. [Dev remoto — ngrok](#dev-remoto--ngrok)
11. [Servidor PocketBase](#servidor-pocketbase)
12. [Usuários e login](#usuários-e-login)
13. [Scripts úteis](#scripts-úteis)
14. [Problemas comuns](#problemas-comuns)
15. [Estrutura do código](#estrutura-do-código)
16. [Personalização](#personalização)

---

## Início rápido

### Já instalou antes? Só subir local

```powershell
cd revenda-autonoma

# Terminal 1 — backend
.\scripts\start-pocketbase.ps1

# Terminal 2 — frontend
npm run dev
```

| O quê | URL |
|-------|-----|
| App | http://localhost:5173 |
| PocketBase (API) | http://127.0.0.1:8090 |
| Admin PocketBase | http://127.0.0.1:8090/_/ |

**Atalho:** duplo clique em `Iniciar-RVD-Autonoma.bat` ou `npm run start:dev` (PocketBase + Vite juntos).

### Compartilhar com alguém remoto (ngrok)

```powershell
# Terminal 1
.\scripts\start-pocketbase.ps1

# Terminal 2
npm run dev:ngrok
```

Envie o link `https://....ngrok-free.app` que aparece no terminal (também salvo em `ngrok-url.txt`). Detalhes na seção [Dev remoto — ngrok](#dev-remoto--ngrok).

---

## Funcionalidades

| Módulo | O que faz |
|--------|-----------|
| **Dashboard** | KPIs do mês, meta de lucro, gráficos, veículos com tempo no estoque (foto + dias) |
| **Veículos** | Estoque, fotos, status (em preparação, disponível, reservado, vendido), data do anúncio |
| **Compras / Vendas** | Histórico financeiro por veículo |
| **Despesas** | Por veículo ou gerais; origem caixa da revenda ou pessoal; quem pagou |
| **Banco Pessoal** | Pool dos sócios, caixa da revenda, carros pessoais e lançamentos de dinheiro |
| **Configurações** | Nome da revenda, sócios, meta, backup/importação |
| **Relatórios** | Geral, por módulo ou por veículo; compartilhar via WhatsApp; PDF |
| **Login** | Entrar ou **Criar conta** — cada conta nova começa com dados vazios e isolados |

---

## Tecnologias

| Camada | Stack |
|--------|--------|
| **Frontend** | React 18, TypeScript, Vite 5 |
| **Estilo** | Tailwind CSS (dark/light) |
| **Estado** | Zustand + sincronização com API |
| **Roteamento** | React Router v6 |
| **Gráficos** | Recharts |
| **Datas** | date-fns |
| **Ícones** | Lucide React |
| **Backend** | [PocketBase](https://pocketbase.io) 0.25.x (SQLite local) |
| **Scripts** | PowerShell + Node.js (setup, schema, seed, migração) |

---

## Arquitetura

```
Seu computador
├── revenda-autonoma/        ← clone do Git (produto: RVD Autônoma)
│   ├── src/                 ← código React
│   ├── pocketbase/
│   │   └── pb_schema.json   ← estrutura das collections (versionada)
│   └── scripts/             ← iniciar PB, schema, seed, ngrok
│
└── rvd-autonoma-pb/         ← criada automaticamente (NÃO vai pro Git)
    ├── pocketbase.exe
    └── pb_data/             ← banco SQLite com seus dados reais
```

**Fluxo local:** o navegador (`npm run dev` → porta **5173**) fala com o PocketBase (**8090**). Cada alteração (veículo, despesa, etc.) é salva no servidor **antes** de atualizar a tela.

**Fluxo ngrok:** o Vite expõe a porta 5173 na internet e **repassa** `/api` e `/_/` para o PocketBase local. O dev remoto usa **um único link** — não precisa instalar PocketBase.

---

## Contas e isolamento (multi-tenant)

Cada registro de negócio tem um campo `tenant`. Regras do PocketBase garantem que um usuário só vê dados do próprio tenant.

| Tipo de conta | Tenant | Dados |
|---------------|--------|-------|
| **Equipe principal** (seed: admin, adminmaicon, cristiano) | `rvd-autonoma-principal` | Compartilhados entre esses usuários |
| **Conta nova** (Criar conta no login) | `id` do próprio usuário | Totalmente isolada — estoque vazio, config própria |

Contas legadas criadas antes do multi-tenant podem ser migradas com:

```powershell
. .\scripts\load-pb-secrets.ps1
node .\scripts\migrar-tenant.js
```

---

## Segurança — o que NÃO vai para o Git

Estes arquivos/pastas estão no `.gitignore` e **nunca devem ser commitados**:

| Item | Motivo |
|------|--------|
| `.env`, `.env.pb.local`, `.env.ngrok.local` | URLs e credenciais |
| `ngrok.yml`, `ngrok-url.txt`, `pocketbase-url.txt` | Token ngrok e links temporários de túnel |
| `rvd-autonoma-pb/` | Banco com veículos, valores, clientes |
| `node_modules/`, `dist/`, `.tools/` | Gerados ou baixados localmente |
| `scripts/secrets.ps1` | Segredos locais opcionais |

**Antes de cada commit:**

```powershell
git status
```

Se aparecer `.env`, `.env.pb.local` ou pasta `pb_data`, **não faça commit**.

Use sempre os exemplos versionados:

```powershell
copy .env.example .env
copy .env.pb.local.example .env.pb.local
# Edite .env.pb.local só na sua máquina
```

> O script `seed-pocketbase.js` cria usuários **padrão de desenvolvimento**. Troque as senhas no painel admin após o primeiro acesso. Em produção, use senhas fortes e exclusivas.

---

## Pré-requisitos

- **Windows 10/11** (scripts em PowerShell)
- **Node.js** 20 LTS ou superior — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- Conexão com internet (1ª vez: baixar PocketBase; ngrok: authtoken)
- **ngrok** (opcional, só para dev remoto) — [ngrok.com/download](https://ngrok.com/download)

---

## Primeira instalação (clone)

### 1. Clonar

```powershell
cd C:\Users\SEU_USUARIO\Documentos
git clone https://github.com/maichado/revenda-autonoma.git
cd revenda-autonoma
git checkout rvd-autonoma   # branch com as últimas features
```

### 2. Dependências

```powershell
npm install
```

### 3. Segredos locais

```powershell
copy .env.example .env
copy .env.pb.local.example .env.pb.local
```

Edite `.env.pb.local` com e-mail e senha do **superuser** PocketBase (admin do servidor).

### 4. Setup completo (primeira vez)

```powershell
.\scripts\iniciar-rvd-autonoma.ps1
```

O script:

1. Baixa `pocketbase.exe` na pasta irmã `rvd-autonoma-pb`
2. Inicia o servidor na porta **8090**
3. Na **primeira vez**, abre o painel admin — **crie o superuser** (mesmo e-mail/senha do `.env.pb.local`)
4. Importa o schema (`pb_schema.json`)
5. Cria usuários iniciais e configurações padrão

### 5. Frontend (se não usou `-Dev`)

```powershell
npm run dev
```

Abra **http://localhost:5173**

### 6. Primeiro login

| E-mail | Senha (dev) | Observação |
|--------|-------------|------------|
| `admin@revenda.local` | `RevendaAutonoma2024!` | Admin geral |
| `adminmaicon@revenda.local` | `adminmaicon` | Tenant compartilhado da equipe |
| `cristiano@cristiano.com` | `cristiano` | Tenant compartilhado da equipe |

Altere senhas em **Collections → users** no painel admin (`http://127.0.0.1:8090/_/`).

---

## Uso diário — local

**Opção A — dois terminais (recomendado para dev):**

```powershell
# Terminal 1
.\scripts\start-pocketbase.ps1

# Terminal 2
npm run dev
```

**Opção B — atalho:**

- Duplo clique em `Iniciar-RVD-Autonoma.bat`, ou
- `npm run start:dev` (PocketBase + Vite com hot reload)

| Serviço | URL |
|---------|-----|
| App | http://localhost:5173 |
| PocketBase API | http://127.0.0.1:8090 |
| Painel admin PB | http://127.0.0.1:8090/_/ |

### Build de produção (opcional)

```powershell
npm run build
npm run preview
```

Abre em http://localhost:4173 (PocketBase continua obrigatório no mesmo PC).

---

## Dev remoto — ngrok

Permite que alguém **fora da sua rede** use o sistema pelo navegador, apontando para o PocketBase que roda no **seu** PC.

### Como funciona

1. PocketBase fica em `127.0.0.1:8090` (só local).
2. Vite sobe na porta `5173` com proxy: `/api` e `/_/` → PocketBase.
3. ngrok expõe a porta `5173` com URL pública HTTPS.
4. O app detecta `VITE_PB_VIA_PROXY=true` e usa a origem do link ngrok para falar com a API.

**Resultado:** um link só — app + login + API — sem expor PocketBase diretamente.

### Pré-requisitos (uma vez)

1. Instale o ngrok: [ngrok.com/download](https://ngrok.com/download)
2. Crie conta e pegue o authtoken: [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken)

```powershell
ngrok config add-authtoken SEU_TOKEN
```

Opcional (config versionada como exemplo):

```powershell
copy ngrok.yml.example ngrok.yml
# Edite authtoken em ngrok.yml (ngrok.yml NÃO vai pro Git)
```

### Subir para compartilhar

```powershell
cd revenda-autonoma

# Terminal 1 — PocketBase (obrigatório)
.\scripts\start-pocketbase.ps1

# Terminal 2 — túnel + frontend
npm run dev:ngrok
```

O terminal mostra algo como:

```
Link para o dev remoto (app + API via proxy):
  https://xxxx.ngrok-free.app
```

A URL também é gravada em **`ngrok-url.txt`** (gitignored).

### Quem faz o quê

| Papel | Ação |
|-------|------|
| **Você (host)** | PC ligado; PocketBase + `npm run dev:ngrok` rodando |
| **Dev remoto** | Abre o link no navegador; faz login; usa o **mesmo banco** do seu PC |

### Ferramentas úteis

| Ferramenta | URL |
|------------|-----|
| Inspector ngrok (ver requisições) | http://127.0.0.1:4040 |
| Health PocketBase | http://127.0.0.1:8090/api/health |

### Encerrar

- `Ctrl+C` no terminal do `npm run dev:ngrok` (para Vite e ngrok juntos).
- Feche o terminal do PocketBase se não for mais usar.

### Alternativa sem ngrok (Cloudflare Tunnel)

Se não quiser configurar ngrok, dá para usar Cloudflare Quick Tunnel (link **temporário**, muda ao reiniciar):

```powershell
# Com Vite rodando (npm run dev) e VITE_PB_VIA_PROXY=true
npx cloudflared tunnel --url http://127.0.0.1:5173
```

Para expor só o admin PocketBase (não recomendado em produção):

```powershell
npx cloudflared tunnel --url http://127.0.0.1:8090
```

Links temporários locais ficam em `ngrok-url.txt` / `pocketbase-url.txt` — **não commitar**.

---

## Servidor PocketBase

### O que é

Banco + API + autenticação em um único executável. Dados em `../rvd-autonoma-pb/pb_data/` (SQLite).

### Collections principais

| Collection | Conteúdo |
|------------|----------|
| `users` | Login do app (auth) + campo `tenant` |
| `veiculos` | Estoque, fotos, status, `data_anuncio` |
| `compras` / `vendas` / `despesas` | Movimentações |
| `configuracoes` | Nome da revenda, sócios, metas |
| `simulacoes` | Simulador de negócio |
| `bp_carros` / `bp_lancamentos` | Banco pessoal — carros e lançamentos |

Schema versionado em `pocketbase/pb_schema.json`. Detalhes: [pocketbase/README.md](pocketbase/README.md).

### Atualizar schema (novos campos)

Com PocketBase rodando e `.env.pb.local` configurado:

```powershell
.\scripts\atualizar-schema.ps1
```

### Reset total (apaga todos os dados)

```powershell
.\scripts\iniciar-rvd-autonoma.ps1 -Reset
```

Faz backup de `pb_data` com timestamp antes de apagar.

---

## Usuários e login

### Criar conta pelo app (recomendado para clientes novos)

1. Abra http://localhost:5173 (ou link ngrok)
2. Aba **Criar conta** → nome, e-mail, senha
3. A conta recebe tenant próprio — **não vê** dados da equipe principal

### Usuário da equipe (admin PocketBase)

1. PocketBase rodando → http://127.0.0.1:8090/_/
2. Login com **superuser** (`.env.pb.local`)
3. **Collections** → **users** → **New record**
4. Preencha e-mail, senha, nome; defina `tenant = rvd-autonoma-principal` para compartilhar dados da equipe

### Sócios vs usuários de login

**Sócios** (nomes em relatórios e divisão de lucro) são editados em **Configurações** dentro do app — não confundir com login do PocketBase.

---

## Scripts úteis

| Script / comando | Função |
|------------------|--------|
| `iniciar-rvd-autonoma.ps1` | Setup completo + inicia PB (`-Dev`, `-Reset`) |
| `start-pocketbase.ps1` | Só o servidor PocketBase |
| `setup-pocketbase.ps1` | Schema + usuários seed |
| `atualizar-schema.ps1` | Reimporta `pb_schema.json` |
| `reset-pocketbase.ps1` | Apaga dados (com confirmação) |
| `iniciar-dev-ngrok.ps1` / `npm run dev:ngrok` | Túnel ngrok + Vite com proxy |
| `migrar-tenant.js` | Migra dados legados para tenant principal |
| `seed-pocketbase.js` | Usuários + config inicial |
| `npm run start:dev` | Atalho: PB + Vite dev |

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| **Servidor desconectado** no app | `.\scripts\start-pocketbase.ps1` |
| **Missing collection** | `.\scripts\setup-pocketbase.ps1` ou `atualizar-schema.ps1` |
| Dados sumiram após F5 / tenant | Rode `migrar-tenant.js`; confira campo `tenant` do usuário |
| Configurações não persistem | Confira PB online; usuário com tenant correto |
| Porta **8090** ocupada | PocketBase já está rodando |
| Porta **5173** ocupada | Feche outro `npm run dev` |
| Login falha | PB online? Usuário existe em **users**? |
| **ngrok não encontrado** | Instale e adicione ao PATH, ou use `ngrok config add-authtoken` |
| Link ngrok não abre API | Use `npm run dev:ngrok` (não só `ngrok http 8090`) |
| **Falha ao salvar** | PB offline ou sessão expirada — login de novo |

---

## Estrutura do código

```
src/
├── pages/           # Telas (Dashboard, Veículos, Banco Pessoal, …)
├── components/      # UI reutilizável
├── store/           # Zustand + ações sync PB
├── lib/             # pocketbase.ts, pbApi, pbTenant, mappers
├── contexts/        # Auth (login + registro)
├── constants/       # TENANT_PRINCIPAL, etc.
├── utils/           # Cálculos, relatórios, banco pessoal
└── types/           # TypeScript
```

---

## Personalização

| Campo | Onde aparece |
|-------|----------------|
| **Nome da revenda** | Header, sidebar, login, relatórios, PDF, WhatsApp, título do navegador |
| **Caixa da loja (Despesas)** | Aparece como **Caixa {nome}** em “Quem pagou” |
| **Sócios** | Despesas, banco pessoal, divisão de lucro, relatórios |
| **Meta de lucro** | Dashboard |
| **Logo** | `public/logo-revenda.svg` (preferido) ou `logo-revenda.png` |

Nomes legados (`MG Revenda`, `GM Revenda`, `Revenda Autônoma`) são normalizados para **RVD Autônoma** ao importar backup.

---

## Licença e uso

Projeto para gestão autônoma de revenda de veículos. Uso interno. Não commitar dados de clientes, placas reais ou credenciais de produção.
