// Cliente MCP determinístico. Abre o servidor, faz o ciclo e confere os casos, sem modelo.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { CLIENTE_CONFERENCIA, PASTA, PREFIXO_RECUSA, casosDaCorrecao, casosDoPedido } from './comum.mjs'

const abrir = ambiente => {
  const processo = spawn(process.execPath, [join(PASTA, 'servidor.mjs')], { env: { ...process.env, ...ambiente }, stdio: ['pipe', 'pipe', 'inherit'] })
  const pendentes = new Map()
  createInterface({ input: processo.stdout }).on('line', linha => {
    const mensagem = JSON.parse(linha)
    pendentes.get(mensagem.id)?.(mensagem)
    pendentes.delete(mensagem.id)
  })
  let proximo = 0
  const enviar = mensagem => processo.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...mensagem })}\n`)
  const pedir = (method, params) => new Promise((resolver, rejeitar) => {
    const id = ++proximo
    const limite = setTimeout(() => rejeitar(new Error(`${method} sem resposta em 5 segundos.`)), 5000)
    pendentes.set(id, resposta => { clearTimeout(limite); resolver(resposta) })
    enviar({ id, method, params })
  })
  return { pedir, enviar, fechar: () => processo.kill() }
}

const avaliarCaso = (caso, resposta) => {
  if (resposta.error) return { ...caso, passou: false, detalhe: resposta.error.message }
  const { isError, content } = resposta.result
  const mensagem = content?.[0]?.text ?? ''
  const recusada = Boolean(isError) && mensagem.startsWith(PREFIXO_RECUSA)
  if (caso.espera === 'recusa') return { ...caso, passou: recusada, detalhe: recusada ? mensagem : 'o inputSchema deixou esta chamada passar' }
  return { ...caso, passou: !isError, detalhe: isError ? mensagem : 'aceita' }
}

export const conferir = async (pedido, ambiente = {}, { correcao = false } = {}) => {
  const conexao = abrir({ MCP_AULA_RA: pedido.ra, MCP_AULA_REGISTRO: 'off', ...ambiente })
  try {
    await conexao.pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: CLIENTE_CONFERENCIA, version: '1.0.0' } })
    conexao.enviar({ method: 'notifications/initialized' })
    const lista = await conexao.pedir('tools/list', {})
    if (lista.error) return { erro: lista.error.message, nomes: [], casos: [] }
    const nomes = lista.result.tools.map(f => f.name)
    const casos = []
    for (const caso of [...casosDoPedido(pedido), ...(correcao ? casosDaCorrecao(pedido) : [])]) {
      const resposta = await conexao.pedir('tools/call', { name: caso.ferramenta, arguments: caso.argumentos })
      casos.push(avaliarCaso(caso, resposta))
    }
    return { nomes, casos }
  } finally {
    conexao.fechar()
  }
}

// Usado pela atividade do tester. Executa casos quaisquer e devolve o resultado obtido em cada um:
// aceita, recusa (o inputSchema recusou) ou outro (qualquer outra resposta do servidor).
const obtido = resposta => {
  if (resposta.error) return { obtido: 'outro', resposta: resposta.error.message }
  const mensagem = resposta.result?.content?.[0]?.text ?? ''
  if (!resposta.result?.isError) return { obtido: 'aceita', resposta: mensagem }
  return { obtido: mensagem.startsWith(PREFIXO_RECUSA) ? 'recusa' : 'outro', resposta: mensagem }
}

export const executarCasos = async (pedido, casos, ambiente = {}) => {
  const conexao = abrir({ MCP_AULA_RA: pedido.ra, MCP_AULA_REGISTRO: 'off', ...ambiente })
  try {
    await conexao.pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: CLIENTE_CONFERENCIA, version: '1.0.0' } })
    conexao.enviar({ method: 'notifications/initialized' })
    const resultados = []
    for (const caso of casos) resultados.push({ ...caso, ...obtido(await conexao.pedir('tools/call', { name: caso.ferramenta, arguments: caso.argumentos })) })
    return resultados
  } finally {
    conexao.fechar()
  }
}
