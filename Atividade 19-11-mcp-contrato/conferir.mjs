// Confere contrato.json pelo protocolo MCP, sem modelo.
// Uso: node conferir.mjs
import { existsSync } from 'node:fs'
import { ARQUIVO_CONTRATO, conferirDescricoes, lerRa, lerTexto, montarPedido } from './comum.mjs'
import { conferir } from './cliente.mjs'

const principal = async () => {
  const alvo = lerRa()
  if (!alvo || !existsSync(ARQUIVO_CONTRATO)) {
    console.error('Execute node pedido.mjs <seu RA> antes de conferir.')
    return 2
  }
  const pedido = montarPedido(alvo)
  const resultado = await conferir(pedido)
  if (resultado.erro) {
    console.error(`contrato.json não pôde ser lido: ${resultado.erro}`)
    return 1
  }
  console.log(`tools/list devolveu: ${resultado.nomes.join(', ')}`)
  for (const c of resultado.casos) console.log(`${c.passou ? '[ok]    ' : '[falhou]'} ${c.caso} ${c.nome}${c.passou ? '' : `: ${c.detalhe}`}`)
  const contrato = JSON.parse(lerTexto(ARQUIVO_CONTRATO))
  const descricoes = conferirDescricoes(pedido, contrato)
  for (const d of descricoes) console.log(`${d.passou ? '[ok]    ' : '[falhou]'} ${d.nome}${d.passou ? '' : `. ${d.dica}`}`)
  const aprovados = resultado.casos.filter(c => c.passou).length + descricoes.filter(d => d.passou).length
  console.log(`\n${aprovados} de ${resultado.casos.length + descricoes.length} conferências aprovadas. A correção executa outros casos sobre as regras de pedido.md.`)
  return aprovados === resultado.casos.length + descricoes.length ? 0 : 1
}

process.exitCode = await principal()
