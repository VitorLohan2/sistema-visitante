const getBearerToken = require("../utils/getBearerToken");

const VisitanteRepository = require("../repositories/VisitanteRepository");
const CreateVisitanteService = require("../services/createVisitanteService");
const Events = require("../sockets/visitanteEvents");
const cloudinary = require("../../config/cloudinary");
const connection = require("../../database/connection");

module.exports = {
  async index(req, res) {
    try {
      const page = req.query.page || 1;
      const [{ count }] = await VisitanteRepository.count();
      const incidents = await VisitanteRepository.list(page);

      res.header("X-Total-Count", Number(count));
      return res.json(incidents);
    } catch (e) {
      return res.status(500).json({ error: "Erro ao listar cadastros" });
    }
  },

  async create(req, res) {
    try {
      const ong_id = getBearerToken(req);
      const id = await CreateVisitanteService(req, ong_id);
      return res.json({ id });
    } catch (e) {
      return res.status(e.statusCode || 500).json({ error: e.message });
    }
  },

  async show(req, res) {
    const incident = await VisitanteRepository.findById(req.params.id);
    if (!incident)
      return res.status(404).json({ error: "Cadastro não encontrado" });

    const normalize = (img) => (!img ? null : img);
    const fotos = [
      normalize(incident.imagem1),
      normalize(incident.imagem2),
      normalize(incident.imagem3),
    ].filter(Boolean);

    return res.json({
      ...incident,
      fotos,
      avatar_imagem: normalize(incident.avatar_imagem),
    });
  },

  async update(req, res) {
    const { id } = req.params;
    const {
      nome,
      nascimento,
      cpf,
      empresa,
      setor,
      telefone,
      observacao,
      placa_veiculo,
      cor_veiculo,
      avatar_imagem,
    } = req.body;

    const empresaData = await connection("empresas_visitantes")
      .where("nome", empresa)
      .select("id")
      .first();
    const setorData = await connection("setores_visitantes")
      .where("nome", setor)
      .select("id")
      .first();
    if (!empresaData || !setorData)
      return res.status(400).json({ error: "Empresa ou setor inválido" });

    const current = await VisitanteRepository.findById(id);
    if (!current)
      return res.status(404).json({ error: "Cadastro não encontrado" });

    let avatarToSave = null;
    const validImages = [
      current.imagem1,
      current.imagem2,
      current.imagem3,
    ].filter(Boolean);
    if (avatar_imagem && validImages.includes(avatar_imagem))
      avatarToSave = avatar_imagem;

    await VisitanteRepository.update(id, {
      nome,
      nascimento,
      cpf,
      empresa_id: empresaData.id,
      setor_id: setorData.id,
      telefone,
      observacao,
      placa_veiculo,
      cor_veiculo,
      avatar_imagem: avatarToSave,
    });

    Events.updated(id);
    return res.json({
      message: "Atualizado com sucesso",
      avatar_saved: avatarToSave,
    });
  },

  async blockIncident(req, res) {
    const { id } = req.params;
    const { bloqueado } = req.body;
    const ong_id = getBearerToken(req);

    const ong = await connection("ongs")
      .where("id", ong_id)
      .where("type", "ADM")
      .first();
    if (!ong)
      return res.status(403).json({ error: "Somente ADM pode bloquear" });

    const incident = await VisitanteRepository.findById(id);
    if (!incident)
      return res.status(404).json({ error: "Cadastro não encontrado" });

    await VisitanteRepository.update(id, { bloqueado: !!bloqueado });

    Events.blocked({
      id,
      bloqueado: !!bloqueado,
      timestamp: new Date(),
      incident_nome: incident.nome,
    });

    return res.json({ message: "OK", bloqueado: !!bloqueado });
  },

  async delete(req, res) {
    const { id } = req.params;
    const ong_id = getBearerToken(req);

    const ong = await connection("ongs")
      .where("id", ong_id)
      .where("type", "ADM")
      .first();
    if (!ong)
      return res.status(403).json({ error: "Somente ADM pode excluir" });

    const incident = await VisitanteRepository.findById(id);
    if (!incident) return res.status(404).json({ error: "Não encontrado" });

    const del = async (url) => {
      if (!url) return;
      try {
        const publicId = url.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch {}
    };

    await Promise.all([
      del(incident.imagem1),
      del(incident.imagem2),
      del(incident.imagem3),
    ]);

    await VisitanteRepository.delete(id);
    Events.deleted(id);

    return res.status(204).send();
  },
};
