# Apache Local

Use este guia quando o front-end for publicado pelo Apache e a API continuar no Fastify.

## Variaveis do backend

No arquivo `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-este-segredo-em-producao"
JWT_EXPIRES_IN="8h"
```

Depois de alterar `JWT_SECRET` ou qualquer variavel do `.env`, reinicie o backend.

## Autenticacao

O front-end envia `Authorization: Bearer <token>` em todas as chamadas autenticadas.

Credencial local inicial:

```text
admin@local.test / admin123
```

Cadastre novos avaliadores em `Avaliadores`, informando email e senha.
