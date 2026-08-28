# Deploy do CIS Simulado com Vercel, Render e Neon

Este guia descreve a arquitetura gratuita recomendada para esta branch:

- Frontend: Vercel.
- Backend: Render Free Web Service.
- Banco: Neon Free PostgreSQL.

Nao use Supabase, Railway ou SQLite em producao nesta branch.

## Branch

Use a branch:

```bash
deploy/vercel-render-neon
```

## Banco Neon

1. Crie uma conta no Neon.
2. Crie um projeto PostgreSQL.
3. Copie a connection string.
4. Use a URL com SSL habilitado:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require
```

Nao commite essa URL. Configure-a somente nas variaveis de ambiente do Render.

## Backend no Render

Crie um novo Web Service apontando para o repositorio.

Configuracao:

```text
Root Directory: backend
Build Command: npm install && npm run prisma:generate && npm run build && npm run prisma:deploy
Start Command: npm run start
```

Variaveis de ambiente no Render:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require
JWT_SECRET=um-segredo-longo-e-aleatorio
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app
ADMIN_NAME=Nome do Administrador
ADMIN_EMAIL=email@dominio.com
ADMIN_PASSWORD=senha-forte
```

O Render define `PORT` automaticamente. O backend ja le `process.env.PORT` e usa `3333` apenas como fallback local.

### Observacao sobre Render Free

O plano gratuito pode entrar em sleep apos inatividade. O primeiro acesso depois do sleep pode demorar alguns segundos.

## Migration no Render

O comando de build executa:

```bash
npm run prisma:deploy
```

Isso aplica as migrations no Neon. Como o Neon comecara vazio, esta branch usa uma migration inicial PostgreSQL limpa.

## Criar ADMIN inicial

Apos o primeiro deploy bem-sucedido, execute uma vez no shell do Render:

```bash
npm run prisma:create-admin
```

O script usa:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Regras do script:

- Se ja existir usuario com `ADMIN_EMAIL`, nao duplica.
- Se nao existir competicao, cria `Ambiente de Producao`.
- Cria o usuario com role `ADMIN`.
- Vincula o ADMIN a competicao via `CompetitionExpert`.
- Mantem `Expert.competitionId` preenchido para compatibilidade com telas e rotas existentes.

Nao use senha padrao em producao.

## Frontend na Vercel

Crie um projeto na Vercel apontando para o mesmo repositorio.

Configuracao:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Variavel de ambiente:

```env
VITE_API_URL=https://URL-DO-BACKEND.onrender.com
```

Depois de configurar `VITE_API_URL`, faca redeploy do frontend.

## CORS

No Render, configure:

```env
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app
```

Para liberar mais de uma origem:

```env
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app,https://seudominio.com.br
```

O backend mantem `localhost` e IPs locais para desenvolvimento.

## Teste local sem Neon

Para esta etapa, nao e obrigatorio conectar localmente no Neon. Ainda assim, valide o build:

```bash
cd backend
npm install
npm run prisma:generate
npm run build
```

Se quiser testar com banco real localmente, coloque uma connection string PostgreSQL valida em `backend/.env`.

## Validacao em producao

1. Abra:

```text
https://URL-DO-BACKEND.onrender.com/health
```

2. Confirme que a API responde.
3. Execute `npm run prisma:create-admin` uma vez no Render.
4. Abra o frontend na Vercel.
5. Faca login com o ADMIN criado.
6. Crie uma competicao.
7. Importe a ficha.
8. Cadastre um competidor.
9. Lance uma nota teste.
10. Valide resultados, exportacao e fechamento em ambiente de teste.

## Seguranca

- Nunca commitar `.env`.
- Nunca commitar `JWT_SECRET`.
- Nunca commitar banco local.
- Nunca commitar backup com dados reais.
- Use HTTPS no frontend e no backend.
- Use senha forte para o ADMIN inicial.
- Troque segredos se eles forem expostos acidentalmente.

## SQLite

SQLite nao deve ser usado em producao nesta branch. O backend foi preparado para PostgreSQL via Neon.
