# Análise A12 — RA 23167656-2

Defeito sorteado: d4 — renovar_emprestimo sem dias obrigatório.

## 1. Valores que separam o contrato correto do contrato com o máximo errado por uma unidade

Parâmetro `dias`, máximo 10, limite do RA.

- 11: o contrato correto recusa e o contrato com máximo 11 aceita. Separa o erro para mais.
- 10: o contrato correto aceita e o contrato com máximo 9 recusa. Separa o erro para menos.

Um valor no meio da faixa, como 5, é aceito pelos três contratos e não separa nada.

## 2. Par que detecta d4 e par que não detecta

d4 remove apenas a obrigatoriedade de `dias`. Tipo, mínimo e máximo continuam iguais.

- Detecta: `dias` ausente com `id` válido, id 102 sem `dias`. No contrato correto é recusa; em d4 é aceita.
- Não detecta: `dias` com valor válido, id 102 e dias 5, aceito nos dois. Os casos de `dias` fora da faixa, como 0, 11 e 2.5, também não detectam, porque dependem de mínimo, máximo e tipo, que d4 não altera.

## 3. Caso

`renovar_emprestimo` com `{"id": 102}` e sem `dias`, espera recusa. É o caso t24.