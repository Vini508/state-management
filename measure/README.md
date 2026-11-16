# Coletor das medições

Programa que mede as quatro versões da aplicação e calcula a estatística. O procedimento completo, com a justificativa de cada escolha, está em `Docs/plano-medicao.md`.

## Como usar

Dentro desta pasta, na ordem:

| Comando | O que faz | Quando |
|---|---|---|
| `npm ci` | Instala as dependências do coletor | Uma vez |
| `npm run setup` | Copia as quatro branches para `C:\tcc-medicao`, gera os builds, mede o pacote e conta o código | Antes de medir |
| `npm run rehearsal` | Ensaio: a coleta com só 2 blocos, para conferir que tudo funciona | Antes da coleta |
| `npm run collect` | Coleta completa; se for interrompida, o mesmo comando continua de onde parou | À noite, horas |
| `npm run verify` | Confere se os dados estão completos e coerentes | Depois da coleta |
| `npm run analyze` | Testes estatísticos, tabelas e gráficos | Depois da conferência |
| `npm run inspect -- <versão>` | Serve uma versão para a inspeção manual com o React DevTools | Opcional |

## Como a medição funciona

1. **Na aplicação** (`src/measurement.ts` e `src/components/SimulationClock.tsx`): quando a página é aberta com `?ticks=2000`, o relógio do navegador é lido antes e depois de cada atualização, e a simulação pausa sozinha depois de 2.000 atualizações.
2. **Uma execução** (`medicoes/execucao.mjs`): abre o Chrome, entra na página, escolhe o cenário, clica em Iniciar, espera terminar, lê os tempos e fecha o Chrome.
3. **A coleta** (`etapas/2-coletar.mjs`): repete o passo 2 nas 8 combinações (4 versões × 2 cenários), 31 vezes, em ordem sorteada, e grava uma linha por execução em `results/`.
4. **A estatística** (`medicoes/estatistica.py`): Shapiro-Wilk e Levene para escolher o teste, depois ANOVA com Tukey ou Kruskal-Wallis com Dunn.

## Pastas

| Pasta ou arquivo | Conteúdo |
|---|---|
| `config.mjs` | Todos os parâmetros: blocos, atualizações, tamanho da janela, caminho do Chrome |
| `etapas/` | Um arquivo por comando, na ordem de uso |
| `medicoes/` | O que de fato mede: execução no Chrome, Lighthouse, contagem de código e estatística |
| `apoio/` | Utilitários: conferências dos dados, servidores locais, funções pequenas |
| `results/` | Saída das medições, uma pasta por preparação |

## O que cada medição gera

| Arquivo em `medicoes/` | Medidas | Hipótese |
|---|---|---|
| `execucao.mjs` | Tempo de processamento por atualização, ocupação da thread, frames, renderização, memória heap | H3 e complementares |
| `carregamento.mjs` | LCP e TBT | H2 |
| `codigo.mjs` | Linhas de código, funções da biblioteca, tamanho do pacote | H1 e H2 |
| `estatistica.py` | Testes estatísticos sobre tudo acima | H1, H2 e H3 |
