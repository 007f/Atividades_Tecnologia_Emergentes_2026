// Prepara o contrato do RA e registra o servidor nos três harnesses.
// Uso: node pedido.mjs 12345678-9, node pedido.mjs treino ou node pedido.mjs exemplo. --refazer recria contrato.json.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ARQUIVO_CONTRATO, ARQUIVO_RA, PASTA, alvoValido, frasesDoPedido, lerRa, montarPedido } from './comum.mjs'

const alvo = (process.argv[2] ?? '').trim()
const refazer = process.argv.includes('--refazer')
if (!alvoValido(alvo)) {
  console.error('Informe o RA no formato 12345678-9, ou treino para o contrato do laboratório.')
  process.exit(2)
}
const p = montarPedido(alvo)

const contratoInicial = {
  ferramentas: [p.leitura, p.alteracao].map(name => ({
    name,
    description: 'Executa a operação.',
    inputSchema: { type: 'object', properties: {} },
  })),
}

const pedidoMd = `# Contrato de ${p.tema}

O servidor MCP oferece duas ferramentas sobre ${p.tema}. Os registros têm \`id\` de 101 a 105.

| Ferramenta | Efeito | Entrada |
|---|---|---|
| \`${p.leitura}\` | Devolve os dados de um registro e deixa tudo como está | \`id\`, inteiro, obrigatório, mínimo 1 |
| \`${p.alteracao}\` | Soma \`${p.parametro}\` ao total do registro | \`id\`, inteiro, obrigatório, mínimo 1, e \`${p.parametro}\`, inteiro, obrigatório, de 1 a ${p.limite} |

Corrija \`description\` e \`inputSchema\` das duas ferramentas em \`contrato.json\`. Mantenha os nomes.
`

const frasesMd = `# Pedidos ao servidor aula

Execute cada pedido abaixo usando as ferramentas do servidor MCP \`aula\`, um por vez, e informe o resultado de cada um.

${frasesDoPedido(p).map(f => `${f.frase}. ${f.texto}`).join('\n')}
`

const comando = process.execPath
const servidor = join(PASTA, 'servidor.mjs')
const json = JSON.stringify({ mcpServers: { aula: { command: comando, args: [servidor] } } }, null, 2)

mkdirSync(join(PASTA, '.agents'), { recursive: true })
mkdirSync(join(PASTA, '.codex'), { recursive: true })
writeFileSync(join(PASTA, '.mcp.json'), `${json}\n`)
writeFileSync(join(PASTA, '.agents', 'mcp_config.json'), `${json}\n`)
writeFileSync(join(PASTA, '.codex', 'config.toml'), `[mcp_servers.aula]\ncommand = ${JSON.stringify(comando)}\nargs = [${JSON.stringify(servidor)}]\n`)
writeFileSync(join(PASTA, 'pedido.md'), pedidoMd)
writeFileSync(join(PASTA, 'frases.md'), frasesMd)

const trocou = lerRa() !== alvo
const preservar = existsSync(ARQUIVO_CONTRATO) && !trocou && !refazer
if (!preservar) writeFileSync(ARQUIVO_CONTRATO, `${JSON.stringify(contratoInicial, null, 2)}\n`)
writeFileSync(ARQUIVO_RA, `${alvo}\n`)

console.log(pedidoMd)
console.log(preservar ? 'contrato.json foi mantido. Use --refazer para voltar ao início.' : 'contrato.json criado com as duas ferramentas sem contrato.')
console.log('Servidor registrado em .mcp.json, .agents/mcp_config.json e .codex/config.toml.')
console.log('Próximo passo: node conferir.mjs')
