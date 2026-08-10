# UI Experiment - Untitled Dark

Branch:

```bash
ui/untitled-dark-experiment
```

## Objetivo

Esta branch cria uma versao visual experimental do CIS Simulado com inspiracao em Untitled UI React e em interfaces dark institucionais para operacao tecnica.

O foco e visual e de experiencia:

- tema escuro;
- azul como cor principal;
- cards e superficies com alto contraste;
- sidebar premium e fixa;
- login mais institucional;
- componentes base mais consistentes;
- reducao de scroll horizontal global;
- foco visivel e melhor legibilidade.

## Como rodar

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## O que foi alterado

- Tema global dark em `frontend/src/index.css`.
- Layout principal com escopo visual `cis-dark`.
- Sidebar redesenhada com navegacao compacta, item ativo em azul e footer fixo.
- Login redesenhado com fundo escuro, gradientes e card premium.
- Componentes UI base adaptados:
  - Button
  - Badge
  - Card
  - Input
  - Select
  - Textarea
  - Table
  - Drawer
  - Modal
  - ConfirmDialog
- Header de pagina com visual dark institucional.

## O que nao foi alterado

Nao foram alteradas regras de negocio:

- calculo de notas;
- importacao Excel;
- lancamento de notas;
- julgamento;
- medicao;
- fechamento;
- inconsistencias;
- exportacoes;
- backup;
- autenticacao;
- permissoes;
- rotas backend;
- banco de dados.

## Como voltar para a versao estavel

```bash
git checkout main
```

## Como testar a versao experimental

```bash
git checkout ui/untitled-dark-experiment
```

Depois rode backend e frontend normalmente.

## Checklist visual

- [ ] Login legivel em desktop e notebook.
- [ ] Sidebar sem scroll horizontal.
- [ ] Botao Sair sempre visivel.
- [ ] Item ativo destacado em azul.
- [ ] Tabelas rolam apenas dentro do card.
- [ ] Inputs com foco visivel.
- [ ] Modal e drawer fecham com Esc.
- [ ] Dashboard mantem leitura rapida.
- [ ] Lancamento de notas continua com auto-save.
- [ ] Resultados e WSOS continuam acessiveis para perfis permitidos.
- [ ] Build do frontend passa.
- [ ] Build do backend passa.
