// Os domínios da atividade. Cada RA recebe um domínio e um limite próprios.
const registros = nomes => nomes.map((nome, i) => ({ id: 101 + i, nome, total: 0 }))

export const DOMINIOS = {
  E: { tema: 'salas de estudo', substantivo: 'a sala', leitura: 'consultar_sala', alteracao: 'reservar_sala', parametro: 'horas', unidade: 'horas', verbo: 'Reserve', participio: 'reservada', base: 4,
    registros: registros(['Sala Ada', 'Sala Turing', 'Sala Hopper', 'Sala Dijkstra', 'Sala Knuth']) },
  T: { tema: 'assinaturas', substantivo: 'a assinatura', leitura: 'consultar_assinatura', alteracao: 'pausar_assinatura', parametro: 'dias', unidade: 'dias', verbo: 'Pause', participio: 'pausada', base: 30,
    registros: registros(['Plano Básico', 'Plano Família', 'Plano Estudante', 'Plano Anual', 'Plano Empresa']) },
  D1: { tema: 'biblioteca', substantivo: 'o empréstimo', leitura: 'consultar_emprestimo', alteracao: 'renovar_emprestimo', parametro: 'dias', unidade: 'dias', verbo: 'Renove', participio: 'renovado', base: 7,
    registros: registros(['Dom Casmurro', 'Vidas Secas', 'Capitães da Areia', 'Iracema', 'O Cortiço']) },
  D2: { tema: 'estoque', substantivo: 'o produto', leitura: 'consultar_produto', alteracao: 'repor_produto', parametro: 'quantidade', unidade: 'unidades', verbo: 'Reponha', participio: 'reposto', base: 20,
    registros: registros(['Teclado', 'Mouse', 'Monitor', 'Cabo HDMI', 'Webcam']) },
  D3: { tema: 'clínica', substantivo: 'o agendamento', leitura: 'consultar_agendamento', alteracao: 'adiar_agendamento', parametro: 'dias', unidade: 'dias', verbo: 'Adie', participio: 'adiado', base: 10,
    registros: registros(['Clínica geral', 'Cardiologia', 'Dermatologia', 'Ortopedia', 'Pediatria']) },
  D4: { tema: 'estacionamento', substantivo: 'a vaga', leitura: 'consultar_vaga', alteracao: 'reservar_vaga', parametro: 'horas', unidade: 'horas', verbo: 'Reserve', participio: 'reservada', base: 6,
    registros: registros(['Vaga A1', 'Vaga A2', 'Vaga B1', 'Vaga B2', 'Vaga C1']) },
  D5: { tema: 'academia', substantivo: 'a matrícula', leitura: 'consultar_matricula', alteracao: 'estender_matricula', parametro: 'meses', unidade: 'meses', verbo: 'Estenda', participio: 'estendida', base: 6,
    registros: registros(['Musculação', 'Natação', 'Pilates', 'Yoga', 'Crossfit']) },
  D6: { tema: 'hotel', substantivo: 'a reserva', leitura: 'consultar_reserva', alteracao: 'prorrogar_reserva', parametro: 'noites', unidade: 'noites', verbo: 'Prorrogue', participio: 'prorrogada', base: 5,
    registros: registros(['Quarto 11', 'Quarto 12', 'Quarto 21', 'Quarto 22', 'Quarto 31']) },
  D7: { tema: 'frota', substantivo: 'o veículo', leitura: 'consultar_veiculo', alteracao: 'abastecer_veiculo', parametro: 'litros', unidade: 'litros', verbo: 'Abasteça', participio: 'abastecido', base: 30,
    registros: registros(['Furgão', 'Picape', 'Caminhão', 'Sedã', 'Utilitário']) },
  D8: { tema: 'cantina', substantivo: 'a conta', leitura: 'consultar_conta', alteracao: 'recarregar_conta', parametro: 'reais', unidade: 'reais', verbo: 'Recarregue', participio: 'recarregada', base: 50,
    registros: registros(['Conta de Ana', 'Conta de Bruno', 'Conta de Carla', 'Conta de Davi', 'Conta de Eva']) },
}
