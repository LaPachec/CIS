# Checklist do Simulado

Use este checklist antes, durante e depois do simulado para reduzir risco operacional.

## Antes do simulado

- [ ] Node.js instalado na maquina principal.
- [ ] Projeto copiado para a maquina do simulado.
- [ ] `backend/.env` criado a partir de `backend/.env.example`.
- [ ] Dependencias do back-end instaladas.
- [ ] Dependencias do front-end instaladas.
- [ ] Migrations executadas.
- [ ] Back-end iniciado e `/health` respondendo.
- [ ] Front-end abrindo em `http://localhost:5173`.
- [ ] Competicao cadastrada.
- [ ] Ficha Excel importada.
- [ ] Modulos, criterios, subcriterios e aspectos conferidos.
- [ ] Competidores cadastrados.
- [ ] Avaliadores cadastrados com roles corretas.
- [ ] Usuario administrador testado.
- [ ] Usuario supervisor testado.
- [ ] Usuario expert testado.
- [ ] Backup inicial gerado.

## Durante o simulado

- [ ] Conferir se o usuario ativo esta correto antes de lancar notas.
- [ ] Lancar notas por competidor, modulo e subcriterio.
- [ ] Conferir salvamento automatico apos lancamentos.
- [ ] Verificar pendencias na tela de Conferencia.
- [ ] Revisar julgamentos divergentes.
- [ ] Bloquear subcriterios ou modulos somente depois de revisar.
- [ ] Evitar alteracoes de estrutura durante a avaliacao.
- [ ] Gerar backups periodicos.
- [ ] Registrar qualquer ocorrencia operacional fora do sistema, se necessario.

## Depois do simulado

- [ ] Abrir Dashboard e conferir inconsistencias.
- [ ] Corrigir aspectos sem nota.
- [ ] Corrigir julgamentos divergentes.
- [ ] Corrigir julgamentos incompletos.
- [ ] Usar Fechamento por Modulo para bloquear modulos completos.
- [ ] Abrir Conferencia Final.
- [ ] Confirmar que nao ha pendencias criticas.
- [ ] Exportar ranking em Excel.
- [ ] Exportar relatorio completo em Excel.
- [ ] Exportar PDF oficial, se aplicavel.
- [ ] Gerar backup final.
- [ ] Copiar backup final para local externo.

## Checklist tecnico

- [ ] Back-end executando na porta `3333`.
- [ ] Front-end executando na porta `5173`.
- [ ] `http://localhost:3333/health` respondendo.
- [ ] Banco SQLite presente e acessivel.
- [ ] `.env` nao exposto publicamente.
- [ ] `node_modules` nao versionado.
- [ ] `dist` nao versionado.
- [ ] Arquivos `.db`, `.sqlite` e backups nao versionados.
- [ ] Navegador sem erro de CORS.
- [ ] Exportacoes baixando corretamente.

## Checklist de backup

- [ ] Backup antes da importacao da ficha.
- [ ] Backup depois da importacao da ficha.
- [ ] Backup depois do cadastro de competidores e avaliadores.
- [ ] Backup durante pausas do simulado.
- [ ] Backup antes de bloquear modulos coletivamente.
- [ ] Backup antes de restaurar qualquer arquivo.
- [ ] Backup final apos exportacoes.
- [ ] Backup final copiado para pendrive, rede ou pasta segura.
- [ ] Nome do arquivo de backup identifica data, horario e simulado.

