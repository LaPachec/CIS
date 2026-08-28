# Deploy com Frontend na Vercel e Backend Separado

Este guia prepara o CIS Simulado para o cenario recomendado de producao:

- Frontend React/Vite na Vercel.
- Backend Fastify/Node fora da Vercel, em Railway ou Render.
- Banco PostgreSQL em producao.
- SQLite apenas como alternativa temporaria com volume persistente.

## Visao geral

O frontend e uma aplicacao estatica gerada pelo Vite. Ele pode ser publicado na Vercel sem carregar banco de dados nem arquivos do backend.

O backend Fastify deve ficar em um servico Node persistente, como Railway ou Render. Esse servico expõe a API, roda migrations Prisma e acessa o banco.

## Arquivos sensiveis

Nao versionar:

- `backend/.env`
- `frontend/.env`
- `backend/dev.db`
- qualquer `*.db`, `*.sqlite`, `*.db-journal` ou `*.sqlite-journal`
- backups gerados pelo sistema

O arquivo `backend/dev.db` pode continuar existindo localmente, mas nao deve ser commitado.

## Opção A - Recomendada

Use esta opcao para ambiente real.

### Arquitetura

- Vercel: frontend.
- Railway ou Render: backend.
- PostgreSQL: banco de dados.
- HTTPS ativo no frontend e no backend.

### Banco PostgreSQL

O projeto ainda esta configurado para SQLite no Prisma. Para migrar para PostgreSQL:

1. Gerar backup do SQLite atual.
2. Criar banco PostgreSQL no Railway, Render, Neon, Supabase ou outro provedor.
3. Ajustar `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
}
```

4. Conferir se os tipos Prisma usados no schema sao compativeis com PostgreSQL.
5. Criar uma migration nova em ambiente controlado.
6. Migrar os dados do SQLite para PostgreSQL com script proprio ou ferramenta ETL.
7. Validar login, importacao, lancamento, fechamento e exportacoes.
8. Em producao, aplicar migrations com:

```bash
npm run prisma:deploy
```

Trocar o provider diretamente em um banco com dados reais exige cuidado. Nao faca essa mudanca durante um simulado em andamento.

### Variaveis do backend

Crie as variaveis no Railway/Render com base em `backend/.env.production.example`:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:PORTA/BANCO
JWT_SECRET=um-segredo-longo-e-aleatorio
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app
```

`JWT_SECRET` nunca deve ser commitado.

### Deploy do backend no Railway ou Render

Configure o servico:

```text
Root directory: backend
Build command: npm install && npm run build && npm run prisma:deploy
Start command: npm run start
```

Confirme que o servico usa Node.js e que a porta vem do ambiente quando o provedor exigir. Se o provedor definir `PORT`, ajuste o backend para usar essa variavel antes de publicar.

### CORS do backend

Configure:

```env
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app
```

Se precisar liberar mais de uma origem, separe por virgula:

```env
FRONTEND_URL=https://app.vercel.app,https://www.seudominio.com.br
```

## Opção B - Temporaria

Use apenas para teste ou demonstracao com baixo risco.

### Arquitetura

- Vercel: frontend.
- Railway, Render ou Fly.io: backend.
- SQLite em volume persistente.

SQLite sem volume persistente nao e seguro em deploy. O arquivo pode ser perdido quando o container reiniciar, for recriado ou migrar de maquina.

### Cuidados com SQLite em producao

- Configure um volume persistente no provedor.
- Aponte `DATABASE_URL` para o caminho dentro do volume.
- Gere backups frequentes.
- Nao use SQLite para muitos usuarios simultaneos.
- Planeje migracao para PostgreSQL antes de usar em simulados maiores.

Exemplo:

```env
DATABASE_URL=file:/data/cis/dev.db
JWT_SECRET=um-segredo-longo-e-aleatorio
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://URL-DO-FRONTEND.vercel.app
```

## Deploy do frontend na Vercel

Configure o projeto na Vercel:

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
```

Configure a variavel de ambiente:

```env
VITE_API_URL=https://URL-DO-BACKEND
```

Use a URL publica HTTPS do backend. Nao use `localhost` em producao.

O frontend tambem ainda aceita `VITE_API_BASE_URL` por compatibilidade, mas a variavel recomendada para producao e `VITE_API_URL`.

## Scripts esperados

No backend:

```bash
npm run build
npm run start
npm run prisma:deploy
```

No frontend:

```bash
npm run build
```

## Validacao apos deploy

1. Abrir `https://URL-DO-BACKEND/health`.
2. Confirmar resposta `status: ok`.
3. Abrir a URL da Vercel.
4. Fazer login.
5. Validar uma rota autenticada.
6. Importar uma ficha em ambiente de teste.
7. Cadastrar um competidor teste.
8. Lancar uma nota teste.
9. Gerar backup ou exportacao de teste, conforme permissao.

## Seguranca

- Use HTTPS no frontend e backend.
- Defina `JWT_SECRET` forte e exclusivo por ambiente.
- Nao exponha senha padrao na tela de login.
- Nao commit banco com dados reais.
- Nao commit backups.
- Use variaveis de ambiente para URLs, segredos e banco.
- Antes de migrar dados reais, gere backup e valide em ambiente de homologacao.

## Observacao sobre Vercel

Nao hospede o backend Fastify com SQLite dentro da Vercel. A Vercel e adequada para o frontend estatico neste projeto. O backend precisa de ambiente Node persistente e controle melhor sobre banco, arquivos e migrations.
