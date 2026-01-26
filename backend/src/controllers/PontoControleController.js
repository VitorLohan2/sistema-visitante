/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTROLLER: Pontos de Controle de Ronda
 * Gerencia CRUD de pontos de controle para rondas de vigilantes
 *
 * Permissões RBAC:
 * - ronda_pontos_controle_visualizar: Listar/ver pontos
 * - ronda_pontos_controle_gerenciar: Criar/editar/excluir pontos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const connection = require("../database/connection");

/**
 * Calcula a distância entre dois pontos usando Haversine
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

module.exports = {
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * LISTAR PONTOS DE CONTROLE
   * GET /rondas/pontos-controle
   * Permissão: ronda_pontos_controle_visualizar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listar(request, response) {
    try {
      const { empresa_id, ativo, obrigatorio, setor } = request.query;
      const usuarioEmpresaId = request.usuario.empresa_id;

      // Monta query base
      let query = connection("ronda_pontos_controle")
        .select(
          "ronda_pontos_controle.*",
          "empresa_interno.nome as empresa_nome",
        )
        .leftJoin(
          "empresa_interno",
          "ronda_pontos_controle.empresa_id",
          "empresa_interno.id",
        )
        .orderBy("ronda_pontos_controle.ordem", "asc")
        .orderBy("ronda_pontos_controle.nome", "asc");

      // Filtro por empresa (se não for admin, filtra pela empresa do usuário)
      if (empresa_id) {
        query = query.where("ronda_pontos_controle.empresa_id", empresa_id);
      } else if (usuarioEmpresaId) {
        query = query.where(
          "ronda_pontos_controle.empresa_id",
          usuarioEmpresaId,
        );
      }

      // Filtros opcionais
      if (ativo !== undefined && ativo !== "") {
        query = query.where("ronda_pontos_controle.ativo", ativo === "true");
      }
      if (obrigatorio !== undefined && obrigatorio !== "") {
        query = query.where(
          "ronda_pontos_controle.obrigatorio",
          obrigatorio === "true",
        );
      }
      if (setor) {
        query = query.where(
          "ronda_pontos_controle.setor",
          "ilike",
          `%${setor}%`,
        );
      }

      const pontos = await query;

      return response.json({
        success: true,
        pontos,
        total: pontos.length,
      });
    } catch (err) {
      console.error("❌ Erro ao listar pontos de controle:", err);
      return response.status(500).json({
        error: "Erro ao listar pontos de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * BUSCAR PONTO DE CONTROLE POR ID
   * GET /rondas/pontos-controle/:id
   * Permissão: ronda_pontos_controle_visualizar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async buscarPorId(request, response) {
    try {
      const { id } = request.params;

      const ponto = await connection("ronda_pontos_controle")
        .select(
          "ronda_pontos_controle.*",
          "empresa_interno.nome as empresa_nome",
        )
        .leftJoin(
          "empresa_interno",
          "ronda_pontos_controle.empresa_id",
          "empresa_interno.id",
        )
        .where("ronda_pontos_controle.id", id)
        .first();

      if (!ponto) {
        return response.status(404).json({
          error: "Ponto de controle não encontrado",
          code: "PONTO_NAO_ENCONTRADO",
        });
      }

      // Busca estatísticas de uso do ponto
      const estatisticas = await connection("ronda_checkpoints")
        .where("ponto_controle_id", id)
        .count("id as total_validacoes")
        .first();

      return response.json({
        success: true,
        ponto: {
          ...ponto,
          total_validacoes: parseInt(estatisticas?.total_validacoes || 0),
        },
      });
    } catch (err) {
      console.error("❌ Erro ao buscar ponto de controle:", err);
      return response.status(500).json({
        error: "Erro ao buscar ponto de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * CRIAR PONTO DE CONTROLE
   * POST /rondas/pontos-controle
   * Permissão: ronda_pontos_controle_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async criar(request, response) {
    try {
      const usuario_id = request.usuario.id;
      const usuarioEmpresaId = request.usuario.empresa_id;
      const {
        empresa_id,
        nome,
        descricao,
        codigo,
        latitude,
        longitude,
        raio,
        ordem,
        obrigatorio,
        local_referencia,
        setor,
        tipo,
        foto_url,
        tempo_minimo_segundos,
      } = request.body;

      // Usa empresa do usuário se não especificada
      const empresaFinal = empresa_id || usuarioEmpresaId;

      if (!empresaFinal) {
        return response.status(400).json({
          error: "Empresa é obrigatória",
          code: "EMPRESA_OBRIGATORIA",
        });
      }

      // Verifica se já existe ponto com mesmo código na empresa
      if (codigo) {
        const pontoExistente = await connection("ronda_pontos_controle")
          .where({ empresa_id: empresaFinal, codigo })
          .first();

        if (pontoExistente) {
          return response.status(400).json({
            error: "Já existe um ponto de controle com este código",
            code: "CODIGO_DUPLICADO",
          });
        }
      }

      // Determina próxima ordem se não especificada
      let ordemFinal = ordem;
      if (!ordemFinal) {
        const ultimoOrdem = await connection("ronda_pontos_controle")
          .where("empresa_id", empresaFinal)
          .max("ordem as max_ordem")
          .first();
        ordemFinal = (ultimoOrdem?.max_ordem || 0) + 1;
      }

      // Cria o ponto de controle
      const [novoPonto] = await connection("ronda_pontos_controle")
        .insert({
          empresa_id: empresaFinal,
          nome,
          descricao,
          codigo,
          latitude,
          longitude,
          raio: raio || 30,
          ordem: ordemFinal,
          obrigatorio: obrigatorio !== false,
          ativo: true,
          local_referencia,
          setor,
          tipo: tipo || "checkpoint",
          foto_url,
          tempo_minimo_segundos: tempo_minimo_segundos || 30,
          criado_por: usuario_id,
        })
        .returning("*");

      console.log(
        `✅ Ponto de controle "${nome}" criado (ID: ${novoPonto.id})`,
      );

      return response.status(201).json({
        success: true,
        message: "Ponto de controle criado com sucesso",
        ponto: novoPonto,
      });
    } catch (err) {
      console.error("❌ Erro ao criar ponto de controle:", err);
      return response.status(500).json({
        error: "Erro ao criar ponto de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ATUALIZAR PONTO DE CONTROLE
   * PUT /rondas/pontos-controle/:id
   * Permissão: ronda_pontos_controle_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async atualizar(request, response) {
    try {
      const { id } = request.params;
      const {
        nome,
        descricao,
        codigo,
        latitude,
        longitude,
        raio,
        ordem,
        obrigatorio,
        ativo,
        local_referencia,
        setor,
        tipo,
        foto_url,
        tempo_minimo_segundos,
      } = request.body;

      // Verifica se existe
      const pontoExistente = await connection("ronda_pontos_controle")
        .where("id", id)
        .first();

      if (!pontoExistente) {
        return response.status(404).json({
          error: "Ponto de controle não encontrado",
          code: "PONTO_NAO_ENCONTRADO",
        });
      }

      // Verifica código duplicado (se alterado)
      if (codigo && codigo !== pontoExistente.codigo) {
        const codigoDuplicado = await connection("ronda_pontos_controle")
          .where({
            empresa_id: pontoExistente.empresa_id,
            codigo,
          })
          .whereNot("id", id)
          .first();

        if (codigoDuplicado) {
          return response.status(400).json({
            error: "Já existe um ponto de controle com este código",
            code: "CODIGO_DUPLICADO",
          });
        }
      }

      // Monta objeto de atualização
      const dadosAtualizacao = {};
      if (nome !== undefined) dadosAtualizacao.nome = nome;
      if (descricao !== undefined) dadosAtualizacao.descricao = descricao;
      if (codigo !== undefined) dadosAtualizacao.codigo = codigo;
      if (latitude !== undefined) dadosAtualizacao.latitude = latitude;
      if (longitude !== undefined) dadosAtualizacao.longitude = longitude;
      if (raio !== undefined) dadosAtualizacao.raio = raio;
      if (ordem !== undefined) dadosAtualizacao.ordem = ordem;
      if (obrigatorio !== undefined) dadosAtualizacao.obrigatorio = obrigatorio;
      if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
      if (local_referencia !== undefined)
        dadosAtualizacao.local_referencia = local_referencia;
      if (setor !== undefined) dadosAtualizacao.setor = setor;
      if (tipo !== undefined) dadosAtualizacao.tipo = tipo;
      if (foto_url !== undefined) dadosAtualizacao.foto_url = foto_url;
      if (tempo_minimo_segundos !== undefined)
        dadosAtualizacao.tempo_minimo_segundos = tempo_minimo_segundos;

      // Atualiza
      const [pontoAtualizado] = await connection("ronda_pontos_controle")
        .where("id", id)
        .update(dadosAtualizacao)
        .returning("*");

      console.log(`✅ Ponto de controle ID ${id} atualizado`);

      return response.json({
        success: true,
        message: "Ponto de controle atualizado com sucesso",
        ponto: pontoAtualizado,
      });
    } catch (err) {
      console.error("❌ Erro ao atualizar ponto de controle:", err);
      return response.status(500).json({
        error: "Erro ao atualizar ponto de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * EXCLUIR PONTO DE CONTROLE
   * DELETE /rondas/pontos-controle/:id
   * Permissão: ronda_pontos_controle_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async excluir(request, response) {
    try {
      const { id } = request.params;

      // Verifica se existe
      const ponto = await connection("ronda_pontos_controle")
        .where("id", id)
        .first();

      if (!ponto) {
        return response.status(404).json({
          error: "Ponto de controle não encontrado",
          code: "PONTO_NAO_ENCONTRADO",
        });
      }

      // Verifica se já foi usado em alguma ronda
      const usoEmRondas = await connection("ronda_checkpoints")
        .where("ponto_controle_id", id)
        .count("id as total")
        .first();

      if (parseInt(usoEmRondas?.total || 0) > 0) {
        // Não exclui, apenas desativa
        await connection("ronda_pontos_controle")
          .where("id", id)
          .update({ ativo: false });

        return response.json({
          success: true,
          message: "Ponto de controle desativado (possui histórico de uso)",
          desativado: true,
        });
      }

      // Exclui se nunca foi usado
      await connection("ronda_pontos_controle").where("id", id).del();

      console.log(`✅ Ponto de controle ID ${id} excluído`);

      return response.json({
        success: true,
        message: "Ponto de controle excluído com sucesso",
      });
    } catch (err) {
      console.error("❌ Erro ao excluir ponto de controle:", err);
      return response.status(500).json({
        error: "Erro ao excluir ponto de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * REORDENAR PONTOS DE CONTROLE
   * PUT /rondas/pontos-controle/reordenar
   * Permissão: ronda_pontos_controle_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async reordenar(request, response) {
    const trx = await connection.transaction();

    try {
      const { ordenacao } = request.body; // Array de {id, ordem}

      if (!Array.isArray(ordenacao) || ordenacao.length === 0) {
        await trx.rollback();
        return response.status(400).json({
          error: "Dados de ordenação inválidos",
          code: "DADOS_INVALIDOS",
        });
      }

      // Atualiza ordem de cada ponto
      for (const item of ordenacao) {
        await trx("ronda_pontos_controle")
          .where("id", item.id)
          .update({ ordem: item.ordem });
      }

      await trx.commit();

      console.log(`✅ ${ordenacao.length} pontos de controle reordenados`);

      return response.json({
        success: true,
        message: "Pontos de controle reordenados com sucesso",
      });
    } catch (err) {
      await trx.rollback();
      console.error("❌ Erro ao reordenar pontos de controle:", err);
      return response.status(500).json({
        error: "Erro ao reordenar pontos de controle",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * LISTAR SETORES DISTINTOS
   * GET /rondas/pontos-controle/setores
   * Permissão: ronda_pontos_controle_visualizar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listarSetores(request, response) {
    try {
      const { empresa_id } = request.query;
      const usuarioEmpresaId = request.usuario.empresa_id;

      const empresaFinal = empresa_id || usuarioEmpresaId;

      let query = connection("ronda_pontos_controle")
        .distinct("setor")
        .whereNotNull("setor")
        .where("setor", "!=", "")
        .orderBy("setor");

      if (empresaFinal) {
        query = query.where("empresa_id", empresaFinal);
      }

      const setores = await query;

      return response.json({
        success: true,
        setores: setores.map((s) => s.setor),
      });
    } catch (err) {
      console.error("❌ Erro ao listar setores:", err);
      return response.status(500).json({
        error: "Erro ao listar setores",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * VALIDAR PROXIMIDADE (para mobile)
   * POST /rondas/pontos-controle/:id/validar-proximidade
   * Permissão: ronda_pontos_controle_visualizar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async validarProximidade(request, response) {
    try {
      const { id } = request.params;
      const { latitude, longitude } = request.body;

      // Busca ponto de controle
      const ponto = await connection("ronda_pontos_controle")
        .where("id", id)
        .where("ativo", true)
        .first();

      if (!ponto) {
        return response.status(404).json({
          error: "Ponto de controle não encontrado ou inativo",
          code: "PONTO_NAO_ENCONTRADO",
        });
      }

      // Calcula distância
      const distancia = calcularDistanciaHaversine(
        latitude,
        longitude,
        parseFloat(ponto.latitude),
        parseFloat(ponto.longitude),
      );

      const dentroDoRaio = distancia <= ponto.raio;

      return response.json({
        success: true,
        valido: dentroDoRaio,
        distancia: Math.round(distancia * 100) / 100,
        raio: ponto.raio,
        ponto: {
          id: ponto.id,
          nome: ponto.nome,
          latitude: ponto.latitude,
          longitude: ponto.longitude,
        },
        mensagem: dentroDoRaio
          ? "Dentro do raio de validação"
          : `Fora do raio. Aproxime-se mais ${Math.round(distancia - ponto.raio)}m`,
      });
    } catch (err) {
      console.error("❌ Erro ao validar proximidade:", err);
      return response.status(500).json({
        error: "Erro ao validar proximidade",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ESTATÍSTICAS DOS PONTOS DE CONTROLE
   * GET /rondas/pontos-controle/estatisticas
   * Permissão: ronda_pontos_controle_gerenciar
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async estatisticas(request, response) {
    try {
      const { empresa_id, data_inicio, data_fim } = request.query;
      const usuarioEmpresaId = request.usuario.empresa_id;
      const empresaFinal = empresa_id || usuarioEmpresaId;

      // Total de pontos
      let queryTotal = connection("ronda_pontos_controle").count("id as total");
      if (empresaFinal)
        queryTotal = queryTotal.where("empresa_id", empresaFinal);
      const { total } = await queryTotal.first();

      // Pontos ativos/inativos
      let queryAtivos = connection("ronda_pontos_controle")
        .select("ativo")
        .count("id as count")
        .groupBy("ativo");
      if (empresaFinal)
        queryAtivos = queryAtivos.where("empresa_id", empresaFinal);
      const statusAtivos = await queryAtivos;

      // Pontos por setor
      let querySetores = connection("ronda_pontos_controle")
        .select("setor")
        .count("id as count")
        .groupBy("setor")
        .orderBy("count", "desc");
      if (empresaFinal)
        querySetores = querySetores.where("empresa_id", empresaFinal);
      const porSetor = await querySetores;

      // Validações por ponto (top 10)
      let queryValidacoes = connection("ronda_checkpoints as rc")
        .select(
          "pc.id",
          "pc.nome",
          connection.raw("COUNT(rc.id) as total_validacoes"),
        )
        .join("ronda_pontos_controle as pc", "rc.ponto_controle_id", "pc.id")
        .groupBy("pc.id", "pc.nome")
        .orderBy("total_validacoes", "desc")
        .limit(10);

      if (empresaFinal) {
        queryValidacoes = queryValidacoes.where("pc.empresa_id", empresaFinal);
      }
      if (data_inicio) {
        queryValidacoes = queryValidacoes.where(
          "rc.data_hora",
          ">=",
          data_inicio,
        );
      }
      if (data_fim) {
        queryValidacoes = queryValidacoes.where(
          "rc.data_hora",
          "<=",
          `${data_fim} 23:59:59`,
        );
      }
      const maisValidados = await queryValidacoes;

      return response.json({
        success: true,
        estatisticas: {
          total: parseInt(total),
          ativos: parseInt(
            statusAtivos.find((s) => s.ativo === true)?.count || 0,
          ),
          inativos: parseInt(
            statusAtivos.find((s) => s.ativo === false)?.count || 0,
          ),
          por_setor: porSetor.map((s) => ({
            setor: s.setor || "Sem setor",
            quantidade: parseInt(s.count),
          })),
          mais_validados: maisValidados.map((p) => ({
            id: p.id,
            nome: p.nome,
            total_validacoes: parseInt(p.total_validacoes),
          })),
        },
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
};
