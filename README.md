# CIS Simulado

Sistema local para organizar, executar e conferir simulados de competicao de Tecnologias Web seguindo a logica de avaliacao do CIS/WorldSkills.

O projeto foi pensado para rodar em ambiente local durante um simulado: importar a ficha de avaliacao, cadastrar competidores e avaliadores, lancar notas, conferir inconsistencias, bloquear notas, fechar modulos e exportar resultados.

## Stack

- Node.js
- Fastify
- TypeScript
- Prisma
- SQLite
- React
- Vite
- Tailwind CSS

## Estrutura

```text
CIS/
  backend/     API Fastify, Prisma e banco SQLite local
  frontend/    Interface web React/Vite
  docs/        Guias operacionais do simulado
```

## Configuracao do ambiente

Crie o arquivo `backend/.env` a partir do exemplo:

```bash
cd backend
copy .env.example .env
```

No Linux/macOS:

```bash
cd backend
cp .env.example .env
```

Conteudo esperado:

```env
DATABASE_URL="file:./dev.db"
```

O arquivo `.env` real nao deve ser versionado.

## Instalacao

Instale as dependencias do back-end:

```bash
cd backend
npm install
```

Instale as dependencias do front-end:

```bash
cd frontend
npm install
```

## Banco de dados e migrations

No back-end, execute:

```bash
cd backend
npx prisma migrate dev
```

Para gerar o Prisma Client, se necessario:

```bash
npx prisma generate
```

Se quiser carregar dados iniciais de teste:

```bash
npm run prisma:seed
```

## Como iniciar localmente

Back-end:

```bash
cd backend
npm run dev
```

API: `http://localhost:3333`

Front-end:

```bash
cd frontend
npm run dev
```

Interface: `http://localhost:5173`

Tambem existem scripts na raiz:

```bash
start-backend.bat
start-frontend.bat
```

No Linux/macOS:

```bash
./start-backend.sh
./start-frontend.sh
```

## Como verificar se esta tudo funcionando

1. Inicie o back-end.
2. Abra `http://localhost:3333/health`.
3. Confirme a resposta:

```json
{
  "status": "ok",
  "message": "CIS Simulado API funcionando"
}
```

4. Inicie o front-end.
5. Abra `http://localhost:5173`.
6. Entre como Administrador.
7. Importe uma ficha de avaliacao.
8. Crie um competidor teste.
9. Lance uma nota teste.
10. Gere um backup.

## Perfis de usuario

`ADMIN`
- Pode cadastrar competicoes, competidores, avaliadores e estrutura.
- Pode importar ficha Excel.
- Pode lancar, conferir, bloquear e desbloquear notas.
- Pode acessar resultados, ranking, exportacoes, backup e restauracao.

`SUPERVISOR`
- Pode visualizar a operacao do simulado.
- Pode conferir notas e inconsistencias.
- Pode bloquear/desbloquear subcriterios e modulos.
- Pode fazer fechamento por modulo.
- Pode acessar resultados e exportacoes permitidas.

`EXPERT`
- Pode acessar Dashboard, Lancamento de Notas e Conferencia.
- Pode lancar e editar suas proprias notas enquanto nao estiverem bloqueadas.
- Nao pode importar ficha, editar estrutura, ver ranking/resultados, exportar ou fazer backup.

`VIEWER`
- Perfil de leitura para telas liberadas, sem acoes de alteracao.

## Fluxo recomendado do simulado

### Antes do simulado

1. Instalar dependencias.
2. Configurar `backend/.env`.
3. Rodar migrations.
4. Cadastrar ou importar a competicao.
5. Importar a ficha Excel de avaliacao.
6. Cadastrar competidores.
7. Cadastrar avaliadores e definir perfis.
8. Abrir o Dashboard e conferir se nao ha problemas de estrutura.
9. Gerar um backup inicial.

### Durante o simulado

1. Selecionar o usuario ativo correto.
2. Acessar Lancamento de Notas.
3. Selecionar competidor, modulo e avaliador.
4. Lancar notas de medicao e julgamento.
5. Usar Conferencia para verificar pendencias.
6. Corrigir notas antes de bloquear.
7. Supervisores/Admins bloqueiam subcriterios ou modulos quando estiverem revisados.
8. Gerar backups periodicos.

### Depois do simulado

1. Abrir Dashboard e revisar inconsistencias.
2. Usar Fechamento por Modulo para bloquear modulos completos.
3. Abrir Conferencia Final.
4. Validar pendencias, revisoes e bloqueios.
5. Exportar ranking e relatorios em Excel.
6. Exportar PDF oficial, se aplicavel.
7. Gerar backup final e armazenar em local seguro.

## Backup e restauracao

O sistema possui tela de Backup para gerar uma copia dos dados locais e restaurar uma copia anterior.

Recomendacoes:

- Gere backup antes de importar uma nova ficha.
- Gere backup antes de restaurar outro arquivo.
- Gere backups periodicos durante o simulado.
- Armazene o backup final fora da maquina principal.
- Nunca versionar arquivos de backup no Git.

## Documentacao operacional

- [Uso local](docs/USO_LOCAL.md)
- [Checklist do simulado](docs/CHECKLIST_SIMULADO.md)

## Validacao tecnica

Back-end:

```bash
cd backend
npm install
npx tsc --noEmit
```

Front-end:

```bash
cd frontend
npm install
npm run build
```

