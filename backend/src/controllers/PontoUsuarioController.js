const connection = require("../database/connection");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // REGISTRAR PONTO
  // ═══════════════════════════════════════════════════════════════
  async registrar(req, res) {
    const io = getIo();
    const user_id = getUsuarioId(req);

    if (!user_id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    try {
      const {
        funcionario_id,
        nome_funcionario,
        setor_id,
        data,
        hora,
        tipo_ponto,
        latitude,
        longitude,
      } = req.body;

      // ✅ BUSCAR empresa_id DA TABELA USUARIOS
      const usuario = await connection("usuarios")
        .where({ id: user_id })
        .select("empresa_id")
        .first();

      if (!usuario || !usuario.empresa_id) {
        return res.status(400).json({
          error: "Empresa não identificada para este usuário",
        });
      }

      const empresa_id = usuario.empresa_id;

      console.log("📥 Dados recebidos:", {
        funcionario_id,
        nome_funcionario,
        setor_id,
        data,
        hora,
        tipo_ponto,
        empresa_id,
      });

      // Validação de duplicidade
      const registroExistente = await connection("registros_ponto")
        .where({
          funcionario_id,
          data,
          tipo_ponto,
          empresa_id,
        })
        .first();

      if (registroExistente) {
        return res.status(400).json({
          error: `Já existe um registro de ${tipo_ponto} para esta data`,
        });
      }

      // ✅ Inserção usando Knex puro (sem raw)
      const registro = {
        funcionario_id,
        nome_funcionario,
        setor_id: Number(setor_id),
        data,
        hora: `${data} ${hora}`, // "2026-01-02 17:28:43"
        tipo_ponto,
        latitude: latitude || null,
        longitude: longitude || null,
        empresa_id,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now(),
      };

      const [id] = await connection("registros_ponto")
        .insert(registro)
        .returning("id");

      console.log("✅ Ponto registrado com ID:", id);

      // Atualiza o histórico consolidado
      await atualizarHistoricoConsolidado(
        funcionario_id,
        nome_funcionario,
        Number(setor_id),
        data,
        empresa_id
      );

      // Emitir evento socket
      io.to("global").emit("ponto:registrado", {
        id,
        funcionario_id,
        nome_funcionario,
        tipo_ponto,
        data,
        hora,
      });

      return res.status(201).json({
        id,
        message: "Ponto registrado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao registrar ponto:", error);
      return res.status(500).json({
        error: "Erro ao registrar ponto",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR HISTÓRICO DO USUÁRIO
  // ═══════════════════════════════════════════════════════════════
  async historicoUsuario(req, res) {
    const user_id = getUsuarioId(req);

    if (!user_id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    try {
      const { funcionario_id, dataInicio, dataFim } = req.query;

      if (!funcionario_id) {
        return res
          .status(400)
          .json({ error: "ID do funcionário não fornecido" });
      }

      // Buscar empresa_id do usuário
      const usuario = await connection("usuarios")
        .where({ id: user_id })
        .select("empresa_id")
        .first();

      if (!usuario) {
        return res.status(400).json({ error: "Usuário não encontrado" });
      }

      let query = connection("registros_ponto")
        .where({
          funcionario_id,
          empresa_id: usuario.empresa_id,
        })
        .orderBy("data", "desc")
        .orderBy("hora", "asc");

      if (dataInicio) {
        query = query.where("data", ">=", dataInicio);
      }

      if (dataFim) {
        query = query.where("data", "<=", dataFim);
      }

      const registros = await query;

      return res.json(registros);
    } catch (error) {
      console.error("❌ Erro ao buscar histórico:", error);
      return res.status(500).json({
        error: "Erro ao buscar histórico",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR HISTÓRICO POR CRACHÁ (ADMIN)
  // ═══════════════════════════════════════════════════════════════
  async historicoPorCracha(req, res) {
    const user_id = getUsuarioId(req);

    if (!user_id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    try {
      const { cracha, dataInicio, dataFim } = req.query;

      if (!cracha) {
        return res.status(400).json({ error: "Crachá não fornecido" });
      }

      const usuario = await connection("usuarios")
        .where({ id: user_id })
        .select("empresa_id")
        .first();

      if (!usuario) {
        return res.status(400).json({ error: "Usuário não encontrado" });
      }

      let query = connection("historico_ponto_diario")
        .where({
          funcionario_id: cracha,
          empresa_id: usuario.empresa_id,
        })
        .orderBy("data", "desc");

      if (dataInicio) {
        query = query.where("data", ">=", dataInicio);
      }

      if (dataFim) {
        query = query.where("data", "<=", dataFim);
      }

      const registros = await query;

      const registrosFormatados = registros.map((r) => ({
        id: r.id,
        data: r.data,
        hora_entrada: r.hora_entrada,
        hora_saida: r.hora_saida,
        total_horas: r.total_horas_trabalhadas,
      }));

      return res.json({ registros: registrosFormatados });
    } catch (error) {
      console.error("❌ Erro ao buscar histórico por crachá:", error);
      return res.status(500).json({
        error: "Erro ao buscar histórico",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR REGISTROS DE UM DIA ESPECÍFICO
  // ═══════════════════════════════════════════════════════════════
  async registrosDia(req, res) {
    const user_id = getUsuarioId(req);

    if (!user_id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    try {
      const { funcionario_id, data } = req.query;

      if (!funcionario_id || !data) {
        return res
          .status(400)
          .json({ error: "Dados obrigatórios não fornecidos" });
      }

      const usuario = await connection("usuarios")
        .where({ id: user_id })
        .select("empresa_id")
        .first();

      if (!usuario) {
        return res.status(400).json({ error: "Usuário não encontrado" });
      }

      const registros = await connection("registros_ponto")
        .where({
          funcionario_id,
          data,
          empresa_id: usuario.empresa_id,
        })
        .orderBy("hora", "asc");

      return res.json(registros);
    } catch (error) {
      console.error("❌ Erro ao buscar registros do dia:", error);
      return res.status(500).json({
        error: "Erro ao buscar registros do dia",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIO DE PONTOS (ADMIN)
  // ═══════════════════════════════════════════════════════════════
  async relatorio(req, res) {
    const user_id = getUsuarioId(req);

    if (!user_id) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    try {
      const { dataInicio, dataFim, setor_id } = req.query;

      const usuario = await connection("usuarios")
        .where({ id: user_id })
        .select("empresa_id")
        .first();

      if (!usuario) {
        return res.status(400).json({ error: "Usuário não encontrado" });
      }

      let query = connection("historico_ponto_diario")
        .leftJoin("setores", "historico_ponto_diario.setor_id", "setores.id")
        .where("historico_ponto_diario.empresa_id", usuario.empresa_id)
        .select("historico_ponto_diario.*", "setores.name as setor_nome")
        .orderBy("historico_ponto_diario.data", "desc");

      if (dataInicio) {
        query = query.where("historico_ponto_diario.data", ">=", dataInicio);
      }

      if (dataFim) {
        query = query.where("historico_ponto_diario.data", "<=", dataFim);
      }

      if (setor_id) {
        query = query.where("historico_ponto_diario.setor_id", setor_id);
      }

      const registros = await query;

      return res.json(registros);
    } catch (error) {
      console.error("❌ Erro ao gerar relatório:", error);
      return res.status(500).json({
        error: "Erro ao gerar relatório",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// FUNÇÃO AUXILIAR - ATUALIZAR HISTÓRICO CONSOLIDADO
// ═══════════════════════════════════════════════════════════════
async function atualizarHistoricoConsolidado(
  funcionario_id,
  nome_funcionario,
  setor_id,
  data,
  empresa_id
) {
  try {
    const registrosDoDia = await connection("registros_ponto")
      .where({
        funcionario_id,
        data,
        empresa_id,
      })
      .orderBy("hora", "asc");

    const registrosMap = {};
    registrosDoDia.forEach((r) => {
      // Extrair apenas HH:MM:SS
      let horaStr = r.hora;
      if (horaStr instanceof Date) {
        horaStr = horaStr.toTimeString().split(" ")[0];
      } else if (typeof horaStr === "string" && horaStr.includes(" ")) {
        horaStr = horaStr.split(" ")[1];
      }

      registrosMap[r.tipo_ponto] = horaStr;
    });

    // Calcular total de horas
    let totalHoras = null;
    if (registrosMap.ENTRADA && registrosMap.SAIDA) {
      const entrada = new Date(`1970-01-01T${registrosMap.ENTRADA}`);
      const saida = new Date(`1970-01-01T${registrosMap.SAIDA}`);
      totalHoras = Math.floor((saida - entrada) / 1000);
    }

    const historicoExistente = await connection("historico_ponto_diario")
      .where({
        funcionario_id,
        data,
        empresa_id,
      })
      .first();

    const dadosHistorico = {
      funcionario_id,
      nome_funcionario,
      setor_id,
      data,
      hora_entrada: registrosMap.ENTRADA
        ? `${data} ${registrosMap.ENTRADA}`
        : null,
      hora_intervalo_entrada: registrosMap.INTERVALO_ENTRADA
        ? `${data} ${registrosMap.INTERVALO_ENTRADA}`
        : null,
      hora_intervalo_saida: registrosMap.INTERVALO_SAIDA
        ? `${data} ${registrosMap.INTERVALO_SAIDA}`
        : null,
      hora_saida: registrosMap.SAIDA ? `${data} ${registrosMap.SAIDA}` : null,
      total_horas_trabalhadas: totalHoras,
      empresa_id,
    };

    if (historicoExistente) {
      await connection("historico_ponto_diario")
        .where({ id: historicoExistente.id })
        .update(dadosHistorico);
    } else {
      await connection("historico_ponto_diario").insert({
        ...dadosHistorico,
        created_at: connection.fn.now(),
      });
    }

    console.log("✅ Histórico consolidado atualizado");
  } catch (error) {
    console.error("❌ Erro ao atualizar histórico consolidado:", error);
  }
}
