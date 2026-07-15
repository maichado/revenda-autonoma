# PocketBase — backend local

Documentação completa do projeto: [README.md](../README.md) na raiz.

## Pasta de dados (fora do Git)

```
Documentos/
├── revenda-autonoma/     ← repositório
└── gm-revenda-pb/        ← pocketbase.exe + pb_data (criada pelos scripts)
```

## Comandos rápidos

```powershell
.\scripts\start-pocketbase.ps1      # iniciar servidor
.\scripts\setup-pocketbase.ps1      # schema + usuário inicial
.\scripts\atualizar-schema.ps1      # novos campos (ex.: data_anuncio)
```

Painel admin: http://127.0.0.1:8090/_/

## Novo usuário de login

**Collections → users → New record** no painel admin (ver README principal).

## Credenciais

- **Superuser PB:** apenas no seu `.env.pb.local` (não versionado)
- **Usuário app (seed):** criado por `seed-pocketbase.js` na primeira instalação — troque a senha após o primeiro acesso
