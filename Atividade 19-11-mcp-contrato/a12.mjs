// Funções da atividade do tester. Usadas por testar.mjs e pela correção.
// Os casos de casos.json rodam pelo protocolo MCP no contrato correto do RA,
// em oito contratos com um defeito cada e no contrato.json da pasta.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { executarCasos } from './cliente.mjs'

export const contratoCorreto = p => {
  const id = { type: 'integer', minimum: 1 }
  return {
    ferramentas: [
      {
        name: p.leitura,
        description: `Consulta os dados de um registro de ${p.tema} pelo id, sem alterar nada.`,
        inputSchema: { type: 'object', properties: { id }, required: ['id'] },
      },
      {
        name: p.alteracao,
        description: `Soma ${p.parametro} ao total do registro. Use somente quando o pedido mandar fazer essa mudança.`,
        inputSchema: {
          type: 'object',
          properties: { id, [p.parametro]: { type: 'integer', minimum: 1, maximum: p.limite } },
          required: ['id', p.parametro],
        },
      },
    ],
  }
}

// Cada defeito muda uma regra de pedido.md.
export const defeitos = p => [
  { id: 'd1', nome: `${p.leitura} sem id obrigatório`, aplicar: c => { c.ferramentas[0].inputSchema.required = [] } },
  { id: 'd2', nome: `${p.leitura} aceita id fracionado`, aplicar: c => { c.ferramentas[0].inputSchema.properties.id = { type: 'number', minimum: 1 } } },
  { id: 'd3', nome: `${p.leitura} sem mínimo no id`, aplicar: c => { c.ferramentas[0].inputSchema.properties.id = { type: 'integer' } } },
  { id: 'd4', nome: `${p.alteracao} sem ${p.parametro} obrigatório`, aplicar: c => { c.ferramentas[1].inputSchema.required = ['id'] } },
  { id: 'd5', nome: `${p.alteracao} aceita ${p.parametro} fracionado`, aplicar: c => { c.ferramentas[1].inputSchema.properties[p.parametro].type = 'number' } },
  { id: 'd6', nome: `${p.alteracao} sem mínimo em ${p.parametro}`, aplicar: c => { delete c.ferramentas[1].inputSchema.properties[p.parametro].minimum } },
  { id: 'd7', nome: `${p.alteracao} com máximo ${p.limite + 1}`, aplicar: c => { c.ferramentas[1].inputSchema.properties[p.parametro].maximum = p.limite + 1 } },
  { id: 'd8', nome: `${p.alteracao} com máximo ${p.limite - 1}`, aplicar: c => { c.ferramentas[1].inputSchema.properties[p.parametro].maximum = p.limite - 1 } },
]

// Defeito que o aluno explica em analise.md, sorteado pelo RA, e a palavra do inputSchema que ele muda.
const PALAVRA = { d1: 'required', d2: 'integer', d3: 'minimum', d4: 'required', d5: 'integer', d6: 'minimum', d7: 'maximum', d8: 'maximum' }

export const defeitoDaAnalise = ra => {
  const n = /^\d{6,10}-\d$/.test(String(ra)) ? Number(String(ra).split('-')[0]) : 4 * 48
  const id = `d${(Math.floor(n / 48) % 8) + 1}`
  return { id, palavra: PALAVRA[id] }
}

// Confere analise.md. Resposta 1: os dois valores da fronteira do máximo, L e L+1.
// Resposta 2: o defeito sorteado e a palavra-chave que ele muda. A leitura do texto fica com o professor.
export const conferirAnalise = (p, texto) => {
  const t = String(texto ?? '')
  const semDefeitos = t.replace(/\bd\d\b/gi, ' ')
  const numeros = new Set((semDefeitos.match(/\d+/g) ?? []).map(Number))
  const d = defeitoDaAnalise(p.ra)
  return {
    defeito: d.id,
    fronteiras: numeros.has(p.limite) && numeros.has(p.limite + 1),
    palavra: new RegExp(`\\b${d.id}\\b`, 'i').test(t) && new RegExp(`\\b${d.palavra}\\b`, 'i').test(t),
  }
}

