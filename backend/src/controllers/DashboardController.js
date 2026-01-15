const connection = require("../database/connection");

module.exports = {
  // GET /dashboard/estatisticas-hoje
  async estatisticasHoje(request, response) {
    try {
      // Total de visitantes cadastrados
      const totalVisitantesResult = await connection("cadastro_visitante")
        .count("id as total")
        .first();
      const totalVisitantes = parseInt(totalVisitantesResult?.total || 0);

      // Visitantes que entraram hoje (baseado em historico_visitante)
      // A coluna correta é entry_date
      const visitantesHojeResult = await connection("historico_visitante")
        .whereRaw("DATE(entry_date) = CURRENT_DATE")
        .count("id as total")
        .first();
      const visitantesHoje = parseInt(visitantesHojeResult?.total || 0);

      // Cadastros feitos hoje (baseado em cadastro_visitante.criado_em)
      const cadastrosHojeResult = await connection("cadastro_visitante")
        .whereRaw("DATE(criado_em) = CURRENT_DATE")
        .count("id as total")
        .first();
      const cadastrosHoje = parseInt(cadastrosHojeResult?.total || 0);

      // Total de agendamentos pendentes (não confirmados ou confirmados sem presença)
      const agendamentosResult = await connection("agendamentos")
        .where("presente", false)
        .count("id as total")
        .first();
      const agendamentos = parseInt(agendamentosResult?.total || 0);

      // Total de tickets abertos
      const ticketsResult = await connection("tickets")
        .whereNot("status", "resolvido")
        .count("id as total")
        .first();
      const tickets = parseInt(ticketsResult?.total || 0);

      // Visitantes por hora (entradas de hoje) - usando entry_date
      const visitantesPorHoraRaw = await connection("historico_visitante")
        .select(connection.raw("EXTRACT(HOUR FROM entry_date) as hora"))
        .count("id as quantidade")
        .whereRaw("DATE(entry_date) = CURRENT_DATE")
        .groupByRaw("EXTRACT(HOUR FROM entry_date)")
        .orderByRaw("hora");

      // Cadastros por hora - usando cadastro_visitante.criado_em
      const cadastrosPorHoraRaw = await connection("cadastro_visitante")
        .select(connection.raw("EXTRACT(HOUR FROM criado_em) as hora"))
        .count("id as quantidade")
        .whereRaw("DATE(criado_em) = CURRENT_DATE")
        .groupByRaw("EXTRACT(HOUR FROM criado_em)")
        .orderByRaw("hora");

      // Formatar dados dos gráficos
      const visitantesPorHora = visitantesPorHoraRaw.map((item) => ({
        hora: parseInt(item.hora),
        quantidade: parseInt(item.quantidade),
      }));

      const cadastrosPorHora = cadastrosPorHoraRaw.map((item) => ({
        hora: parseInt(item.hora),
        quantidade: parseInt(item.quantidade),
      }));

      return response.json({
        totalVisitantes,
        visitantesHoje,
        cadastrosHoje,
        agendamentos,
        tickets,
        visitantesPorHora,
        cadastrosPorHora,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas do dashboard:", error);
      return response.status(500).json({
        error: "Erro ao buscar estatísticas do dashboard",
      });
    }
  },
};
