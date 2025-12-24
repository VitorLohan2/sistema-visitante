// src/controllers/ComunicadoController.js
const connection = require("../database/connection");
const { getIo } = require("../socket");

function getBearerToken(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;

  return token; // Este token é o ong_id (string)
}

async function isAdmin(ong_id) {
  try {
    const ong = await connection("ongs")
      .where("id", ong_id)
      .where("type", "ADM")
      .first();

    return !!ong;
  } catch (error) {
    console.error("Erro ao verificar admin:", error);
    return false;
  }
}

module.exports = {
  // LISTAR TODOS OS COMUNICADOS
  async list(request, response) {
    try {
      const ong_id = getBearerToken(request);
      console.log("Ong ID recebido:", ong_id); // Debug

      if (!ong_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar se a ONG existe
      const ongExists = await connection("ongs").where("id", ong_id).first();
      if (!ongExists) {
        return response.status(404).json({ error: "ONG não encontrada" });
      }

      // Buscar comunicados
      const comunicados = await connection("comunicados")
        .where({ ong_id })
        .orderBy("created_at", "desc");

      console.log("Comunicados encontrados:", comunicados.length); // Debug
      return response.json(comunicados);
    } catch (error) {
      console.error("Erro ao listar comunicados:", error);
      return response.status(500).json({
        error: "Erro ao listar comunicados",
        details: error.message,
      });
    }
  },

  // POST - CRIAR COMUNICADO
  async create(request, response) {
    try {
      const io = getIo();
      const ong_id = getBearerToken(request);
      const { titulo, mensagem, prioridade, ativo } = request.body;

      if (!ong_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar se é admin
      const adminCheck = await isAdmin(ong_id);
      if (!adminCheck) {
        return response
          .status(403)
          .json({
            error:
              "Acesso negado. Apenas administradores podem criar comunicados.",
          });
      }

      // Validar campos obrigatórios
      if (!titulo || !mensagem) {
        return response.status(400).json({
          error: "Campos obrigatórios faltando",
          required: ["titulo", "mensagem"],
        });
      }

      // Criar comunicado
      const [id] = await connection("comunicados")
        .insert({
          ong_id,
          titulo: titulo.trim(),
          mensagem: mensagem.trim(),
          prioridade: prioridade || "normal",
          ativo: ativo === true || ativo === "true" || ativo === 1,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("id");

      // Buscar comunicado criado
      const comunicado = await connection("comunicados").where({ id }).first();

      // Emitir via socket
      if (io) {
        io.to("global").emit("comunicado:new", comunicado);
      }

      return response.status(201).json(comunicado);
    } catch (error) {
      console.error("Erro ao criar comunicado:", error);
      return response.status(500).json({
        error: "Erro ao criar comunicado",
        details: error.message,
      });
    }
  },

  // PUT - ATUALIZAR COMUNICADO
  async update(request, response) {
    try {
      const io = getIo();
      const ong_id = getBearerToken(request);
      const { id } = request.params;
      const updates = request.body;

      if (!ong_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar se é admin
      const adminCheck = await isAdmin(ong_id);
      if (!adminCheck) {
        return response.status(403).json({ error: "Acesso negado" });
      }

      // Verificar se o comunicado existe e pertence à ONG
      const comunicadoExistente = await connection("comunicados")
        .where({ id, ong_id })
        .first();

      if (!comunicadoExistente) {
        return response
          .status(404)
          .json({ error: "Comunicado não encontrado" });
      }

      // Preparar atualizações
      const dadosAtualizados = {
        ...updates,
        updated_at: new Date(),
      };

      // Atualizar
      await connection("comunicados")
        .where({ id, ong_id })
        .update(dadosAtualizados);

      // Buscar comunicado atualizado
      const comunicadoAtualizado = await connection("comunicados")
        .where({ id })
        .first();

      // Emitir via socket
      if (io) {
        io.to("global").emit("comunicado:update", comunicadoAtualizado);
      }

      return response.json(comunicadoAtualizado);
    } catch (error) {
      console.error("Erro ao atualizar comunicado:", error);
      return response.status(500).json({
        error: "Erro ao atualizar comunicado",
        details: error.message,
      });
    }
  },

  // DELETE - EXCLUIR COMUNICADO
  async delete(request, response) {
    try {
      const io = getIo();
      const ong_id = getBearerToken(request);
      const { id } = request.params;

      if (!ong_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar se é admin
      const adminCheck = await isAdmin(ong_id);
      if (!adminCheck) {
        return response.status(403).json({ error: "Acesso negado" });
      }

      // Verificar se o comunicado existe
      const comunicadoExistente = await connection("comunicados")
        .where({ id, ong_id })
        .first();

      if (!comunicadoExistente) {
        return response
          .status(404)
          .json({ error: "Comunicado não encontrado" });
      }

      // Excluir
      await connection("comunicados").where({ id, ong_id }).delete();

      // Emitir via socket
      if (io) {
        io.to("global").emit("comunicado:delete", id);
      }

      return response.json({
        message: "Comunicado excluído com sucesso",
        deletedId: id,
      });
    } catch (error) {
      console.error("Erro ao excluir comunicado:", error);
      return response.status(500).json({
        error: "Erro ao excluir comunicado",
        details: error.message,
      });
    }
  },
};
