# Contrato de ferramentas MCP

Kit das atividades de MCP e do agente tester. O servidor expõe duas ferramentas de um domínio definido pelo RA. Você corrige `description` e `inputSchema` em `contrato.json`, confere o resultado pelo protocolo e depois usa as ferramentas pelo harness.

Requer Node.js 22.18 ou posterior. O kit não tem dependências, então não há `npm install`.

## Preparar

Extraia `mcp-contrato.zip`, entregue em aula, e abra um terminal na pasta `mcp-contrato`:

```bash
node pedido.mjs SEU-RA
```

Substitua `SEU-RA` pelo RA completo, com hífen e dígito.

O comando grava `pedido.md`, `frases.md` e `contrato.json` e registra o servidor nos três harnesses, com o caminho desta pasta. Se você mover a pasta, rode o comando de novo. Ele mantém `contrato.json`; `--refazer` volta ao início.

| Harness | Arquivo gerado | Observação |
|---|---|---|
| Antigravity | `.agents/mcp_config.json` | Abra `agy` nesta pasta |
| Claude Code | `.mcp.json` | Aprove o servidor `aula` ao abrir a sessão |
| Codex | `.codex/config.toml` | Aceite confiar na pasta ao abrir a sessão |

## Corrigir e conferir

Edite `contrato.json` seguindo `pedido.md`. A qualquer momento, execute:

```bash
node conferir.mjs
```

O comando abre o servidor, faz `initialize`, `tools/list` e cinco `tools/call`, sem usar modelo. Os casos mostram o que o `inputSchema` deixou passar. As quatro conferências das descrições vêm em seguida. A correção da atividade executa outros casos sobre as mesmas regras de `pedido.md`, então nove `[ok]` ainda pedem uma leitura final do seu contrato.

O formato do `inputSchema` é este, com os campos e limites do seu `pedido.md`:

```json
{
  "type": "object",
  "properties": {
    "campo": { "type": "integer", "minimum": 1, "maximum": 10 }
  },
  "required": ["campo"]
}
```

`node pedido.mjs treino` prepara o contrato do laboratório em sala, com o mesmo fluxo e sem relação com o seu RA.

## Usar pelo harness

Feche e abra a sessão depois de alterar o contrato, porque o cliente guarda o resultado de `tools/list`. Na pasta do kit, peça:

```text
Execute os pedidos de frases.md.
```

Cada `tools/call` fica em `registro/chamadas.jsonl`, com o RA, o contrato em uso e o nome que o cliente informou no `initialize`. Só contam as chamadas feitas com o contrato atual e o seu RA, então termine o contrato antes de usar o harness. Um único pedido cobre as cinco frases, o que economiza cota.

## Gerar a evidência

```bash
node evidencia.mjs
```

O comando grava `entrega/evidencia-<RA>.json` com o contrato, os casos, as chamadas e o resultado das frases. O acerto das frases é informativo, pois a resposta do modelo varia entre execuções.

## Testar os casos do agente tester

O agente tester lê `pedido.md` e grava `casos.json`, com o campo `agente` e a lista `casos`. Cada caso tem `nome`, `ferramenta`, `argumentos` e `espera`, que vale `"aceita"` ou `"recusa"`.

```bash
node testar.mjs
```

O comando executa os casos pelo protocolo MCP no contrato correto do pedido e em oito contratos com um defeito cada. `[caso errado]` indica um esperado que o contrato correto não confirma. `[sobreviveu]` indica um defeito que nenhum caso detectou; a saída mostra só a ferramenta, e a regra sem caso sai do `pedido.md`. `[fora]` indica um caso que o `inputSchema` aceita e o servidor responde com outra coisa, como `id` inexistente; esse caso não conta. A última parte executa os mesmos casos no `contrato.json` da pasta, só para informação. O comando também indica o defeito da análise e inclui `analise.md`, quando existe, na evidência. Com um RA, grava `entrega/a12-<RA>.json`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `servidor.mjs` | Servidor MCP por stdio. O stdout leva só JSON-RPC |
| `cliente.mjs` | Cliente determinístico usado por `conferir.mjs` e `evidencia.mjs` |
| `comum.mjs` | Domínio pelo RA, casos, validação de schema e métricas das frases |
| `dominios.mjs` | Os oito domínios da atividade e o exemplo da aula |
| `testar.mjs` e `a12.mjs` | Execução dos casos do tester no contrato correto e nos oito contratos com defeito |

O servidor aceita um subconjunto de JSON Schema: `type`, `properties`, `required`, `additionalProperties`, `minimum` e `maximum`.

## Problemas comuns

| Sintoma | Causa | Correção |
|---|---|---|
| O harness não mostra o servidor `aula` | Sessão aberta em outra pasta | Abra a sessão dentro de `mcp-contrato` |
| O caminho do servidor não existe | Pasta movida | Rode `node pedido.mjs SEU-RA` de novo |
| O harness usa o contrato antigo | Resultado de `tools/list` guardado na sessão | Feche e abra a sessão |
| `contrato.json não pôde ser lido` | JSON com vírgula ou aspas fora do lugar | Leia a mensagem e corrija a linha indicada |
| No VS Code, a aprovação não responde | Atalho do terminal em conflito | Abra o harness no PowerShell ou no Prompt de Comando |
