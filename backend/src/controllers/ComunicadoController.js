// src/controllers/ComunicadoController.js
const connection = require("../database/connection");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");
const { temPermissao } = require("../middleware/permissaoMiddleware");

// ✅ FUNÇÃO AUXILIAR: Desativar todos os comunicados
async function desativarTodosComunicados() {
  try {
    await connection("comunicados")
      .where({ ativo: true })
      .update({ ativo: false, atualizado_em: new Date() });

    console.log("🔄 Todos os comunicados foram desativados");
  } catch (error) {
    console.error("❌ Erro ao desativar comunicados:", error);
    throw error;
  }
}

module.exports = {
  // ✅ BUSCAR COMUNICADO ATIVO (GLOBAL - PARA TODOS)
  async getAtivo(request, response) {
    try {
      const usuario_id = getUsuarioId(request);
      console.log("📢 Buscando comunicado ativo global");

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const usuarioExists = await connection("usuarios")
        .where("id", usuario_id)
        .first();
      if (!usuarioExists) {
        return response.status(404).json({ error: "Usuário não encontrado" });
      }

      const comunicadoAtivo = await connection("comunicados")
        .where({ ativo: true })
        .orderBy("criado_em", "desc")
        .first();

      console.log("📦 Comunicado ativo encontrado:", comunicadoAtivo);

      if (!comunicadoAtivo) {
        return response.json(null);
      }

      return response.json(comunicadoAtivo);
    } catch (error) {
      console.error("❌ Erro ao buscar comunicado ativo:", error);
      return response.status(500).json({
        error: "Erro ao buscar comunicado ativo",
        details: error.message,
      });
    }
  },

  // ✅ LISTAR TODOS OS COMUNICADOS (GLOBAL)
  async list(request, response) {
    try {
      const usuario_id = getUsuarioId(request);
      console.log("📋 Listando todos os comunicados (global)");

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const usuarioExists = await connection("usuarios")
        .where("id", usuario_id)
        .first();
      if (!usuarioExists) {
        return response.status(404).json({ error: "Usuário não encontrado" });
      }

      const comunicados = await connection("comunicados").orderBy(
        "criado_em",
        "desc"
      );

      console.log("📦 Comunicados encontrados:", comunicados.length);
      return response.json(comunicados);
    } catch (error) {
      console.error("❌ Erro ao listar comunicados:", error);
      return response.status(500).json({
        error: "Erro ao listar comunicados",
        details: error.message,
      });
    }
  },

  // ✅ CRIAR COMUNICADO (COM CONTROLE DE ÚNICO ATIVO)
  async create(request, response) {
    try {
      const io = getIo();
      const usuario_id = getUsuarioId(request);
      const { titulo, mensagem, prioridade, ativo } = request.body;

      console.log("📝 Criando comunicado:", {
        usuario_id,
        titulo,
        prioridade,
        ativo,
      });

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const temPermissaoCriar = await temPermissao(
        usuario_id,
        "comunicado_criar"
      );
      if (!temPermissaoCriar) {
        return response.status(403).json({
          error:
            "Acesso negado. Você não tem permissão para criar comunicados.",
        });
      }

      if (!titulo || !mensagem) {
        return response.status(400).json({
          error: "Campos obrigatórios faltando",
          required: ["titulo", "mensagem"],
        });
      }

      const ativarComunicado =
        ativo === true || ativo === "true" || ativo === 1;

      // ✅ SE ESTIVER CRIANDO COMO ATIVO, DESATIVA TODOS OS OUTROS
      if (ativarComunicado) {
        await desativarTodosComunicados();
        console.log(
          "✅ Outros comunicados desativados antes de criar novo ativo"
        );
      }

      const result = await connection("comunicados")
        .insert({
          usuario_id,
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          prioridade: prioridade || "normal",
          ativo: ativarComunicado,
          criado_em: new Date(),
          atualizado_em: new Date(),
        })
        .returning("id");

      const comunicadoId =
        typeof result[0] === "object" ? result[0].id : result[0];

      console.log("✅ ID do comunicado criado:", comunicadoId);

      const comunicado = await connection("comunicados")
        .where({ id: comunicadoId })
        .first();

      console.log("📦 Comunicado recuperado:", comunicado);

      // ✅ EMITIR EVENTO VIA SOCKET
      if (io && comunicado) {
        io.to("global").emit("comunicado:new", comunicado);

        // Se criou um comunicado ativo, notifica que os outros foram desativados
        if (ativarComunicado) {
          io.to("global").emit("comunicado:single_active", comunicado.id);
        }

        console.log("🔔 Evento socket emitido: comunicado:new");
      }

      return response.status(201).json(comunicado);
    } catch (error) {
      console.error("❌ Erro ao criar comunicado:", error);
      return response.status(500).json({
        error: "Erro ao criar comunicado",
        details: error.message,
      });
    }
  },

  // ✅ ATUALIZAR COMUNICADO (COM CONTROLE DE ÚNICO ATIVO)
  async update(request, response) {
    try {
      const io = getIo();
      const usuario_id = getUsuarioId(request);
      const { id } = request.params;
      const updates = request.body;

      console.log("🔄 Atualizando comunicado:", { id, usuario_id, updates });

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const temPermissaoEditar = await temPermissao(
        usuario_id,
        "comunicado_editar"
      );
      if (!temPermissaoEditar) {
        return response
          .status(403)
          .json({
            error:
              "Acesso negado. Você não tem permissão para editar comunicados.",
          });
      }

      const comunicadoExistente = await connection("comunicados")
        .where({ id })
        .first();

      if (!comunicadoExistente) {
        return response
          .status(404)
          .json({ error: "Comunicado não encontrado" });
      }

      // ✅ SE ESTÁ ATIVANDO ESTE COMUNICADO, DESATIVA TODOS OS OUTROS
      const ativarComunicado =
        updates.ativo === true ||
        updates.ativo === "true" ||
        updates.ativo === 1;

      if (ativarComunicado && !comunicadoExistente.ativo) {
        await desativarTodosComunicados();
        console.log("✅ Outros comunicados desativados antes de ativar este");
      }

      const dadosAtualizados = {
        ...updates,
        atualizado_em: new Date(),
      };

      await connection("comunicados").where({ id }).update(dadosAtualizados);

      const comunicadoAtualizado = await connection("comunicados")
        .where({ id })
        .first();

      console.log("✅ Comunicado atualizado:", comunicadoAtualizado);

      // ✅ EMITIR EVENTO VIA SOCKET
      if (io && comunicadoAtualizado) {
        io.to("global").emit("comunicado:update", comunicadoAtualizado);

        // Se ativou este comunicado, notifica que é o único ativo
        if (ativarComunicado && !comunicadoExistente.ativo) {
          io.to("global").emit(
            "comunicado:single_active",
            comunicadoAtualizado.id
          );
        }

        console.log("🔔 Evento socket emitido: comunicado:update");
      }

      return response.json(comunicadoAtualizado);
    } catch (error) {
      console.error("❌ Erro ao atualizar comunicado:", error);
      return response.status(500).json({
        error: "Erro ao atualizar comunicado",
        details: error.message,
      });
    }
  },

  // ✅ DELETAR COMUNICADO
  async delete(request, response) {
    try {
      const io = getIo();
      const usuario_id = getUsuarioId(request);
      const { id } = request.params;

      console.log("🗑️ Deletando comunicado:", { id, usuario_id });

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const temPermissaoDeletar = await temPermissao(
        usuario_id,
        "comunicado_deletar"
      );
      if (!temPermissaoDeletar) {
        return response
          .status(403)
          .json({
            error:
              "Acesso negado. Você não tem permissão para excluir comunicados.",
          });
      }

      const comunicadoExistente = await connection("comunicados")
        .where({ id })
        .first();

      if (!comunicadoExistente) {
        return response
          .status(404)
          .json({ error: "Comunicado não encontrado" });
      }

      await connection("comunicados").where({ id }).delete();

      console.log("✅ Comunicado deletado com sucesso");

      if (io) {
        io.to("global").emit("comunicado:delete", id);
        console.log("🔔 Evento socket emitido: comunicado:delete");
      }

      return response.json({
        message: "Comunicado excluído com sucesso",
        deletedId: id,
      });
    } catch (error) {
      console.error("❌ Erro ao excluir comunicado:", error);
      return response.status(500).json({
        error: "Erro ao excluir comunicado",
        details: error.message,
      });
    }
  },
};
