// controllers/PatchNotesController.js
const db = require("../database/connection");
const { getIo } = require("../socket");

/**
 * Listar todos os patch notes (ordenados por data, mais recentes primeiro)
 */
const listar = async (req, res) => {
  try {
    const patchNotes = await db("patch_notes")
      .select("*")
      .orderBy("data_lancamento", "desc")
      .orderBy("criado_em", "desc");

    res.json(patchNotes);
  } catch (error) {
    console.error("Erro ao listar patch notes:", error);
    res.status(500).json({ error: "Erro ao listar atualizações do sistema" });
  }
};

/**
 * Criar novo patch note
 */
const criar = async (req, res) => {
  try {
    const io = getIo();
    const { versao, titulo, descricao, tipo, data_lancamento } = req.body;

    // Validações
    if (!versao || !titulo || !descricao) {
      return res.status(400).json({
        error: "Versão, título e descrição são obrigatórios",
      });
    }

    const tiposValidos = ["feature", "improvement", "fix"];
    if (tipo && !tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: "Tipo inválido. Use: feature, improvement ou fix",
      });
    }

    const [novoPatchNote] = await db("patch_notes")
      .insert({
        versao,
        titulo,
        descricao,
        tipo: tipo || "improvement",
        data_lancamento: data_lancamento || new Date(),
      })
      .returning("*");

    // Emitir evento Socket.IO
    io.to("global").emit("patch-note:created", novoPatchNote);

    res.status(201).json(novoPatchNote);
  } catch (error) {
    console.error("Erro ao criar patch note:", error);
    res.status(500).json({ error: "Erro ao criar atualização do sistema" });
  }
};

/**
 * Buscar patch note por ID
 */
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const patchNote = await db("patch_notes").where({ id }).first();

    if (!patchNote) {
      return res.status(404).json({ error: "Atualização não encontrada" });
    }

    res.json(patchNote);
  } catch (error) {
    console.error("Erro ao buscar patch note:", error);
    res.status(500).json({ error: "Erro ao buscar atualização" });
  }
};

/**
 * Atualizar patch note
 */
const atualizar = async (req, res) => {
  try {
    const io = getIo();
    const { id } = req.params;
    const { versao, titulo, descricao, tipo, data_lancamento } = req.body;

    const patchNote = await db("patch_notes").where({ id }).first();
    if (!patchNote) {
      return res.status(404).json({ error: "Atualização não encontrada" });
    }

    const tiposValidos = ["feature", "improvement", "fix"];
    if (tipo && !tiposValidos.includes(tipo)) {
      return res.status(400).json({
        error: "Tipo inválido. Use: feature, improvement ou fix",
      });
    }

    const [patchNoteAtualizado] = await db("patch_notes")
      .where({ id })
      .update({
        versao: versao || patchNote.versao,
        titulo: titulo || patchNote.titulo,
        descricao: descricao || patchNote.descricao,
        tipo: tipo || patchNote.tipo,
        data_lancamento: data_lancamento || patchNote.data_lancamento,
        atualizado_em: db.raw(
          "CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'",
        ),
      })
      .returning("*");

    // Emitir evento Socket.IO
    io.to("global").emit("patch-note:updated", patchNoteAtualizado);

    res.json(patchNoteAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar patch note:", error);
    res.status(500).json({ error: "Erro ao atualizar atualização" });
  }
};

/**
 * Deletar patch note
 */
const deletar = async (req, res) => {
  try {
    const io = getIo();
    const { id } = req.params;

    const patchNote = await db("patch_notes").where({ id }).first();
    if (!patchNote) {
      return res.status(404).json({ error: "Atualização não encontrada" });
    }

    await db("patch_notes").where({ id }).del();

    // Emitir evento Socket.IO (garante que o ID seja número)
    io.to("global").emit("patch-note:deleted", { id: parseInt(id) });

    res.json({ message: "Atualização removida com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar patch note:", error);
    res.status(500).json({ error: "Erro ao remover atualização" });
  }
};

module.exports = {
  listar,
  criar,
  buscarPorId,
  atualizar,
  deletar,
};
