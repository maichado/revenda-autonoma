# PocketBase — backend local

Documentação completa: [README.md](../README.md) na raiz.

## Pasta de dados (fora do Git)

```
Documentos/
├── rvd-autonoma/ (ou gm-revenda/)   ← repositório
└── rvd-autonoma-pb/ (ou gm-revenda-pb/)  ← pocketbase.exe + pb_data (criada pelos scripts)
```

> Se você ainda tiver `gm-revenda-pb`, os scripts usam essa pasta legada até você renomeá-la.

## Comandos rápidos

```powershell
.\scripts\start-pocketbase.ps1      # iniciar servidor
.\scripts\setup-pocketbase.ps1      # schema + config padrão
.\scripts\atualizar-schema.ps1      # novos campos
```

Painel admin: http://127.0.0.1:8090/_/

## Primeiro uso

1. Suba o PocketBase (`start-pocketbase.ps1`).
2. Na **primeira vez**, crie o **superuser** no painel (e-mail/senha só seus; guarde em `.env.pb.local`, nunca no Git).
3. Importe o schema / rode o setup se necessário.
4. Suba o app (`npm run dev`) e use a aba **Criar conta** na tela de login.
5. Complete **Configurações** dentro do app.

## Novo usuário de login

- **Pelo app (recomendado):** tela de login → **Criar conta**.
- **Pelo Admin:** Collections → users → New record (sem exemplos de senha nesta doc).
