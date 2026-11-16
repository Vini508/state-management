# Painel de sensores: comparação de gerenciamento de estado em React

Aplicação experimental de um Trabalho de Conclusão de Curso que compara quatro técnicas de gerenciamento de estado em React. A mesma aplicação existe em quatro versões, uma por branch, e a única diferença entre elas é a camada de estado.

| Branch | Técnica |
|---|---|
| `main` | Context API com `useReducer` (baseline nativo) |
| `redux` | Redux Toolkit com React Redux |
| `zustand` | Zustand |
| `jotai` | Jotai |

## A aplicação

Uma única tela exibe 1.000 sensores em uma grade de 40 colunas por 25 linhas. Cada sensor é um valor inteiro entre 0 e 100, gerado por um algoritmo pseudoaleatório com sementes fixas, de modo que a sequência de valores é a mesma em todas as versões e em todas as execuções.

Uma atualização é disparada a cada 15 ms, em um de dois cenários:

- **Simultâneo:** os 1.000 sensores mudam a cada atualização.
- **Localizado:** um sensor muda por atualização, em ordem circular.

## Requisitos

- Node.js 22.18.0 (o arquivo `.nvmrc` fixa essa versão)
- npm 10.9.3

As versões das dependências estão fixadas no `package.json` e travadas no `package-lock.json`.

## Como executar

Escolha a versão trocando de branch e instale as dependências dela:

```
git checkout zustand
npm ci
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verifica os tipos e gera o build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm test` | Executa os testes automatizados |
| `npm run check:isolation` | Confere que a branch só difere do `main` na camada de estado |

Repita o `npm ci` ao trocar de branch, porque cada versão tem a própria biblioteca de estado.

## Estrutura

```
src/
  main.tsx, App.tsx    Ponto de entrada e raiz da aplicação
  measurement.ts       Instrumentação de medição (desligada no uso normal)
  components/          Dashboard, SensorCard e SimulationClock
  domain/              Simulação dos sensores e contrato da camada de estado
  tests/               Testes compartilhados por todas as versões
  state/               Camada de estado: a única pasta que muda entre as branches,
                       incluindo os testes específicos de cada biblioteca
measure/               Coletor das medições (ver measure/README.md)
```

Tudo fora de `src/state/` é igual nas quatro branches.

Os componentes acessam o estado apenas pelos hooks exportados por `src/state/index.ts`: `useSensor`, `useSimulationMode`, `useIsRunning` e `useSensorActions`, além do componente `SensorProvider`. Cada branch implementa esse mesmo contrato com a respectiva técnica.

## Como a equivalência é garantida

- **Isolamento:** `npm run check:isolation` falha se uma branch alterar qualquer arquivo fora de `src/state/`, `package.json` e `package-lock.json`.
- **Contrato:** `src/tests/contract.test.tsx` é compartilhado e verifica que todas as versões produzem a mesma sequência de valores nos dois cenários.
- **Renderizações:** `src/tests/renders.test.tsx` é compartilhado e conta quantas vezes cada componente renderiza em uma atualização. Os valores esperados de cada versão ficam em `src/state/renderExpectations.ts`.

Mudanças em código compartilhado são feitas no `main` e levadas às demais branches por merge.
