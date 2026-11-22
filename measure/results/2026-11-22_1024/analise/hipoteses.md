# Números para a decisão das hipóteses

As regras estão em Docs/plano-medicao.md, seção 11. Os vereditos abaixo aplicam essas regras
aos dados; confira-os antes de levar ao texto.

## H1: rastreabilidade do Redux ao custo de mais código

| Implementação | Linhas de código | Itens da API | Arquivos de estado | Componentes acoplados |
|---|---|---|---|---|
| Context API | 128 | 4 | 3 | 0 |
| Redux | 126 | 6 | 4 | 0 |
| Zustand | 78 | 1 | 2 | 0 |
| Jotai | 98 | 6 | 3 | 0 |

- Redux em relação ao Zustand: mais linhas de código, sim; mais itens da API, sim; custo maior, sim.
- Redux em relação ao Jotai: mais linhas de código, sim; mais itens da API, não; custo maior, não.
- Redux tem custo maior que: Zustand.
- Os três critérios de rastreabilidade são avaliados à mão (seção 11 do plano); o veredito combina esses critérios com a linha acima.

## H2: Zustand com menor pacote e menor carregamento

| Implementação | JavaScript (bytes) | JavaScript gzip (bytes) | Diferença para o baseline (bytes) |
|---|---|---|---|
| Context API | 226005 | 70261 | +0 |
| Redux | 248134 | 78176 | +22129 |
| Zustand | 225880 | 70308 | -125 |
| Jotai | 232957 | 73091 | +6952 |

- Zustand tem o menor pacote entre as três bibliotecas: sim.
- LCP, Zustand menos Redux: -2,703 ms, p ajustado 0,991, não significativo.
- LCP, Zustand menos Jotai: -1,523 ms, p ajustado 1, não significativo.

**Veredito pela regra: H2 relativizada.**

## H3: Jotai com menor custo de propagação no cenário localizado

| Implementação | Média (ms) | Desvio-padrão (ms) | Mediana (ms) | n |
|---|---|---|---|---|
| Context API (não comparável, ver plano 2.1) | 0,03751 | 0,006542 | 0,03816 | 30 |
| Redux | 0,6322 | 0,02264 | 0,6306 | 30 |
| Zustand | 0,1636 | 0,01123 | 0,1636 | 30 |
| Jotai | 0,0779 | 0,006512 | 0,0783 | 30 |

- Jotai menos Redux: -0,5543 ms (-3,33% de um frame), p ajustado 1,75e-18, significativo.
- Jotai menos Zustand: -0,08566 ms (-0,514% de um frame), p ajustado 2,61e-05, significativo.

**Veredito pela regra: H3 confirmada, desde que o teste de renderizações mostre 1 componente por atualização.**

## Curva de escala: tempo médio de processamento (ms), cenário localizado

| Implementação | 100 sensores | 1000 sensores | 10000 sensores | Maior ÷ menor |
|---|---|---|---|---|
| Context API | 0,02401 | 0,03862 | 0,02009 | 0,837 |
| Redux | 0,1549 | 0,64 | 4,213 | 27,2 |
| Zustand | 0,04961 | 0,1687 | 1,308 | 26,4 |
| Jotai | 0,05619 | 0,07974 | 0,08041 | 1,43 |
