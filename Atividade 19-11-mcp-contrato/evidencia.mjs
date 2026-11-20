// Grava entrega/evidencia-<RA>.json com o contrato, os casos e as chamadas feitas pelo harness.
// Uso: node evidencia.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ARQUIVO_CONTRATO, ARQUIVO_REGISTRO, PASTA, avaliarFrases, chamadasValidas, conferirDescricoes, hashContrato, lerRa, lerTexto, montarPedido, raValido } from './comum.mjs'
import { conferir } from './cliente.mjs'

const lerRegistro = () => (existsSync(ARQUIVO_REGISTRO) ? lerTexto(ARQUIVO_REGISTRO).split('\n').filter(Boolean).map(linha => JSON.parse(linha)) : [])

const principal = async () => {
  const ra = lerRa()
  if (!raValido(ra)) {
    console.error('Execute node pedido.mjs <seu RA> antes de gerar a evidência.')
    return 2
  }
  const pedido = montarPedido(ra)
  const contrato = JSON.parse(lerTexto(ARQUIVO_CONTRATO))
  const resultado = await conferir(pedido)
  const descricoes = conferirDescricoes(pedido, contrato)
  const registro = lerRegistro()
  const chamadas = chamadasValidas(pedido, contrato, registro).slice(-100)
  const frases = avaliarFrases(pedido, chamadas)
  const clientes = [...new Set(chamadas.map(c => c.cliente))]
  const evidencia = { ra, dominio: pedido.id, limite: pedido.limite, geradaEm: new Date().toISOString(), contratoHash: hashContrato(contrato), contrato, casos: resultado.casos ?? [], descricoes, clientes, chamadas, frases }
  mkdirSync(join(PASTA, 'entrega'), { recursive: true })
  const arquivo = join(PASTA, 'entrega', `evidencia-${ra}.json`)
  writeFileSync(arquivo, `${JSON.stringify(evidencia, null, 2)}\n`)

  const casosOk = evidencia.casos.filter(c => c.passou).length
  const linha = (rotulo, texto) => console.log(`${rotulo.padEnd(10)} ${texto}`)
  linha(casosOk === 5 ? '[ok]' : '[falhou]', `${casosOk} de 5 casos do contrato aprovados`)
  linha(descricoes.every(d => d.passou) ? '[ok]' : '[falhou]', `${descricoes.filter(d => d.passou).length} de ${descricoes.length} conferências das descrições`)
  linha(chamadas.length > 0 ? '[ok]' : '[pendente]', chamadas.length > 0 ? `${chamadas.length} chamadas registradas pelo harness (${clientes.join(', ')})` : 'nenhuma chamada do harness com este contrato')
  if (chamadas.length > 0) console.log(`Pedidos em linguagem natural: ${frases.acertos} de ${frases.total} acertos, ${frases.falsosPositivos} falsos positivos e ${frases.falsosNegativos} falsos negativos. Este número é informativo.`)
  console.log(`\nEvidência gravada em ${arquivo}. Envie o arquivo sem editar.`)
  if (casosOk < 5) console.log('O que fazer: rode node conferir.mjs, leia cada [falhou] e ajuste contrato.json.')
  if (chamadas.length === 0) console.log(`O que fazer: abra o harness nesta pasta, peça a execução de frases.md e rode este comando de novo.${registro.length > 0 ? ' Chamadas feitas antes da última edição de contrato.json ou com outro RA não contam.' : ''}`)
  return 0
}

process.exitCode = await principal()
