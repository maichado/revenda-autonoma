# Revenda Autônoma (MG Revenda)

Sistema completo de gestão para **revenda de veículos usados**: estoque, compras, vendas, despesas, banco pessoal dos sócios, relatórios (com exportação WhatsApp/PDF) e dashboard financeiro.

Roda **no seu PC** com frontend React e backend **PocketBase** local (gratuito, open source). Os dados de negócio ficam no servidor PocketBase; o navegador guarda só preferências de interface e sessão de login.

---

## Índice

1. [Funcionalidades](#funcionalidades)
2. [Tecnologias](#tecnologias)
3. [Arquitetura](#arquitetura)
4. [Segurança — o que NÃO vai para o Git](#segurança--o-que-não-vai-para-o-git)
5. [Pré-requisitos](#pré-requisitos)
6. [Passo a passo — quem acabou de clonar o projeto](#passo-a-passo--quem-acabou-de-clonar-o-projeto)
7. [Uso diário](#uso-diário)
8. [Servidor PocketBase](#servidor-pocketbase)
9. [Novo usuário no sistema](#novo-usuário-no-sistema)
10. [Scripts úteis](#scripts-úteis)
11. [Publicar no GitHub (Git)](#publicar-no-github-git)
12. [Problemas comuns](#problemas-comuns)

---

## Funcionalidades

| Módulo | O que faz |
|--------|-----------|
| **Dashboard** | KPIs do mês, meta de lucro, gráficos, veículos com tempo no estoque (foto + dias) |
| **Veículos** | Estoque, fotos, status (em preparação, disponível, reservado, vendido), data do anúncio |
| **Compras / Vendas** | Histórico financeiro por veículo |
| **Despesas** | Por veículo ou gerais; origem caixa da revenda ou pessoal; quem pagou |
| **Banco Pessoal** | Pool dos sócios, caixa MG Revenda, carros e lançamentos pessoais |
| **Relatórios** | Geral, por módulo ou por veículo; compartilhar via WhatsApp; PDF |
| **Configurações** | Sócios, meta, backup/importação, nome da revenda |

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
| **Scripts** | PowerShell + Node.js (setup, schema, seed) |

---

## Arquitetura

```
Seu computador
├── gm-revenda/              ← este repositório (frontend + scripts + schema)
│   ├── src/                 ← código React
│   ├── pocketbase/
│   │   └── pb_schema.json   ← estrutura das collections (versionada)
│   └── scripts/             ← iniciar PB, importar schema, seed
│
└── gm-revenda-pb/           ← criada automaticamente (NÃO vai pro Git)
    ├── pocketbase.exe
    └── pb_data/             ← banco SQLite com seus dados reais
```

**Fluxo:** o navegador (`npm run dev` → porta **5173**) fala com o PocketBase (**8090**). Cada alteração (veículo, despesa, etc.) é salva no servidor **antes** de atualizar a tela.

---

## Segurança — o que NÃO vai para o Git

Estes arquivos/pastas estão no `.gitignore` e **nunca devem ser commitados**:

| Item | Motivo |
|------|--------|
| `.env` | URL customizada do servidor |
| `.env.pb.local` | **E-mail e senha do admin PocketBase** |
| `gm-revenda-pb/` | Banco com veículos, valores, clientes |
| `node_modules/`, `dist/` | Gerados localmente |
| `scripts/secrets.ps1` | Segredos locais opcionais |

**Antes de cada commit**, confira:

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

> O script `seed-pocketbase.js` cria um usuário **padrão de desenvolvimento** na primeira instalação. Troque a senha no painel admin após o primeiro acesso. Em produção, use senhas fortes e exclusivas.

---

## Pré-requisitos

- **Windows 10/11** (scripts em PowerShell)
- **Node.js** 20 LTS ou superior — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- Conexão com internet (só na 1ª vez, para baixar o PocketBase)

---

## Passo a passo — quem acabou de clonar o projeto

### 1. Clonar o repositório

```powershell
cd C:\Users\SEU_USUARIO\Documentos
git clone https://github.com/maichado/revenda-autonoma.git
cd revenda-autonoma
```

> Se o repositório ainda tiver outro nome na pasta (`gm-revenda`), entre na pasta que contém `package.json`.

### 2. Instalar dependências

```powershell
npm install
```

### 3. Configurar segredos locais (não vão pro Git)

```powershell
copy .env.example .env
copy .env.pb.local.example .env.pb.local
```

Edite `.env.pb.local` com o e-mail e senha que **você** vai usar como **superuser** do PocketBase (admin do servidor).

### 4. Primeira execução completa

```powershell
.\scripts\iniciar-gm-revenda.ps1
```

O script:

1. Baixa o `pocketbase.exe` (se necessário) na pasta irmã `gm-revenda-pb`
2. Inicia o servidor na porta **8090**
3. Na **primeira vez**, abre o painel admin — **crie o superuser** (mesmo e-mail/senha do `.env.pb.local`)
4. Importa o schema (`pb_schema.json`)
5. Cria usuário inicial do app e configurações padrão

### 5. Subir o frontend (outro terminal)

```powershell
npm run dev
```

Abra **http://localhost:5173**

### 6. Primeiro login no app

Após o `setup-pocketbase.ps1` (feito pelo script acima), use o usuário criado pelo seed:

- **E-mail:** `maicon@gmrevenda.local`
- **Senha inicial de dev:** `GmRevenda2024!` (altere em **Auth → Users** no admin)

---

## Uso diário

**Terminal 1 — servidor:**

```powershell
.\scripts\start-pocketbase.ps1
```

**Terminal 2 — interface:**

```powershell
npm run dev
```

**Atalho:** duplo clique em `Iniciar-GM-Revenda.bat` ou:

```powershell
npm run start:dev
```

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

Abre em http://localhost:4173 (PocketBase continua obrigatório).

---

## Servidor PocketBase

### O que é

Banco + API + autenticação em um único executável. Os dados ficam em `../gm-revenda-pb/pb_data/` (SQLite).

### Collections principais

| Collection | Conteúdo |
|------------|----------|
| `users` | Login do app (auth) |
| `veiculos` | Estoque, fotos, status, `data_anuncio` |
| `compras` / `vendas` / `despesas` | Movimentações |
| `configuracoes` | Nome da revenda, sócios, metas |
| `simulacoes` | Simulador de negócio |

Schema versionado em `pocketbase/pb_schema.json`.

### Atualizar schema (novos campos)

Com o PocketBase rodando:

```powershell
.\scripts\atualizar-schema.ps1
```

Requer `.env.pb.local` configurado.

### Reset total (apaga todos os dados)

```powershell
.\scripts\iniciar-gm-revenda.ps1 -Reset
```

Faz backup de `pb_data` com timestamp antes de apagar.

Mais detalhes: [pocketbase/README.md](pocketbase/README.md)

---

## Novo usuário no sistema

O app **não tem tela de auto-cadastro**. Novos operadores são criados pelo **administrador** do PocketBase:

1. PocketBase rodando → http://127.0.0.1:8090/_/
2. Login com o **superuser** (credenciais do `.env.pb.local`)
3. Menu **Collections** → **users** → **New record**
4. Preencha: **email**, **password**, **passwordConfirm**, **name**
5. Salve

O novo usuário já pode entrar em http://localhost:5173 com esse e-mail e senha.

**Sócios no sistema** (nomes em relatórios e divisão de lucro) são editados em **Configurações** dentro do app — não confundir com usuário de login.

---

## Scripts úteis

| Script | Função |
|--------|--------|
| `iniciar-gm-revenda.ps1` | Setup completo + inicia PB (+ `-Dev`, `-Reset`) |
| `start-pocketbase.ps1` | Só o servidor |
| `setup-pocketbase.ps1` | Schema + usuário seed |
| `atualizar-schema.ps1` | Reimporta `pb_schema.json` |
| `reset-pocketbase.ps1` | Apaga dados (com confirmação) |
| `import-schema.js` | Import via API admin |
| `seed-pocketbase.js` | Usuário + config inicial |

---

## Publicar no GitHub (Git)

Repositório sugerido: **https://github.com/maichado/revenda-autonoma**

### Primeira vez (autor do projeto)

```powershell
cd revenda-autonoma

git init
git add .
git status
# Confirme que .env e .env.pb.local NÃO aparecem

git commit -m "Initial commit: Revenda Autônoma - gestão de veículos com PocketBase"

git branch -M main
git remote add origin https://github.com/maichado/revenda-autonoma.git
git push -u origin main
```

Crie o repositório vazio no GitHub antes do push:

1. https://github.com/new
2. Nome: `revenda-autonoma`
3. **Sem** README/licença (já existem no projeto)
4. Público ou privado, como preferir

### Quem já colabora (clone)

```powershell
git clone https://github.com/maichado/revenda-autonoma.git
cd revenda-autonoma
npm install
copy .env.pb.local.example .env.pb.local
# Siga a seção "Passo a passo — quem acabou de clonar"
```

### Enviar alterações

```powershell
git add .
git status
git commit -m "Descrição clara do que mudou"
git push
```

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| **Servidor desconectado** no app | `.\scripts\start-pocketbase.ps1` |
| **Missing collection** | `.\scripts\setup-pocketbase.ps1` ou `atualizar-schema.ps1` |
| **data_anuncio não salva** | Rode `.\scripts\atualizar-schema.ps1` e recarregue o app |
| Porta **8090** ocupada | PocketBase já está rodando |
| Porta **5173** ocupada | Feche outro `npm run dev` |
| Login falha | Confira PB online; usuário existe em **users**? |
| **Falha ao salvar** | PB offline ou sessão expirada — login de novo |

---

## Estrutura do código

```
src/
├── pages/           # Telas (Dashboard, Veículos, Despesas, …)
├── components/      # UI reutilizável
├── store/           # Zustand + ações sync PB
├── lib/             # pocketbase.ts, pbApi, mappers
├── contexts/        # Auth
├── utils/           # Cálculos, relatórios, banco pessoal
└── types/           # TypeScript
```

---

## Licença e uso

Projeto privado da revenda. Uso interno. Não commitar dados de clientes, placas reais ou credenciais de produção.

**Desenvolvido para operação autônoma da revenda — MG Revenda.**
