# Uso Local do CIS Simulado

Este guia descreve como preparar uma maquina para executar o CIS Simulado localmente durante um simulado.

## Requisitos da maquina

- Windows 10/11, Linux ou macOS.
- Node.js instalado.
- npm instalado junto com o Node.js.
- Navegador moderno, preferencialmente Chrome ou Edge.
- Espaco em disco para banco SQLite, backups e exportacoes.
- Acesso local as portas:
  - `3333` para o back-end.
  - `5173` para o front-end.

## Instalacao passo a passo

1. Abra um terminal na pasta do projeto.
2. Configure o ambiente do back-end:

```bash
cd backend
copy .env.example .env
```

No Linux/macOS:

```bash
cd backend
cp .env.example .env
```

3. Instale o back-end:

```bash
npm install
```

4. Rode as migrations:

```bash
npx prisma migrate dev
```

5. Instale o front-end:

```bash
cd ../frontend
npm install
```

## Comandos de execucao

Back-end:

```bash
cd backend
npm run dev
```

Front-end:

```bash
cd frontend
npm run dev
```

Ou use os scripts da raiz:

```bash
start-backend.bat
start-frontend.bat
```

Linux/macOS:

```bash
./start-backend.sh
./start-frontend.sh
```

## Como cadastrar competicao

1. Entre como `ADMIN`.
2. Acesse `Competicoes`.
3. Cadastre nome, local, data de inicio e data de fim.
4. Salve e confira se a competicao aparece na lista.

## Como importar ficha

1. Entre como `ADMIN`.
2. Acesse `Importacao`.
3. Selecione a competicao.
4. Escolha o arquivo Excel da ficha de avaliacao.
5. Execute a importacao.
6. Confira se modulos, criterios, subcriterios e aspectos foram criados.
7. Abra o Dashboard para verificar inconsistencias de estrutura.

## Como cadastrar competidores

1. Entre como `ADMIN`.
2. Acesse `Competidores`.
3. Selecione a competicao.
4. Cadastre nome, estado e posto de trabalho.
5. Revise se todos os competidores aparecem antes do inicio do simulado.

## Como cadastrar avaliadores

1. Entre como `ADMIN`.
2. Acesse `Avaliadores`.
3. Selecione a competicao.
4. Cadastre nome, estado e role.
5. Use:
   - `EXPERT` para avaliadores.
   - `SUPERVISOR` para lideranca de avaliacao/conferencia.
   - `ADMIN` para administradores do sistema.

## Como lancar notas

1. Selecione o usuario ativo correto.
2. Acesse `Lancamento de Notas`.
3. Selecione competidor e modulo.
4. Escolha o subcriterio.
5. Lance a nota dos aspectos de medicao ou julgamento.
6. O salvamento e automatico.
7. Se uma nota estiver bloqueada, ela nao podera ser alterada ate o desbloqueio por perfil autorizado.

## Como conferir inconsistencias

1. Acesse o Dashboard como `ADMIN` ou `SUPERVISOR`.
2. Veja a area `Inconsistencias da Avaliacao`.
3. Use filtros por competidor, modulo, tipo e severidade.
4. Abra `Detalhes` para entender o motivo.
5. Use `Corrigir` para ir diretamente ao lancamento da nota relacionada.

## Como fazer fechamento por modulo

1. Entre como `ADMIN` ou `SUPERVISOR`.
2. Acesse `Fechamento por Modulo`.
3. Selecione a competicao.
4. Revise o status de cada modulo.
5. Abra `Ver Detalhes` para identificar competidores com pendencias.
6. Corrija as pendencias quando houver.
7. Quando o modulo estiver `Pronto para Bloqueio`, clique em `Bloquear Todos`.
8. Confirme a acao.
9. O sistema bloqueia somente notas existentes daquele modulo para todos os competidores.

## Como fechar competicao

1. Acesse `Conferencia Final`.
2. Selecione a competicao.
3. Verifique:
   - aspectos pendentes;
   - julgamentos para revisar;
   - modulos desbloqueados;
   - status dos competidores.
4. Use `Fechamento por Modulo` quando precisar bloquear modulos coletivamente.
5. Quando tudo estiver pronto, gere exportacoes e backup final.

Observacao: o sistema nao fecha a competicao automaticamente. A validacao final e operacional.

## Como exportar PDF/Excel

1. Entre como perfil autorizado.
2. Acesse `Resultados` ou `Conferencia Final`.
3. Use as opcoes de exportacao:
   - ranking em Excel;
   - relatorio completo em Excel;
   - relatorio por competidor;
   - PDF oficial, quando disponivel.
4. Armazene os arquivos exportados em pasta identificada com data e nome do simulado.

## Como gerar backup

1. Entre como `ADMIN` ou `SUPERVISOR`, conforme permissao atual do sistema.
2. Acesse `Backup`.
3. Clique em gerar backup.
4. Guarde o arquivo em local seguro.
5. Gere backup:
   - antes da importacao;
   - depois do cadastro inicial;
   - durante intervalos importantes;
   - antes do fechamento;
   - ao final do simulado.

## Como restaurar backup

1. Garanta que voce possui um backup atual antes de restaurar outro.
2. Acesse `Backup`.
3. Selecione o arquivo de restauracao.
4. Confirme a operacao.
5. Reinicie o back-end se necessario.
6. Abra o Dashboard e confira os dados restaurados.

