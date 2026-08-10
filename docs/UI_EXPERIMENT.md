# UI Experiment - Untitled Dark/Light

Branch:

```bash
ui/untitled-dark-experiment
```

## Objetivo

Esta branch cria uma versao visual experimental do CIS Simulado com inspiracao em Untitled UI React e em interfaces institucionais para operacao tecnica.

O foco e visual e de experiencia:

- tema claro e escuro;
- botao global de troca de tema;
- botao de tema circular, com icone apenas, fixo no canto superior direito;
- preferencia de tema persistida em `localStorage`;
- transicao suave entre claro e escuro;
- azul como cor principal;
- cards e superficies com contraste adequado;
- sidebar fixa, compacta e com scroll discreto;
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

- `ThemeProvider` e `useTheme` para alternar entre claro e escuro.
- Tokens CSS em `frontend/src/index.css`:
  - background;
  - surface;
  - border;
  - text primary;
  - text secondary;
  - muted;
  - primary;
  - success;
  - warning;
  - danger.
- Toggle de tema fixo no canto superior direito do layout autenticado e do login.
- Toggle circular, com apenas icone de sol/lua e `aria-label` dinamico.
- Transicoes leves em background, borda, texto e sombra para reduzir troca brusca.
- Login sem placeholders e sem credenciais padrao na interface.
- Card superior da Conferencia Final reorganizado por grupos:
  - Conferencia;
  - Exportacoes;
  - Acao principal.
- Card superior da Conferencia Final com botoes de tamanho padronizado.
- Grupo de bloqueio/desbloqueio de subcriterio reorganizado na tela de lancamento.
- Botao `Bloquear subcriterio` refinado no modo dark com variante ambar legivel.
- Bloco de Importacao refinado com grid responsivo, file input e botao alinhados.
- Scrollbar discreta para sidebar, tabelas e listas com overflow.
- Componentes UI base adaptados para claro/escuro:
  - Button;
  - Badge;
  - Card;
  - Input;
  - Select;
  - Textarea;
  - Table;
  - Drawer;
  - Modal;
  - ConfirmDialog.

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

- [ ] Alternar entre claro e escuro.
- [ ] Confirmar transicao visual suave entre temas.
- [ ] Recarregar a pagina e confirmar persistencia do tema.
- [ ] Confirmar botao de tema circular e fixo no canto superior direito.
- [ ] Login legivel em desktop e notebook.
- [ ] Login sem placeholders e sem credenciais padrao visiveis.
- [ ] Sidebar sem scroll horizontal.
- [ ] Botao Sair sempre visivel.
- [ ] Item ativo destacado em azul.
- [ ] Tabelas rolam apenas dentro do card.
- [ ] Inputs com foco visivel.
- [ ] Modal e drawer fecham com Esc.
- [ ] Conferencia Final com grupos de acoes bem definidos.
- [ ] Conferencia Final com botoes de mesma altura e largura.
- [ ] Lancamento com status e botoes de subcriterio bem agrupados.
- [ ] Hover do botao Bloquear subcriterio legivel no dark.
- [ ] Importacao com select, arquivo e botao alinhados.
- [ ] Lancamento de notas continua com auto-save.
- [ ] Resultados e WSOS continuam acessiveis para perfis permitidos.
- [ ] Build do frontend passa.
- [ ] Build do backend passa.
