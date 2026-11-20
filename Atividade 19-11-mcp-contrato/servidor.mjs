// Servidor MCP por stdio, sem dependências. Lê as ferramentas de contrato.json.
// O stdout leva só JSON-RPC, e cada tools/call fica em registro/chamadas.jsonl.
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createInterface } from 'node:readline'
import { ARQUIVO_CONTRATO, ARQUIVO_REGISTRO, PREFIXO_RECUSA, hashContrato, lerRa, lerTexto, montarPedido, validarArgumentos } from './comum.mjs'

const alvo = process.env.MCP_AULA_RA ?? lerRa()
const arquivoContrato = process.env.MCP_AULA_CONTRATO ?? ARQUIVO_CONTRATO
const arquivoRegistro = process.env.MCP_AULA_REGISTRO ?? ARQUIVO_REGISTRO
const pedido = montarPedido(alvo || 'exemplo')
const dados = new Map(pedido.registros.map(r => [r.id, { ...r }]))
let cliente = 'desconhecido'

const enviar = mensagem => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...mensagem })}\n`)
const lerContrato = () => JSON.parse(lerTexto(arquivoContrato))
const texto = (conteudo, isError = false) => ({ content: [{ type: 'text', text: conteudo }], isError })

const registrar = (contrato, entrada) => {
  if (arquivoRegistro === 'off') return
  mkdirSync(dirname(arquivoRegistro), { recursive: true })
  appendFileSync(arquivoRegistro, `${JSON.stringify({ quando: new Date().toISOString(), ra: pedido.ra, contrato: hashContrato(contrato), cliente, ...entrada })}\n`)
}

const executar = (nome, argumentos) => {
  const registro = dados.get(argumentos.id)
  if (!registro) return texto(`Registro ${argumentos.id} não encontrado.`, true)
  if (nome === pedido.leitura) return texto(JSON.stringify(registro))
  const quantidade = argumentos[pedido.parametro]
  if (typeof quantidade !== 'number') return texto(`Falta ${pedido.parametro}.`, true)
  registro.total += quantidade
  return texto(JSON.stringify(registro))
}

const chamarFerramenta = ({ name, arguments: argumentos = {} }) => {
  const contrato = lerContrato()
  const ferramenta = contrato.ferramentas.find(f => f.name === name)
  if (!ferramenta || ![pedido.leitura, pedido.alteracao].includes(name)) throw Object.assign(new Error(`Ferramenta ${name} não existe.`), { codigo: -32602 })
  const erros = validarArgumentos(ferramenta.inputSchema, argumentos)
  const resultado = erros.length > 0 ? texto(`${PREFIXO_RECUSA}: ${erros.join('; ')}.`, true) : executar(name, argumentos)
  registrar(contrato, { ferramenta: name, argumentos, aceita: !resultado.isError, resposta: resultado.content[0].text })
  return resultado
}

const responder = ({ id, method, params }) => {
  if (method === 'initialize') {
    cliente = params?.clientInfo?.name ?? cliente
    return { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'aula', version: '1.0.0' } }
  }
  if (method === 'ping') return {}
  if (method === 'tools/list') return { tools: lerContrato().ferramentas }
  if (method === 'tools/call') return chamarFerramenta(params)
  throw Object.assign(new Error(`Método ${method} não existe.`), { codigo: -32601 })
}

createInterface({ input: process.stdin }).on('line', linha => {
  if (!linha.trim()) return
  let mensagem
  try {
    mensagem = JSON.parse(linha)
  } catch {
    return enviar({ id: null, error: { code: -32700, message: 'JSON inválido.' } })
  }
  if (mensagem.id === undefined) return
  try {
    enviar({ id: mensagem.id, result: responder(mensagem) })
  } catch (erro) {
    enviar({ id: mensagem.id, error: { code: erro.codigo ?? -32603, message: erro.codigo ? erro.message : `Falha no servidor: ${erro.message}` } })
  }
})
