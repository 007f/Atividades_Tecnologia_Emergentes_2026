# Contrato de biblioteca

O servidor MCP oferece duas ferramentas sobre biblioteca. Os registros têm `id` de 101 a 105.

| Ferramenta | Efeito | Entrada |
|---|---|---|
| `consultar_emprestimo` | Devolve os dados de um registro e deixa tudo como está | `id`, inteiro, obrigatório, mínimo 1 |
| `renovar_emprestimo` | Soma `dias` ao total do registro | `id`, inteiro, obrigatório, mínimo 1, e `dias`, inteiro, obrigatório, de 1 a 10 |

Corrija `description` e `inputSchema` das duas ferramentas em `contrato.json`. Mantenha os nomes.
