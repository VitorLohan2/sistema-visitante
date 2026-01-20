/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTROLLER: Ronda de Vigilante
 * Gerencia todas as operações do módulo de rondas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const connection = require("../database/connection");

/**
 * Registra uma ação na tabela de auditoria
 * @param {Object} dados - Dados da auditoria
 */
async function registrarAuditoria(dados, trx = null) {
  const db = trx || connection;
  await db("ronda_auditoria").insert({
    ronda_id: dados.ronda_id,
    usuario_id: dados.usuario_id,
    tipo_acao: dados.tipo_acao,
    descricao: dados.descricao,
    dados_json: JSON.stringify(dados.dados_json || {}),
    ip_usuario: dados.ip_usuario,
    user_agent: dados.user_agent,
  });
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do ponto 1
 * @param {number} lon1 - Longitude do ponto 1
 * @param {number} lat2 - Latitude do ponto 2
 * @param {number} lon2 - Longitude do ponto 2
 * @returns {number} Distância em metros
 */
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formata duração em segundos para string legível
 * @param {number} segundos - Duração em segundos
 * @returns {string} Duração formatada (ex: "1h 30min 45s")
 */
function formatarDuracao(segundos) {
  if (!segundos || segundos < 0) return "0s";

  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = Math.floor(segundos % 60);

  let resultado = "";
  if (horas > 0) resultado += `${horas}h `;
  if (minutos > 0) resultado += `${minutos}min `;
  if (segs > 0 || resultado === "") resultado += `${segs}s`;

  return resultado.trim();
}

module.exports = {
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * INICIAR RONDA
   * POST /rondas/iniciar
   * Permissão: ronda_iniciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async iniciar(request, response) {
    const trx = await connection.transaction();

    try {
      const usuario_id = request.usuario.id;
      const empresa_id = request.usuario.empresa_id;
      const { latitude, longitude, observacoes } = request.body;

      // Verificar se já existe ronda em andamento para este usuário
      const rondaEmAndamento = await trx("rondas")
        .where({ usuario_id, status: "em_andamento" })
        .first();

      if (rondaEmAndamento) {
        await trx.rollback();
        return response.status(400).json({
          error: "Você já possui uma ronda em andamento",
          code: "RONDA_EM_ANDAMENTO",
          ronda_id: rondaEmAndamento.id,
        });
      }

      // Criar nova ronda
      const [novaRonda] = await trx("rondas")
        .insert({
          usuario_id,
          empresa_id,
          status: "em_andamento",
          data_inicio: new Date(),
          latitude_inicio: latitude,
          longitude_inicio: longitude,
          observacoes,
        })
        .returning("*");

      // Registrar ponto inicial no trajeto
      if (latitude && longitude) {
        await trx("ronda_trajeto").insert({
          ronda_id: novaRonda.id,
          latitude,
          longitude,
          numero_sequencial: 1,
        });
      }

      // Registrar auditoria
      await registrarAuditoria(
        {
          ronda_id: novaRonda.id,
          usuario_id,
          tipo_acao: "INICIO",
          descricao: `Ronda #${novaRonda.id} iniciada`,
          dados_json: {
            latitude,
            longitude,
            data_inicio: novaRonda.data_inicio,
          },
          ip_usuario: request.ip,
          user_agent: request.headers["user-agent"],
        },
        trx
      );

      await trx.commit();

      console.log(
        `✅ Ronda #${novaRonda.id} iniciada pelo usuário #${usuario_id}`
      );

      return response.status(201).json({
        message: "Ronda iniciada com sucesso",
        ronda: {
          id: novaRonda.id,
          status: novaRonda.status,
          data_inicio: novaRonda.data_inicio,
          latitude_inicio: novaRonda.latitude_inicio,
          longitude_inicio: novaRonda.longitude_inicio,
        },
      });
    } catch (err) {
      await trx.rollback();
      console.error("❌ Erro ao iniciar ronda:", err);
      return response.status(500).json({
        error: "Erro ao iniciar ronda",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * REGISTRAR CHECKPOINT
   * POST /rondas/:id/checkpoint
   * Permissão: ronda_registrar_checkpoint
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async registrarCheckpoint(request, response) {
    const trx = await connection.transaction();

    try {
      const usuario_id = request.usuario.id;
      const { id } = request.params;
      const { latitude, longitude, descricao, foto_url } = request.body;

      // Buscar ronda com lock para evitar concorrência
      const ronda = await trx("rondas")
        .where({ id, usuario_id, status: "em_andamento" })
        .forUpdate()
        .first();

      if (!ronda) {
        await trx.rollback();
        return response.status(404).json({
          error: "Ronda não encontrada ou não está em andamento",
          code: "RONDA_NAO_ENCONTRADA",
        });
      }

      // Buscar último checkpoint para calcular tempo e distância
      const ultimoCheckpoint = await trx("ronda_checkpoints")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "desc")
        .first();

      const agora = new Date();
      let tempoDesdeAnterior = 0;
      let distanciaDesdeAnterior = 0;
      let numeroSequencial = 1;

      if (ultimoCheckpoint) {
        numeroSequencial = ultimoCheckpoint.numero_sequencial + 1;
        tempoDesdeAnterior = Math.floor(
          (agora - new Date(ultimoCheckpoint.data_hora)) / 1000
        );
        distanciaDesdeAnterior = calcularDistanciaHaversine(
          ultimoCheckpoint.latitude,
          ultimoCheckpoint.longitude,
          latitude,
          longitude
        );
      } else {
        // Primeiro checkpoint - calcular desde o início da ronda
        if (ronda.latitude_inicio && ronda.longitude_inicio) {
          tempoDesdeAnterior = Math.floor(
            (agora - new Date(ronda.data_inicio)) / 1000
          );
          distanciaDesdeAnterior = calcularDistanciaHaversine(
            ronda.latitude_inicio,
            ronda.longitude_inicio,
            latitude,
            longitude
          );
        }
      }

      // Inserir checkpoint
      const [novoCheckpoint] = await trx("ronda_checkpoints")
        .insert({
          ronda_id: id,
          numero_sequencial: numeroSequencial,
          latitude,
          longitude,
          descricao,
          foto_url,
          tempo_desde_anterior_segundos: tempoDesdeAnterior,
          distancia_desde_anterior_metros: distanciaDesdeAnterior,
        })
        .returning("*");

      // Atualizar contador de checkpoints na ronda
      await trx("rondas")
        .where({ id })
        .update({
          total_checkpoints: numeroSequencial,
          versao: ronda.versao + 1,
        });

      // Registrar auditoria
      await registrarAuditoria(
        {
          ronda_id: id,
          usuario_id,
          tipo_acao: "CHECKPOINT",
          descricao: `Checkpoint #${numeroSequencial} registrado na ronda #${id}`,
          dados_json: {
            checkpoint_id: novoCheckpoint.id,
            numero_sequencial: numeroSequencial,
            latitude,
            longitude,
            descricao,
            tempo_desde_anterior: formatarDuracao(tempoDesdeAnterior),
            distancia_desde_anterior_metros: distanciaDesdeAnterior.toFixed(2),
          },
          ip_usuario: request.ip,
          user_agent: request.headers["user-agent"],
        },
        trx
      );

      await trx.commit();

      console.log(
        `✅ Checkpoint #${numeroSequencial} registrado na ronda #${id}`
      );

      return response.status(201).json({
        message: "Checkpoint registrado com sucesso",
        checkpoint: {
          id: novoCheckpoint.id,
          numero_sequencial: novoCheckpoint.numero_sequencial,
          latitude: novoCheckpoint.latitude,
          longitude: novoCheckpoint.longitude,
          descricao: novoCheckpoint.descricao,
          data_hora: novoCheckpoint.data_hora,
          tempo_desde_anterior: formatarDuracao(tempoDesdeAnterior),
          tempo_desde_anterior_segundos: tempoDesdeAnterior,
          distancia_desde_anterior_metros: distanciaDesdeAnterior.toFixed(2),
        },
      });
    } catch (err) {
      await trx.rollback();
      console.error("❌ Erro ao registrar checkpoint:", err);
      return response.status(500).json({
        error: "Erro ao registrar checkpoint",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * REGISTRAR PONTO DO TRAJETO (GPS em tempo real)
   * POST /rondas/:id/trajeto
   * Permissão: ronda_registrar_checkpoint
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async registrarTrajeto(request, response) {
    try {
      const usuario_id = request.usuario.id;
      const { id } = request.params;
      const { latitude, longitude, precisao, altitude, velocidade } =
        request.body;

      // Verificar se a ronda pertence ao usuário e está em andamento
      const ronda = await connection("rondas")
        .where({ id, usuario_id, status: "em_andamento" })
        .first();

      if (!ronda) {
        return response.status(404).json({
          error: "Ronda não encontrada ou não está em andamento",
          code: "RONDA_NAO_ENCONTRADA",
        });
      }

      // Buscar último ponto do trajeto
      const ultimoPonto = await connection("ronda_trajeto")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "desc")
        .first();

      const numeroSequencial = ultimoPonto
        ? ultimoPonto.numero_sequencial + 1
        : 1;

      // Inserir ponto no trajeto
      await connection("ronda_trajeto").insert({
        ronda_id: id,
        latitude,
        longitude,
        precisao_metros: precisao,
        altitude_metros: altitude,
        velocidade,
        numero_sequencial: numeroSequencial,
      });

      return response.status(201).json({
        message: "Ponto do trajeto registrado",
        numero_sequencial: numeroSequencial,
      });
    } catch (err) {
      console.error("❌ Erro ao registrar trajeto:", err);
      return response.status(500).json({
        error: "Erro ao registrar trajeto",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * FINALIZAR RONDA
   * PUT /rondas/:id/finalizar
   * Permissão: ronda_finalizar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async finalizar(request, response) {
    const trx = await connection.transaction();

    try {
      const usuario_id = request.usuario.id;
      const { id } = request.params;
      const { latitude, longitude, observacoes } = request.body;

      // Buscar ronda com lock para evitar concorrência
      const ronda = await trx("rondas")
        .where({ id, usuario_id, status: "em_andamento" })
        .forUpdate()
        .first();

      if (!ronda) {
        await trx.rollback();
        return response.status(404).json({
          error: "Ronda não encontrada ou não está em andamento",
          code: "RONDA_NAO_ENCONTRADA",
        });
      }

      const agora = new Date();
      const tempoTotalSegundos = Math.floor(
        (agora - new Date(ronda.data_inicio)) / 1000
      );

      // Calcular distância total do trajeto
      const pontosTrajeto = await trx("ronda_trajeto")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "asc");

      let distanciaTotalMetros = 0;
      for (let i = 1; i < pontosTrajeto.length; i++) {
        distanciaTotalMetros += calcularDistanciaHaversine(
          pontosTrajeto[i - 1].latitude,
          pontosTrajeto[i - 1].longitude,
          pontosTrajeto[i].latitude,
          pontosTrajeto[i].longitude
        );
      }

      // Adicionar ponto final no trajeto
      if (latitude && longitude) {
        const ultimoPonto = pontosTrajeto[pontosTrajeto.length - 1];
        if (ultimoPonto) {
          distanciaTotalMetros += calcularDistanciaHaversine(
            ultimoPonto.latitude,
            ultimoPonto.longitude,
            latitude,
            longitude
          );
        }

        await trx("ronda_trajeto").insert({
          ronda_id: id,
          latitude,
          longitude,
          numero_sequencial: pontosTrajeto.length + 1,
        });
      }

      // Atualizar ronda
      const observacoesFinais = observacoes
        ? ronda.observacoes
          ? `${ronda.observacoes}\n\nObservações finais: ${observacoes}`
          : observacoes
        : ronda.observacoes;

      const [rondaAtualizada] = await trx("rondas")
        .where({ id })
        .update({
          status: "finalizada",
          data_fim: agora,
          latitude_fim: latitude,
          longitude_fim: longitude,
          tempo_total_segundos: tempoTotalSegundos,
          distancia_total_metros: distanciaTotalMetros,
          observacoes: observacoesFinais,
          versao: ronda.versao + 1,
        })
        .returning("*");

      // Buscar checkpoints para retornar
      const checkpoints = await trx("ronda_checkpoints")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "asc");

      // Registrar auditoria
      await registrarAuditoria(
        {
          ronda_id: id,
          usuario_id,
          tipo_acao: "FINALIZACAO",
          descricao: `Ronda #${id} finalizada`,
          dados_json: {
            data_fim: agora,
            latitude_fim: latitude,
            longitude_fim: longitude,
            tempo_total: formatarDuracao(tempoTotalSegundos),
            tempo_total_segundos: tempoTotalSegundos,
            distancia_total_metros: distanciaTotalMetros.toFixed(2),
            total_checkpoints: ronda.total_checkpoints,
            total_pontos_trajeto: pontosTrajeto.length + 1,
          },
          ip_usuario: request.ip,
          user_agent: request.headers["user-agent"],
        },
        trx
      );

      await trx.commit();

      console.log(`✅ Ronda #${id} finalizada pelo usuário #${usuario_id}`);

      return response.json({
        message: "Ronda finalizada com sucesso",
        ronda: {
          id: rondaAtualizada.id,
          status: rondaAtualizada.status,
          data_inicio: rondaAtualizada.data_inicio,
          data_fim: rondaAtualizada.data_fim,
          tempo_total: formatarDuracao(tempoTotalSegundos),
          tempo_total_segundos: tempoTotalSegundos,
          distancia_total_metros: distanciaTotalMetros.toFixed(2),
          total_checkpoints: rondaAtualizada.total_checkpoints,
          checkpoints: checkpoints.map((cp) => ({
            ...cp,
            tempo_desde_anterior: formatarDuracao(
              cp.tempo_desde_anterior_segundos
            ),
          })),
        },
      });
    } catch (err) {
      await trx.rollback();
      console.error("❌ Erro ao finalizar ronda:", err);
      return response.status(500).json({
        error: "Erro ao finalizar ronda",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * CANCELAR RONDA
   * PUT /rondas/:id/cancelar
   * Permissão: ronda_cancelar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async cancelar(request, response) {
    const trx = await connection.transaction();

    try {
      const usuario_id = request.usuario.id;
      const { id } = request.params;
      const { motivo } = request.body;

      // Buscar ronda
      const ronda = await trx("rondas")
        .where({ id, usuario_id, status: "em_andamento" })
        .forUpdate()
        .first();

      if (!ronda) {
        await trx.rollback();
        return response.status(404).json({
          error: "Ronda não encontrada ou não está em andamento",
          code: "RONDA_NAO_ENCONTRADA",
        });
      }

      const agora = new Date();
      const tempoTotalSegundos = Math.floor(
        (agora - new Date(ronda.data_inicio)) / 1000
      );

      // Atualizar ronda
      await trx("rondas")
        .where({ id })
        .update({
          status: "cancelada",
          data_fim: agora,
          tempo_total_segundos: tempoTotalSegundos,
          observacoes: motivo
            ? `${ronda.observacoes || ""}\n\nMotivo do cancelamento: ${motivo}`.trim()
            : ronda.observacoes,
          versao: ronda.versao + 1,
        });

      // Registrar auditoria
      await registrarAuditoria(
        {
          ronda_id: id,
          usuario_id,
          tipo_acao: "CANCELAMENTO",
          descricao: `Ronda #${id} cancelada`,
          dados_json: {
            motivo,
            tempo_decorrido: formatarDuracao(tempoTotalSegundos),
          },
          ip_usuario: request.ip,
          user_agent: request.headers["user-agent"],
        },
        trx
      );

      await trx.commit();

      console.log(`⚠️ Ronda #${id} cancelada pelo usuário #${usuario_id}`);

      return response.json({
        message: "Ronda cancelada com sucesso",
        ronda_id: id,
      });
    } catch (err) {
      await trx.rollback();
      console.error("❌ Erro ao cancelar ronda:", err);
      return response.status(500).json({
        error: "Erro ao cancelar ronda",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * BUSCAR RONDA EM ANDAMENTO DO USUÁRIO
   * GET /rondas/em-andamento
   * Permissão: ronda_iniciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async buscarEmAndamento(request, response) {
    try {
      const usuario_id = request.usuario.id;

      const ronda = await connection("rondas")
        .where({ usuario_id, status: "em_andamento" })
        .first();

      if (!ronda) {
        return response.json({ ronda: null });
      }

      // Buscar checkpoints
      const checkpoints = await connection("ronda_checkpoints")
        .where({ ronda_id: ronda.id })
        .orderBy("numero_sequencial", "asc");

      // Calcular tempo decorrido
      const tempoDecorridoSegundos = Math.floor(
        (new Date() - new Date(ronda.data_inicio)) / 1000
      );

      return response.json({
        ronda: {
          ...ronda,
          tempo_decorrido: formatarDuracao(tempoDecorridoSegundos),
          tempo_decorrido_segundos: tempoDecorridoSegundos,
          checkpoints: checkpoints.map((cp) => ({
            ...cp,
            tempo_desde_anterior: formatarDuracao(
              cp.tempo_desde_anterior_segundos
            ),
          })),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao buscar ronda em andamento:", err);
      return response.status(500).json({
        error: "Erro ao buscar ronda em andamento",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * LISTAR HISTÓRICO DE RONDAS DO USUÁRIO
   * GET /rondas/historico
   * Permissão: ronda_visualizar_historico
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listarHistorico(request, response) {
    try {
      const usuario_id = request.usuario.id;
      const { pagina = 1, limite = 10, data_inicio, data_fim } = request.query;

      let query = connection("rondas")
        .where({ usuario_id })
        .whereIn("status", ["finalizada", "cancelada"]);

      // Filtros de data
      if (data_inicio) {
        query = query.where("data_inicio", ">=", data_inicio);
      }
      if (data_fim) {
        query = query.where("data_inicio", "<=", `${data_fim} 23:59:59`);
      }

      // Contar total
      const [{ total }] = await query.clone().count("id as total");

      // Buscar rondas paginadas
      const rondas = await query
        .orderBy("data_inicio", "desc")
        .limit(limite)
        .offset((pagina - 1) * limite);

      // Formatar rondas
      const rondasFormatadas = rondas.map((r) => ({
        ...r,
        tempo_total: formatarDuracao(r.tempo_total_segundos),
        distancia_total: `${(r.distancia_total_metros / 1000).toFixed(2)} km`,
      }));

      return response.json({
        rondas: rondasFormatadas,
        paginacao: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total: parseInt(total),
          totalPaginas: Math.ceil(total / limite),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao listar histórico:", err);
      return response.status(500).json({
        error: "Erro ao listar histórico de rondas",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * BUSCAR DETALHES DE UMA RONDA
   * GET /rondas/:id
   * Permissão: ronda_visualizar_historico ou ronda_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async buscarDetalhes(request, response) {
    try {
      const usuario_id = request.usuario.id;
      const { id } = request.params;

      // Buscar ronda
      const ronda = await connection("rondas as r")
        .leftJoin("usuarios as u", "r.usuario_id", "u.id")
        .leftJoin("empresa_interno as e", "r.empresa_id", "e.id")
        .where("r.id", id)
        .select("r.*", "u.nome as usuario_nome", "e.nome as empresa_nome")
        .first();

      if (!ronda) {
        return response.status(404).json({
          error: "Ronda não encontrada",
          code: "RONDA_NAO_ENCONTRADA",
        });
      }

      // Verificar permissão: usuário só pode ver suas próprias rondas
      // a menos que tenha permissão de gerenciar
      // (essa verificação adicional pode ser feita aqui ou no middleware)

      // Buscar checkpoints
      const checkpoints = await connection("ronda_checkpoints")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "asc");

      // Buscar trajeto
      const trajeto = await connection("ronda_trajeto")
        .where({ ronda_id: id })
        .orderBy("numero_sequencial", "asc");

      // Registrar visualização na auditoria (se for gestor visualizando)
      if (ronda.usuario_id !== usuario_id) {
        await registrarAuditoria({
          ronda_id: id,
          usuario_id,
          tipo_acao: "VISUALIZACAO",
          descricao: `Ronda #${id} visualizada por gestor`,
          dados_json: {},
          ip_usuario: request.ip,
          user_agent: request.headers["user-agent"],
        });
      }

      return response.json({
        ronda: {
          ...ronda,
          tempo_total: formatarDuracao(ronda.tempo_total_segundos),
          distancia_total: `${(ronda.distancia_total_metros / 1000).toFixed(2)} km`,
          checkpoints: checkpoints.map((cp) => ({
            ...cp,
            tempo_desde_anterior: formatarDuracao(
              cp.tempo_desde_anterior_segundos
            ),
          })),
          trajeto: trajeto.map((p) => ({
            latitude: parseFloat(p.latitude),
            longitude: parseFloat(p.longitude),
            data_hora: p.data_hora,
          })),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao buscar detalhes da ronda:", err);
      return response.status(500).json({
        error: "Erro ao buscar detalhes da ronda",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PAINEL ADMINISTRATIVO - LISTAR TODAS AS RONDAS
   * GET /rondas/admin/listar
   * Permissão: ronda_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listarTodasRondas(request, response) {
    try {
      const {
        pagina = 1,
        limite = 20,
        usuario_id,
        status,
        data_inicio,
        data_fim,
        empresa_id,
      } = request.query;

      let query = connection("rondas as r")
        .leftJoin("usuarios as u", "r.usuario_id", "u.id")
        .leftJoin("empresa_interno as e", "r.empresa_id", "e.id")
        .select("r.*", "u.nome as usuario_nome", "e.nome as empresa_nome");

      // Filtros
      if (usuario_id) {
        query = query.where("r.usuario_id", usuario_id);
      }
      if (status) {
        query = query.where("r.status", status);
      }
      if (empresa_id) {
        query = query.where("r.empresa_id", empresa_id);
      }
      if (data_inicio) {
        query = query.where("r.data_inicio", ">=", data_inicio);
      }
      if (data_fim) {
        query = query.where("r.data_inicio", "<=", `${data_fim} 23:59:59`);
      }

      // Contar total
      const [{ total }] = await query.clone().count("r.id as total");

      // Buscar rondas paginadas
      const rondas = await query
        .orderBy("r.data_inicio", "desc")
        .limit(limite)
        .offset((pagina - 1) * limite);

      // Formatar rondas
      const rondasFormatadas = rondas.map((r) => ({
        ...r,
        tempo_total: formatarDuracao(r.tempo_total_segundos),
        distancia_total: `${((r.distancia_total_metros || 0) / 1000).toFixed(2)} km`,
      }));

      return response.json({
        rondas: rondasFormatadas,
        paginacao: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total: parseInt(total),
          totalPaginas: Math.ceil(total / limite),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao listar todas as rondas:", err);
      return response.status(500).json({
        error: "Erro ao listar rondas",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PAINEL ADMINISTRATIVO - ESTATÍSTICAS DE RONDAS
   * GET /rondas/admin/estatisticas
   * Permissão: ronda_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async estatisticas(request, response) {
    try {
      const { data_inicio, data_fim, empresa_id } = request.query;

      // Estatísticas gerais
      let queryBase = connection("rondas");

      if (empresa_id) {
        queryBase = queryBase.where("empresa_id", empresa_id);
      }
      if (data_inicio) {
        queryBase = queryBase.where("data_inicio", ">=", data_inicio);
      }
      if (data_fim) {
        queryBase = queryBase.where(
          "data_inicio",
          "<=",
          `${data_fim} 23:59:59`
        );
      }

      const estatisticas = await queryBase
        .clone()
        .select(
          connection.raw("COUNT(*) as total_rondas"),
          connection.raw(
            "COUNT(CASE WHEN status = 'finalizada' THEN 1 END) as rondas_finalizadas"
          ),
          connection.raw(
            "COUNT(CASE WHEN status = 'em_andamento' THEN 1 END) as rondas_em_andamento"
          ),
          connection.raw(
            "COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as rondas_canceladas"
          ),
          connection.raw(
            "COALESCE(SUM(tempo_total_segundos), 0) as tempo_total_segundos"
          ),
          connection.raw(
            "COALESCE(SUM(distancia_total_metros), 0) as distancia_total_metros"
          ),
          connection.raw(
            "COALESCE(SUM(total_checkpoints), 0) as total_checkpoints"
          ),
          connection.raw(
            "COALESCE(AVG(tempo_total_segundos), 0) as tempo_medio_segundos"
          ),
          connection.raw("COUNT(DISTINCT usuario_id) as total_vigilantes")
        )
        .first();

      // Top vigilantes
      const topVigilantes = await connection("rondas as r")
        .leftJoin("usuarios as u", "r.usuario_id", "u.id")
        .where("r.status", "finalizada")
        .modify((qb) => {
          if (empresa_id) qb.where("r.empresa_id", empresa_id);
          if (data_inicio) qb.where("r.data_inicio", ">=", data_inicio);
          if (data_fim) qb.where("r.data_inicio", "<=", `${data_fim} 23:59:59`);
        })
        .select(
          "u.id",
          "u.nome",
          connection.raw("COUNT(r.id) as total_rondas"),
          connection.raw("SUM(r.tempo_total_segundos) as tempo_total"),
          connection.raw("SUM(r.distancia_total_metros) as distancia_total")
        )
        .groupBy("u.id", "u.nome")
        .orderBy("total_rondas", "desc")
        .limit(10);

      // Rondas por dia (últimos 7 dias)
      const rondasPorDia = await connection("rondas")
        .modify((qb) => {
          if (empresa_id) qb.where("empresa_id", empresa_id);
        })
        .where(
          "data_inicio",
          ">=",
          connection.raw("CURRENT_DATE - INTERVAL '7 days'")
        )
        .select(
          connection.raw("DATE(data_inicio) as data"),
          connection.raw("COUNT(*) as total")
        )
        .groupBy(connection.raw("DATE(data_inicio)"))
        .orderBy("data", "asc");

      return response.json({
        estatisticas: {
          ...estatisticas,
          tempo_total: formatarDuracao(estatisticas.tempo_total_segundos),
          tempo_medio: formatarDuracao(estatisticas.tempo_medio_segundos),
          distancia_total: `${(estatisticas.distancia_total_metros / 1000).toFixed(2)} km`,
        },
        topVigilantes: topVigilantes.map((v) => ({
          ...v,
          tempo_total: formatarDuracao(v.tempo_total),
          distancia_total: `${((v.distancia_total || 0) / 1000).toFixed(2)} km`,
        })),
        rondasPorDia,
      });
    } catch (err) {
      console.error("❌ Erro ao buscar estatísticas:", err);
      return response.status(500).json({
        error: "Erro ao buscar estatísticas",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * PAINEL ADMINISTRATIVO - AUDITORIA DE RONDAS
   * GET /rondas/admin/auditoria
   * Permissão: ronda_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listarAuditoria(request, response) {
    try {
      const {
        pagina = 1,
        limite = 50,
        ronda_id,
        usuario_id,
        tipo_acao,
        data_inicio,
        data_fim,
      } = request.query;

      let query = connection("ronda_auditoria as ra")
        .leftJoin("usuarios as u", "ra.usuario_id", "u.id")
        .leftJoin("rondas as r", "ra.ronda_id", "r.id")
        .select("ra.*", "u.nome as usuario_nome", "r.status as ronda_status");

      // Filtros
      if (ronda_id) {
        query = query.where("ra.ronda_id", ronda_id);
      }
      if (usuario_id) {
        query = query.where("ra.usuario_id", usuario_id);
      }
      if (tipo_acao) {
        query = query.where("ra.tipo_acao", tipo_acao);
      }
      if (data_inicio) {
        query = query.where("ra.data_hora", ">=", data_inicio);
      }
      if (data_fim) {
        query = query.where("ra.data_hora", "<=", `${data_fim} 23:59:59`);
      }

      // Contar total
      const [{ total }] = await query.clone().count("ra.id as total");

      // Buscar registros paginados
      const registros = await query
        .orderBy("ra.data_hora", "desc")
        .limit(limite)
        .offset((pagina - 1) * limite);

      return response.json({
        registros,
        paginacao: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total: parseInt(total),
          totalPaginas: Math.ceil(total / limite),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao listar auditoria:", err);
      return response.status(500).json({
        error: "Erro ao listar auditoria",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * BUSCAR VIGILANTES DISPONÍVEIS (para filtros)
   * GET /rondas/admin/vigilantes
   * Permissão: ronda_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listarVigilantes(request, response) {
    try {
      // Buscar usuários que já realizaram rondas ou têm papel de segurança
      const vigilantes = await connection("usuarios as u")
        .leftJoin("empresa_interno as e", "u.empresa_id", "e.id")
        .where((qb) => {
          qb.whereIn(
            "u.id",
            connection("rondas").distinct("usuario_id")
          ).orWhereIn(
            "u.id",
            connection("usuarios_papeis as up")
              .join("papeis as p", "up.papel_id", "p.id")
              .where("p.nome", "SEGURANCA")
              .select("up.usuario_id")
          );
        })
        .select("u.id", "u.nome", "e.nome as empresa_nome")
        .orderBy("u.nome", "asc");

      return response.json({ vigilantes });
    } catch (err) {
      console.error("❌ Erro ao listar vigilantes:", err);
      return response.status(500).json({
        error: "Erro ao listar vigilantes",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
};