const ESPERAS = ['aceita', 'recusa']

// Confere o formato de casos.json. Devolve { erro } ou { casos }.
export const lerCasos = (texto, p) => {
  let dados
  try {
    dados = JSON.parse(texto)
  } catch (erro) {
    return { erro: `O arquivo de casos não é JSON válido: ${erro.message}` }
  }
  const lista = Array.isArray(dados) ? dados : dados?.casos
  if (!Array.isArray(lista) || lista.length === 0) return { erro: 'O arquivo de casos precisa ter a lista "casos" com pelo menos um caso.' }
  const ferramentas = [p.leitura, p.alteracao]
  for (const [i, c] of lista.entries()) {
    const onde = `caso ${i + 1}${c?.nome ? ` (${c.nome})` : ''}`
    if (!c || typeof c !== 'object') return { erro: `${onde} não é um objeto.` }
    if (!ferramentas.includes(c.ferramenta)) return { erro: `${onde}: "ferramenta" precisa ser ${ferramentas.join(' ou ')}.` }
    if (!c.argumentos || typeof c.argumentos !== 'object' || Array.isArray(c.argumentos)) return { erro: `${onde}: "argumentos" precisa ser um objeto.` }
    if (!ESPERAS.includes(c.espera)) return { erro: `${onde}: "espera" precisa ser "aceita" ou "recusa".` }
  }
  return { casos: lista.map((c, i) => ({ caso: `t${i + 1}`, nome: String(c.nome ?? ''), ferramenta: c.ferramenta, argumentos: c.argumentos, espera: c.espera })) }
}

// Roda os casos num contrato gravado em pasta temporária. Cada caso volta com o resultado obtido.
const rodar = async (p, contrato, casos) => {
  const pasta = mkdtempSync(join(tmpdir(), 'a12-'))
  try {
    const arquivo = join(pasta, 'contrato.json')
    writeFileSync(arquivo, JSON.stringify(contrato))
    return await executarCasos(p, casos, { MCP_AULA_CONTRATO: arquivo })
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}

const copiar = objeto => JSON.parse(JSON.stringify(objeto))

// Resultado completo. contratoPasta é opcional e só informativo.
export const avaliar = async (p, casos, contratoPasta) => {
  const correto = await rodar(p, contratoCorreto(p), casos)
  const foraDoContrato = correto.filter(c => c.obtido === 'outro')
  const errados = correto.filter(c => c.obtido !== 'outro' && c.obtido !== c.espera)
  const validos = casos.filter((c, i) => correto[i].obtido === c.espera)
  const resultadoDefeitos = []
  for (const d of defeitos(p)) {
    const contrato = copiar(contratoCorreto(p))
    d.aplicar(contrato)
    const obtidos = validos.length > 0 ? await rodar(p, contrato, validos) : []
    const matou = obtidos.find(c => c.obtido !== c.espera)
    resultadoDefeitos.push({ id: d.id, nome: d.nome, detectado: Boolean(matou), caso: matou ? `${matou.caso} ${matou.nome}`.trim() : null })
  }
  let pasta = null
  if (contratoPasta) {
    try {
      const obtidos = validos.length > 0 ? await rodar(p, contratoPasta, validos) : []
      pasta = { falhas: obtidos.filter(c => c.obtido !== c.espera).map(c => ({ caso: c.caso, nome: c.nome, espera: c.espera, obtido: c.obtido, resposta: c.resposta })) }
    } catch (erro) {
      pasta = { erro: erro.message }
    }
  }
  return {
    total: casos.length,
    casos: correto.map(c => ({ caso: c.caso, nome: c.nome, ferramenta: c.ferramenta, argumentos: c.argumentos, espera: c.espera, obtido: c.obtido, resposta: c.resposta })),
    errados: errados.length,
    foraDoContrato: foraDoContrato.length,
    defeitos: resultadoDefeitos,
    detectados: resultadoDefeitos.filter(d => d.detectado).length,
    contratoPasta: pasta,
  }
}
