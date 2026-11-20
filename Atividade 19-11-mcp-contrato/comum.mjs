// Funções usadas por pedido.mjs, servidor.mjs, conferir.mjs e evidencia.mjs.
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOMINIOS } from './dominios.mjs'

export const PASTA = import.meta.dirname
export const ARQUIVO_RA = join(PASTA, '.ra')
export const ARQUIVO_CONTRATO = join(PASTA, 'contrato.json')
export const ARQUIVO_REGISTRO = join(PASTA, 'registro', 'chamadas.jsonl')
export const PREFIXO_RECUSA = 'Argumentos inválidos'
export const CLIENTE_CONFERENCIA = 'conferir'

export const raValido = ra => /^\d{6,10}-\d$/.test(ra)

const numeroDoRa = ra => Number(ra.split('-')[0])
const FIXOS = { exemplo: 'E', treino: 'T' }

export const alvoValido = alvo => raValido(alvo) || alvo in FIXOS

export const montarPedido = alvo => {
  const fixo = FIXOS[alvo]
  const id = fixo ?? `D${(numeroDoRa(alvo) % 8) + 1}`
  const dominio = DOMINIOS[id]
  const limite = fixo ? dominio.base : dominio.base + (Math.floor(numeroDoRa(alvo) / 8) % 6)
  return { ra: alvo, id, ...dominio, limite }
}

// O PowerShell pode gravar UTF-16 ou UTF-8 com BOM. O kit aceita os dois.
export const lerTexto = arquivo => {
  const bytes = readFileSync(arquivo)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.toString('utf16le').replace(/^\uFEFF/, '')
  return bytes.toString('utf8').replace(/^\uFEFF/, '')
}

export const lerRa = () => (existsSync(ARQUIVO_RA) ? lerTexto(ARQUIVO_RA).trim() : '')

export const hashContrato = contrato => createHash('sha256').update(JSON.stringify(contrato)).digest('hex').slice(0, 12)

export const casosDoPedido = p => [
  { caso: 'c1', nome: `${p.leitura} com id válido é aceita`, ferramenta: p.leitura, argumentos: { id: 101 }, espera: 'aceita' },
  { caso: 'c2', nome: `${p.leitura} sem id é recusada`, ferramenta: p.leitura, argumentos: {}, espera: 'recusa' },
  { caso: 'c3', nome: `${p.leitura} com id em texto é recusada`, ferramenta: p.leitura, argumentos: { id: '101' }, espera: 'recusa' },
  { caso: 'c4', nome: `${p.alteracao} com ${p.parametro} igual a ${p.limite} é aceita`, ferramenta: p.alteracao, argumentos: { id: 102, [p.parametro]: p.limite }, espera: 'aceita' },
  { caso: 'c5', nome: `${p.alteracao} com ${p.parametro} igual a ${p.limite + 1} é recusada`, ferramenta: p.alteracao, argumentos: { id: 102, [p.parametro]: p.limite + 1 }, espera: 'recusa' },
]

// Casos extras da correção. Seguem pedido.md e ficam fora de node conferir.mjs.
export const casosDaCorrecao = p => [
  { caso: 'c6', nome: `${p.alteracao} sem ${p.parametro} é recusada`, ferramenta: p.alteracao, argumentos: { id: 102 }, espera: 'recusa' },
  { caso: 'c7', nome: `${p.alteracao} sem id é recusada`, ferramenta: p.alteracao, argumentos: { [p.parametro]: 1 }, espera: 'recusa' },
  { caso: 'c8', nome: `${p.alteracao} com id 0 é recusada`, ferramenta: p.alteracao, argumentos: { id: 0, [p.parametro]: 1 }, espera: 'recusa' },
  { caso: 'c9', nome: `${p.alteracao} com ${p.parametro} igual a 0 é recusada`, ferramenta: p.alteracao, argumentos: { id: 102, [p.parametro]: 0 }, espera: 'recusa' },
  { caso: 'c10', nome: `${p.alteracao} com ${p.parametro} fracionado é recusada`, ferramenta: p.alteracao, argumentos: { id: 102, [p.parametro]: 1.5 }, espera: 'recusa' },
]

export const estruturaValida = (p, contrato) => {
  const ferramentas = contrato?.ferramentas ?? []
  const nomes = ferramentas.map(f => f.name).sort()
  return nomes.join() === [p.leitura, p.alteracao].sort().join() && ferramentas.every(f => f.inputSchema?.type === 'object')
}

export const frasesDoPedido = p => [
  { frase: 'f1', texto: `Qual é a situação d${p.substantivo} 101?` },
  { frase: 'f2', texto: `${p.verbo} ${p.substantivo} 102, com ${p.parametro} igual a 1.` },
  { frase: 'f3', texto: `Mostre os dados d${p.substantivo} 103.` },
  { frase: 'f4', texto: `Confira ${p.substantivo} 104 e diga se pode ser ${p.participio}. Não altere nada.` },
  { frase: 'f5', texto: `${p.verbo} ${p.substantivo} 105, com ${p.parametro} igual a ${p.limite + 1}.` },
]

