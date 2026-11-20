// Executa os casos de casos.json no contrato correto do RA e em oito contratos com um defeito cada.
// Uso: node testar.mjs, ou node testar.mjs outro-arquivo.json
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ARQUIVO_CONTRATO, PASTA, lerRa, lerTexto, montarPedido, raValido } from './comum.mjs'
import { avaliar, defeitoDaAnalise, lerCasos } from './a12.mjs'

const PASTAS_AGENTES = [['.agents', 'agents'], ['.claude', 'agents'], ['.codex', 'agents']]

const agentes = () => PASTAS_AGENTES.flatMap(partes => {
  const pasta = join(PASTA, ...partes)
  if (!existsSync(pasta)) return []
  return readdirSync(pasta).filter(n => /\.(md|toml)$/.test(n)).map(n => ({ arquivo: [...partes, n].join('/'), texto: lerTexto(join(pasta, n)).slice(0, 4000) }))
})

const mostrar = (rotulo, texto) => console.log(`${rotulo.padEnd(14)} ${texto}`)
const resumo = c => `${c.caso} ${c.ferramenta} ${JSON.stringify(c.argumentos)}, espera ${c.espera}`

const principal = async () => {
  const alvo = lerRa()
  if (!alvo) {
    console.error('Execute node pedido.mjs <seu RA> antes de testar.')
    return 2
  }
  const p = montarPedido(alvo)
  const arquivo = resolve(PASTA, process.argv[2] ?? 'casos.json')
  if (!existsSync(arquivo)) {
    console.error(`${arquivo} não existe. Peça ao agente tester que grave casos.json a partir de pedido.md.`)
    return 2
  }
  const texto = lerTexto(arquivo)
  const lidos = lerCasos(texto, p)
  if (lidos.erro) {
    console.error(lidos.erro)
    return 1
  }
  let contratoPasta = null
  try {
    contratoPasta = existsSync(ARQUIVO_CONTRATO) ? JSON.parse(lerTexto(ARQUIVO_CONTRATO)) : null
  } catch {
    contratoPasta = null
  }
  const r = await avaliar(p, lidos.casos, contratoPasta)

  console.log(`${r.total} casos em ${process.argv[2] ?? 'casos.json'}. Domínio ${p.tema}, limite ${p.limite}.\n`)
  console.log('Contrato correto do pedido')
  for (const c of r.casos) {
    if (c.obtido === c.espera) mostrar('[ok]', resumo(c))
    else if (c.obtido === 'outro') mostrar('[fora]', `${resumo(c)}. O inputSchema aceita e o servidor responde "${c.resposta}"`)
    else mostrar('[caso errado]', `${resumo(c)}. O contrato correto dá ${c.obtido}`)
  }
  // Defeito que sobrevive aparece só com a ferramenta. A regra sem caso sai do pedido.md.
  console.log('\nContratos com um defeito')
  for (const d of r.defeitos) {
    if (d.detectado) mostrar('[detectado]', `${d.id} ${d.nome}, pelo caso ${d.caso.split(' ')[0]}`)
    else mostrar('[sobreviveu]', `${d.id} ${d.nome.split(' ')[0]}. Uma regra dessa ferramenta no pedido.md ficou sem caso que a quebre`)
  }

  if (r.contratoPasta?.falhas) {
    console.log('\nSeu contrato.json, informativo')
    if (r.contratoPasta.falhas.length === 0) console.log('Todos os casos válidos dão o mesmo resultado no seu contrato.')
    for (const f of r.contratoPasta.falhas) mostrar('[diferente]', `${f.caso} ${f.nome}: espera ${f.espera}, ${f.obtido === 'aceita' ? 'seu contrato aceita' : f.obtido === 'recusa' ? 'seu contrato recusa' : `seu inputSchema deixa passar e o servidor responde "${f.resposta}"`}`)
  }

  const lista = agentes()
  const arquivoAnalise = join(PASTA, 'analise.md')
  const analise = existsSync(arquivoAnalise) ? lerTexto(arquivoAnalise).slice(0, 4000) : null
  console.log(`\nDefeitos detectados: ${r.detectados} de ${r.defeitos.length}. Casos com esperado errado: ${r.errados}. Casos fora do contrato: ${r.foraDoContrato}.`)
  console.log(lista.length > 0 ? `Agentes encontrados: ${lista.map(a => a.arquivo).join(', ')}.` : 'Nenhum arquivo de agente em .agents/agents, .claude/agents ou .codex/agents.')
  console.log(`Defeito da sua análise: ${defeitoDaAnalise(alvo).id}.`)
  console.log(analise ? `analise.md encontrado, ${analise.trim().length} caracteres.` : 'analise.md não encontrado. A análise vale 0,10 e entra na evidência quando o arquivo existe.')

  if (!raValido(alvo)) {
    console.log(`\nContrato de ${alvo}. A evidência só é gravada com um RA.`)
    return r.errados === 0 && r.detectados === r.defeitos.length ? 0 : 1
  }
  const evidencia = {
    atividade: 'A12', ra: alvo, dominio: p.id, limite: p.limite, geradaEm: new Date().toISOString(),
    casosHash: createHash('sha256').update(texto).digest('hex').slice(0, 12), casosArquivo: JSON.parse(texto),
    resultado: r, agentes: lista, analise,
  }
  mkdirSync(join(PASTA, 'entrega'), { recursive: true })
  const saida = join(PASTA, 'entrega', `a12-${alvo}.json`)
  writeFileSync(saida, `${JSON.stringify(evidencia, null, 2)}\n`)
  console.log(`\nEvidência gravada em ${saida}. Envie o arquivo sem editar.`)
  return 0
}

process.exitCode = await principal()
