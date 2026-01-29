const connection = require("../database/connection");

// Timezone de Brasília
const TIMEZONE_BRASILIA = "America/Sao_Paulo";

module.exports = {
  // GET /dashboard/estatisticas-hoje
  async estatisticasHoje(request, response) {
    try {
      // Primeiro, vamos verificar qual é o timezone do banco de dados
      // para debug
      const timezoneCheck = await connection.raw("SHOW timezone");
      console.log("🕐 Timezone do PostgreSQL:", timezoneCheck.rows[0].TimeZone);

      // Total de visitantes cadastrados
      const totalVisitantesResult = await connection("cadastro_visitante")
        .count("id as total")
        .first();
      const totalVisitantes = parseInt(totalVisitantesResult?.total || 0);

      // Visitantes que entraram hoje (baseado em historico_visitante)
      // O timezone da sessão já está definido como America/Sao_Paulo via pool.afterCreate
      const visitantesHojeResult = await connection("historico_visitante")
        .whereRaw(`DATE(data_de_entrada) = CURRENT_DATE`)
        .count("id as total")
        .first();
      const visitantesHoje = parseInt(visitantesHojeResult?.total || 0);

      // Cadastros feitos hoje (baseado em cadastro_visitante.criado_em)
      const cadastrosHojeResult = await connection("cadastro_visitante")
        .whereRaw(`DATE(criado_em) = CURRENT_DATE`)
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

      // Visitantes por hora (entradas de hoje) - usando data_de_entrada
      // O timezone da sessão já está como America/Sao_Paulo, então EXTRACT retorna hora correta
      const visitantesPorHoraRaw = await connection("historico_visitante")
        .select(connection.raw(`EXTRACT(HOUR FROM data_de_entrada) as hora`))
        .count("id as quantidade")
        .whereRaw(`DATE(data_de_entrada) = CURRENT_DATE`)
        .groupByRaw(`EXTRACT(HOUR FROM data_de_entrada)`)
        .orderByRaw("hora");

      // Cadastros por hora - usando cadastro_visitante.criado_em
      const cadastrosPorHoraRaw = await connection("cadastro_visitante")
        .select(connection.raw(`EXTRACT(HOUR FROM criado_em) as hora`))
        .count("id as quantidade")
        .whereRaw(`DATE(criado_em) = CURRENT_DATE`)
        .groupByRaw(`EXTRACT(HOUR FROM criado_em)`)
        .orderByRaw("hora");

      // Log para debug
      console.log("📊 Visitantes por hora (raw):", visitantesPorHoraRaw);
      console.log("📊 Cadastros por hora (raw):", cadastrosPorHoraRaw);

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

  // GET /dashboard/visitantes-hoje - Lista detalhada de visitantes que entraram hoje
  async visitantesHoje(request, response) {
    try {
      // A tabela historico_visitante já tem os dados do visitante diretamente
      // (nome, cpf, empresa, etc.) - não precisa de JOIN com cadastro_visitante
      const visitantes = await connection("historico_visitante")
        .leftJoin(
          "empresa_atribuida",
          "empresa_atribuida.id",
          "=",
          "historico_visitante.empresa_atribuida_id",
        )
        .whereRaw(`DATE(historico_visitante.data_de_entrada) = CURRENT_DATE`)
        .orderBy("historico_visitante.data_de_entrada", "desc")
        .select([
          "historico_visitante.id",
          "historico_visitante.nome",
          "historico_visitante.cpf",
          "historico_visitante.empresa",
          "historico_visitante.setor",
          "historico_visitante.funcao",
          "historico_visitante.data_de_entrada",
          "historico_visitante.data_de_saida",
          "empresa_atribuida.nome as empresa_destino",
        ]);

      // Formatar dados
      const visitantesFormatados = visitantes.map((v) => ({
        id: v.id,
        nome: v.nome || "Visitante",
        cpf: v.cpf
          ? v.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
          : null,
        empresa: v.empresa || "Não informada",
        setor: v.setor || null,
        funcao: v.funcao || null,
        empresaDestino: v.empresa_destino || "Não informada",
        entrada: v.data_de_entrada,
        saida: v.data_de_saida,
        status: v.data_de_saida ? "saiu" : "presente",
      }));

      return response.json(visitantesFormatados);
    } catch (error) {
      console.error("Erro ao buscar visitantes de hoje:", error);
      return response.status(500).json({
        error: "Erro ao buscar visitantes de hoje",
      });
    }
  },

  // GET /dashboard/cadastros-hoje - Lista detalhada de cadastros realizados hoje
  async cadastrosHoje(request, response) {
    try {
      const cadastros = await connection("cadastro_visitante")
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          "cadastro_visitante.empresa_id",
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          "cadastro_visitante.setor_id",
        )
        .leftJoin(
          "usuarios",
          "usuarios.id",
          "=",
          "cadastro_visitante.usuario_id",
        )
        .whereRaw(`DATE(cadastro_visitante.criado_em) = CURRENT_DATE`)
        .orderBy("cadastro_visitante.criado_em", "desc")
        .select([
          "cadastro_visitante.id",
          "cadastro_visitante.nome",
          "cadastro_visitante.cpf",
          "cadastro_visitante.telefone",
          "cadastro_visitante.avatar_imagem",
          "cadastro_visitante.criado_em",
          "empresa_visitante.nome as empresa",
          "setor_visitante.nome as setor",
          "usuarios.nome as cadastrado_por",
        ]);

      // Formatar dados
      const cadastrosFormatados = cadastros.map((c) => ({
        id: c.id,
        nome: c.nome,
        cpf: c.cpf
          ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
          : null,
        telefone: c.telefone,
        avatar: c.avatar_imagem,
        empresa: c.empresa || "Não informada",
        setor: c.setor || "Não informado",
        cadastradoPor: c.cadastrado_por || "Sistema",
        criadoEm: c.criado_em,
      }));

      return response.json(cadastrosFormatados);
    } catch (error) {
      console.error("Erro ao buscar cadastros de hoje:", error);
      return response.status(500).json({
        error: "Erro ao buscar cadastros de hoje",
      });
    }
  },
};