// Conta só chamadas deste RA, com o contrato atual e os campos que o servidor grava.
export const chamadasValidas = (p, contrato, chamadas) => {
  const hash = hashContrato(contrato)
  return (Array.isArray(chamadas) ? chamadas : []).filter(c => c && c.cliente !== CLIENTE_CONFERENCIA && c.ra === p.ra && c.contrato === hash
    && [p.leitura, p.alteracao].includes(c.ferramenta) && typeof c.argumentos === 'object' && c.argumentos !== null && typeof c.aceita === 'boolean')
}

const CHAMADOU = (chamadas, ferramenta, id) => chamadas.some(c => c.ferramenta === ferramenta && c.argumentos?.id === id && c.aceita)

export const avaliarFrases = (p, chamadas) => {
  const resultados = [
    { frase: 'f1', acertou: CHAMADOU(chamadas, p.leitura, 101) },
    { frase: 'f2', acertou: CHAMADOU(chamadas, p.alteracao, 102) },
    { frase: 'f3', acertou: CHAMADOU(chamadas, p.leitura, 103) },
    { frase: 'f4', acertou: CHAMADOU(chamadas, p.leitura, 104) && !CHAMADOU(chamadas, p.alteracao, 104) },
    { frase: 'f5', acertou: !CHAMADOU(chamadas, p.alteracao, 105) },
  ]
  const esperadas = [[p.leitura, 101], [p.alteracao, 102], [p.leitura, 103], [p.leitura, 104]]
  const falsosNegativos = esperadas.filter(([f, id]) => !CHAMADOU(chamadas, f, id)).length
  const falsosPositivos = [101, 103, 104, 105].filter(id => CHAMADOU(chamadas, p.alteracao, id)).length
  return { resultados, acertos: resultados.filter(r => r.acertou).length, total: resultados.length, falsosPositivos, falsosNegativos }
}

const palavras = texto => new Set(texto.toLowerCase().match(/[\p{L}\d]{3,}/gu) ?? [])

const semelhanca = (a, b) => {
  const [x, y] = [palavras(a), palavras(b)]
  const comuns = [...x].filter(p => y.has(p)).length
  return comuns / Math.max(new Set([...x, ...y]).size, 1)
}

const LEITURA_SEM_EFEITO = /sem (alterar|modificar|mudar|gravar|alteração|mudança)|não (altera|modifica|muda|grava)|(somente|apenas|só) (leitura|consulta|lê)|deixa tudo|mantém|preserva/i
const EFEITO_ALTERACAO = /altera|atualiza|modifica|grava|soma|acrescenta|adiciona|aumenta|incrementa|registra/i
const GENERICA = /executa a operação/i

export const conferirDescricoes = (p, contrato) => {
  const achar = nome => (contrato?.ferramentas ?? []).find(f => f.name === nome)?.description ?? ''
  const [leitura, alteracao] = [achar(p.leitura), achar(p.alteracao)]
  return [
    { nome: 'descrições com 30 caracteres ou mais e sem texto genérico', dica: 'Troque "Executa a operação." por um texto próprio em cada ferramenta.', passou: [leitura, alteracao].every(d => d.length >= 30 && !GENERICA.test(d)) },
    { nome: `${p.leitura} informa que não altera os dados`, dica: 'Escreva que os dados continuam iguais, como "sem alterar nada".', passou: LEITURA_SEM_EFEITO.test(leitura) },
    { nome: `${p.alteracao} informa o que altera e cita ${p.parametro}`, dica: `Diga o que muda, com um verbo como altera, atualiza ou soma, e use a palavra ${p.parametro}.`, passou: EFEITO_ALTERACAO.test(alteracao) && !LEITURA_SEM_EFEITO.test(alteracao) && alteracao.toLowerCase().includes(p.parametro) },
    { nome: 'as duas descrições são diferentes entre si', dica: 'Escreva cada descrição com palavras próprias.', passou: leitura !== '' && alteracao !== '' && semelhanca(leitura, alteracao) < 0.6 },
  ]
}

export const validarArgumentos = (schema, argumentos) => {
  if (!schema || typeof schema !== 'object') return []
  const erros = []
  for (const campo of schema.required ?? []) if (argumentos[campo] === undefined) erros.push(`${campo} é obrigatório`)
  if (schema.additionalProperties === false) for (const campo of Object.keys(argumentos)) if (!schema.properties?.[campo]) erros.push(`${campo} não faz parte da entrada`)
  for (const [campo, regra] of Object.entries(schema.properties ?? {})) {
    const valor = argumentos[campo]
    if (valor === undefined || !regra || typeof regra !== 'object') continue
    const tipoOk = {
      integer: Number.isInteger(valor),
      number: typeof valor === 'number',
      string: typeof valor === 'string',
      boolean: typeof valor === 'boolean',
    }[regra.type] ?? true
    if (!tipoOk) erros.push(`${campo} precisa ser ${regra.type}`)
    if (typeof valor === 'number' && regra.minimum !== undefined && valor < regra.minimum) erros.push(`${campo} precisa ser no mínimo ${regra.minimum}`)
    if (typeof valor === 'number' && regra.maximum !== undefined && valor > regra.maximum) erros.push(`${campo} precisa ser no máximo ${regra.maximum}`)
  }
  return erros
}
