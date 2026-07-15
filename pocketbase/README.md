# PocketBase — backend local

Documentação completa: [README.md](../README.md) na raiz.

## Pasta de dados (fora do Git)

```
Documentos/
├── rvd-autonoma/         ← repositório (clone do GitHub: revenda-autonoma)
└── rvd-autonoma-pb/      ← pocketbase.exe + pb_data (criada pelos scripts)
```

> Se você ainda tiver `gm-revenda-pb`, os scripts usam essa pasta legada até você renomeá-la.

## Comandos rápidos

```powershell
.\scripts\start-pocketbase.ps1      # iniciar servidor
.\scripts\setup-pocketbase.ps1      # schema + usuário inicial
.\scripts\atualizar-schema.ps1      # novos campos
```

Painel admin: http://127.0.0.1:8090/_/

## Novo usuário de login

**Collections → users → New record** no painel admin (ver README principal).

## Credenciais

- **Superuser PB:** apenas no seu `.env.pb.local` (não versionado)
- **Usuário app (seed):** `admin@revenda.local` — troque a senha após o primeiro acesso
