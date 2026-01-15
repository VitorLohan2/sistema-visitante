const connection = require("../database/connection");

module.exports = {
  // Listagem completa do histórico
  async index(request, response) {
    const usuario_id = request.headers.authorization;

    try {
      const history = await connection("historico_visitante")
        //.where('usuario_id', usuario_id)
        .select([
          "id",
          "nome",
          "cpf",
          "empresa",
          "setor",
          "data_de_entrada",
          "data_de_saida",
        ])
        .orderBy("data_de_saida", "desc");

      const formattedHistory = history.map((record) => {
        const duration = module.exports.calculateDuration(
          record.data_de_entrada,
          record.data_de_saida
        );
        return {
          ...record,
          duration,
          data_de_entrada: new Date(record.data_de_entrada).toLocaleString(
            "pt-BR"
          ),
          data_de_saida: new Date(record.data_de_saida).toLocaleString("pt-BR"),
        };
      });

      return response.json(formattedHistory);
    } catch (err) {
      console.error("Erro no histórico:", err);
      return response.status(500).json({
        error: "Erro ao carregar histórico",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  // Criação manual de um registro histórico
  async create(request, response) {
    const transaction = await connection.transaction();

    try {
      const { nome, cpf, empresa, setor, data_de_entrada } = request.body;
      const usuario_id = request.headers.authorization;

      if (!nome || !cpf || !empresa || !setor) {
        await transaction.rollback();
        return response.status(400).json({ error: "Dados incompletos" });
      }

      const historyRecord = {
        nome,
        cpf,
        empresa,
        setor,
        data_de_entrada: data_de_entrada || new Date().toISOString(),
        data_de_saida: new Date().toISOString(),
        usuario_id,
      };

      const [record] = await connection("historico_visitante")
        .transacting(transaction)
        .insert(historyRecord)
        .returning("id");

      await transaction.commit();

      return response.status(201).json({
        id: record.id,
        ...historyRecord,
        message: "Registro criado com sucesso",
      });
    } catch (err) {
      await transaction.rollback();
      console.error("Erro ao criar histórico:", err);
      return response.status(400).json({
        error: "Erro ao criar registro",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  // Estatísticas sobre as visitas
  async stats(request, response) {
    const usuario_id = request.headers.authorization;

    try {
      const stats = await connection("historico_visitante")
        //.where('usuario_id', usuario_id)
        .select(
          connection.raw("COUNT(*) AS total_visits"),
          connection.raw(
            "AVG(EXTRACT(EPOCH FROM (data_de_saida - data_de_entrada)) / 60) AS avg_duration"
          ),
          connection.raw(
            "MAX(EXTRACT(EPOCH FROM (data_de_saida - data_de_entrada)) / 60) AS max_duration"
          ),
          connection.raw(
            "MIN(EXTRACT(EPOCH FROM (data_de_saida - data_de_entrada)) / 60) AS min_duration"
          ),
          connection.raw(
            "SUM(EXTRACT(EPOCH FROM (data_de_saida - data_de_entrada)) / 60) AS total_time"
          )
        )
        .first();

      const formattedStats = {
        total_visits: Number(stats.total_visits),
        avg_duration: module.exports.formatDuration(
          parseFloat(stats.avg_duration)
        ),
        max_duration: module.exports.formatDuration(
          parseFloat(stats.max_duration)
        ),
        min_duration: module.exports.formatDuration(
          parseFloat(stats.min_duration)
        ),
        total_time: module.exports.formatDuration(parseFloat(stats.total_time)),
      };

      return response.json(formattedStats);
    } catch (err) {
      console.error("Erro nas estatísticas:", err);
      return response.status(500).json({
        error: "Erro ao calcular estatísticas",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  // Utilitário: calcula duração entre duas datas
  calculateDuration(entryDate, exitDate) {
    const minutes = Math.floor(
      (new Date(exitDate) - new Date(entryDate)) / (1000 * 60)
    );
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },

  // Utilitário: formata minutos em horas:minutos
  formatDuration(minutes) {
    if (!minutes || isNaN(minutes)) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  },
};
