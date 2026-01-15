/**
 * CadastroVisitanteController
 * Gerencia cadastros de visitantes (antigo IncidentController)
 *
 * IMPORTANTE: A tabela ainda se chama 'incidents' até a migration ser executada
 * Após a migration, trocar todas as referências para 'cadastro_visitante'
 */

const connection = require("../database/connection");
const cloudinary = require("../config/cloudinary");
const { getIo } = require("../socket");

// Nome da tabela (facilita futura migration)
const TABELA_VISITANTES = "cadastro_visitante"; // Tabela atualizada

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR VISITANTES (paginado)
  // GET /cadastro-visitantes
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    const { page = 1, limit = 10 } = request.query;

    try {
      const [{ count }] = await connection(TABELA_VISITANTES).count();

      const visitantes = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "usuarios",
          "usuarios.id",
          "=",
          `${TABELA_VISITANTES}.usuario_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .limit(limit)
        .offset((page - 1) * limit)
        .orderByRaw(`LOWER(${TABELA_VISITANTES}.nome) ASC`)
        .select([
          `${TABELA_VISITANTES}.*`,
          "empresa_visitante.nome as empresa_nome",
          "setor_visitante.nome as setor_nome",
          "usuarios.name as cadastrado_por",
          "funcao_visitante.nome as funcao_nome",
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
        ]);

      response.header("X-Total-Count", Number(count));
      return response.json(visitantes);
    } catch (error) {
      console.error("❌ Erro ao listar visitantes:", error);
      return response.status(500).json({
        error: "Erro ao listar cadastros.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVO CADASTRO DE VISITANTE
  // POST /cadastro-visitantes
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const io = getIo();

    // Pega usuário do middleware de autenticação
    const usuario_id = request.usuario?.id;

    if (!usuario_id) {
      return response.status(401).json({
        error: "Autenticação necessária",
        code: "AUTH_REQUIRED",
      });
    }

    const {
      nome,
      nascimento,
      cpf,
      empresa,
      setor,
      telefone,
      observacao,
      placa_veiculo,
      cor_veiculo_visitante_id,
      tipo_veiculo_visitante_id,
      funcao_visitante_id,
    } = request.body;

    try {
      // Validação de imagens
      if (!request.files || request.files.length === 0) {
        return response.status(400).json({
          error: "Nenhuma imagem enviada.",
          code: "NO_IMAGE",
        });
      }

      // Upload das imagens para o Cloudinary
      const uploadPromises = request.files.map(
        (file) =>
          new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  folder: "visitantes",
                  transformation: {
                    width: 1080,
                    crop: "limit",
                    quality: "auto:low",
                    fetch_format: "auto",
                  },
                  resource_type: "image",
                  public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result.secure_url);
                }
              )
              .end(file.buffer);
          })
      );

      const imageUrls = await Promise.all(uploadPromises);

      // Criar veículo se tiver placa informada
      let veiculoVisitanteId = null;
      const placaLimpa = placa_veiculo
        ? placa_veiculo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
        : null;

      if (placaLimpa && placaLimpa.length > 0) {
        const [veiculo] = await connection("veiculo_visitante")
          .insert({
            placa_veiculo: placaLimpa,
            cor_veiculo_visitante_id: cor_veiculo_visitante_id || null,
            tipo_veiculo_visitante_id: tipo_veiculo_visitante_id || null,
          })
          .returning("id");
        veiculoVisitanteId = veiculo.id;
      }

      // Inserir no banco
      const [visitante] = await connection(TABELA_VISITANTES)
        .insert({
          nome,
          nascimento,
          cpf: cpf.replace(/\D/g, ""), // Limpa CPF
          empresa_id: empresa,
          setor_id: setor,
          telefone,
          observacao,
          veiculo_visitante_id: veiculoVisitanteId,
          funcao_visitante_id: funcao_visitante_id || null,
          imagem1: imageUrls[0] || null,
          imagem2: imageUrls[1] || null,
          imagem3: imageUrls[2] || null,
          avatar_imagem: imageUrls[0] || null,
          usuario_id: usuario_id, // Quem cadastrou
          criado_em: new Date(), // Data de criação
        })
        .returning("id");

      // Atualizar o veículo com o visitante_id
      if (veiculoVisitanteId) {
        await connection("veiculo_visitante")
          .where("id", veiculoVisitanteId)
          .update({ visitante_id: visitante.id });
      }

      console.log("✅ Visitante cadastrado:", visitante.id);

      // Busca o visitante completo com JOINs para emitir via Socket
      const visitanteCompleto = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .where(`${TABELA_VISITANTES}.id`, visitante.id)
        .select([
          `${TABELA_VISITANTES}.*`,
          "empresa_visitante.nome as empresa_nome",
          "setor_visitante.nome as setor_nome",
          "funcao_visitante.nome as funcao_nome",
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
        ])
        .first();

      // Emite evento Socket.IO com dados completos incluindo nomes
      io.to("global").emit("visitante:created", {
        ...visitanteCompleto,
        empresa: visitanteCompleto.empresa_nome,
        setor: visitanteCompleto.setor_nome,
        funcao: visitanteCompleto.funcao_nome,
      });

      return response.status(201).json({
        id: visitante.id,
        message: "Visitante cadastrado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao cadastrar visitante:", error);
      return response.status(500).json({
        error: "Erro ao criar cadastro.",
        code: "CREATE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR VISITANTE ESPECÍFICO
  // GET /cadastro-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const visitante = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .where(`${TABELA_VISITANTES}.id`, id)
        .select(
          `${TABELA_VISITANTES}.*`,
          "empresa_visitante.nome as empresa",
          "setor_visitante.nome as setor",
          "funcao_visitante.nome as funcao",
          "funcao_visitante.id as funcao_visitante_id",
          "veiculo_visitante.id as veiculo_id",
          "veiculo_visitante.placa_veiculo",
          "veiculo_visitante.cor_veiculo_visitante_id",
          "veiculo_visitante.tipo_veiculo_visitante_id",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo"
        )
        .first();

      if (!visitante) {
        return response.status(404).json({
          error: "Cadastro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      // Normaliza URLs de imagens
      const normalizeImage = (image) => {
        if (!image) return null;
        if (image.startsWith("https://res.cloudinary.com")) return image;
        return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/visitantes/${image}`;
      };

      const fotos = [
        normalizeImage(visitante.imagem1),
        normalizeImage(visitante.imagem2),
        normalizeImage(visitante.imagem3),
      ].filter((url) => url !== null);

      return response.json({
        ...visitante,
        fotos,
        avatar_imagem: normalizeImage(visitante.avatar_imagem),
      });
    } catch (error) {
      console.error("❌ Erro ao buscar visitante:", error);
      return response.status(500).json({
        error: "Erro ao buscar cadastro.",
        code: "SHOW_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR VISITANTE
  // PUT /cadastro-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const io = getIo();
    const { id } = request.params;

    const {
      nome,
      nascimento,
      cpf,
      empresa,
      setor,
      telefone,
      observacao,
      placa_veiculo,
      cor_veiculo_visitante_id,
      tipo_veiculo_visitante_id,
      funcao_visitante_id,
      avatar_imagem,
    } = request.body;

    try {
      // Busca empresa pelo nome
      const empresaData = await connection("empresa_visitante")
        .where("nome", empresa)
        .select("id")
        .first();

      if (!empresaData) {
        return response.status(400).json({
          error: "Empresa não encontrada.",
          code: "EMPRESA_NOT_FOUND",
        });
      }

      // Busca setor pelo nome
      const setorData = await connection("setor_visitante")
        .where("nome", setor)
        .select("id")
        .first();

      if (!setorData) {
        return response.status(400).json({
          error: "Setor não encontrado.",
          code: "SETOR_NOT_FOUND",
        });
      }

      // Busca visitante atual
      const visitanteAtual = await connection(TABELA_VISITANTES)
        .where("id", id)
        .select(
          "imagem1",
          "imagem2",
          "imagem3",
          "usuario_id",
          "veiculo_visitante_id"
        )
        .first();

      if (!visitanteAtual) {
        return response.status(404).json({
          error: "Cadastro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      // Valida avatar
      let avatarToSave = null;
      if (avatar_imagem) {
        const validImages = [
          visitanteAtual.imagem1,
          visitanteAtual.imagem2,
          visitanteAtual.imagem3,
        ].filter((img) => img !== null);

        if (validImages.includes(avatar_imagem)) {
          avatarToSave = avatar_imagem;
        }
      }

      // Gerenciar veículo
      const placaLimpa = placa_veiculo
        ? placa_veiculo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
        : null;
      let veiculoVisitanteId = visitanteAtual.veiculo_visitante_id;

      if (placaLimpa && placaLimpa.length > 0) {
        if (veiculoVisitanteId) {
          // Atualiza veículo existente
          await connection("veiculo_visitante")
            .where("id", veiculoVisitanteId)
            .update({
              placa_veiculo: placaLimpa,
              cor_veiculo_visitante_id: cor_veiculo_visitante_id || null,
              tipo_veiculo_visitante_id: tipo_veiculo_visitante_id || null,
            });
        } else {
          // Cria novo veículo
          const [veiculo] = await connection("veiculo_visitante")
            .insert({
              visitante_id: id,
              placa_veiculo: placaLimpa,
              cor_veiculo_visitante_id: cor_veiculo_visitante_id || null,
              tipo_veiculo_visitante_id: tipo_veiculo_visitante_id || null,
            })
            .returning("id");
          veiculoVisitanteId = veiculo.id;
        }
      } else if (veiculoVisitanteId) {
        // Remove veículo se placa foi removida
        await connection("veiculo_visitante")
          .where("id", veiculoVisitanteId)
          .delete();
        veiculoVisitanteId = null;
      }

      // Atualiza
      await connection(TABELA_VISITANTES)
        .where("id", id)
        .update({
          nome,
          nascimento,
          cpf: cpf.replace(/\D/g, ""),
          empresa_id: empresaData.id,
          setor_id: setorData.id,
          telefone,
          observacao,
          veiculo_visitante_id: veiculoVisitanteId,
          funcao_visitante_id: funcao_visitante_id || null,
          avatar_imagem: avatarToSave,
          atualizado_em: new Date(), // Data de atualização
        });

      console.log("✅ Visitante atualizado:", id);

      // Busca o visitante atualizado com JOINs para emitir via Socket
      const visitanteAtualizado = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .where(`${TABELA_VISITANTES}.id`, id)
        .select([
          `${TABELA_VISITANTES}.*`,
          "empresa_visitante.nome as empresa_nome",
          "setor_visitante.nome as setor_nome",
          "funcao_visitante.nome as funcao_nome",
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
        ])
        .first();

      // Emite evento Socket.IO com dados completos incluindo nomes
      io.to("global").emit("visitante:updated", {
        ...visitanteAtualizado,
        empresa: visitanteAtualizado.empresa_nome,
        setor: visitanteAtualizado.setor_nome,
        funcao: visitanteAtualizado.funcao_nome,
      });

      return response.json({
        message: "Cadastro atualizado com sucesso.",
        avatar_saved: avatarToSave,
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar visitante:", error);
      return response.status(500).json({
        error: "Erro ao atualizar cadastro.",
        code: "UPDATE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BLOQUEAR/DESBLOQUEAR VISITANTE
  // PUT /cadastro-visitantes/:id/bloquear
  // ═══════════════════════════════════════════════════════════════
  async bloquear(request, response) {
    const io = getIo();
    const { id } = request.params;
    const { bloqueado } = request.body;

    // Verifica se é admin (vem do adminMiddleware)
    if (!request.usuario || !request.usuario.isAdmin) {
      return response.status(403).json({
        error: "Somente administradores podem bloquear cadastros.",
        code: "ADMIN_REQUIRED",
      });
    }

    try {
      const visitante = await connection(TABELA_VISITANTES)
        .where("id", id)
        .first();

      if (!visitante) {
        return response.status(404).json({
          error: "Cadastro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      await connection(TABELA_VISITANTES)
        .where("id", id)
        .update({ bloqueado: !!bloqueado });

      console.log(
        `✅ Visitante ${bloqueado ? "bloqueado" : "desbloqueado"}:`,
        id
      );

      // Busca visitante atualizado
      const visitanteAtualizado = await connection(TABELA_VISITANTES)
        .where("id", id)
        .first();

      // Emite evento Socket.IO com dados completos
      io.to("global").emit("visitante:updated", visitanteAtualizado);

      return response.json({
        message: bloqueado ? "Visitante bloqueado" : "Visitante desbloqueado",
        id,
        bloqueado: !!bloqueado,
      });
    } catch (error) {
      console.error("❌ Erro ao bloquear visitante:", error);
      return response.status(500).json({
        error: "Erro ao atualizar bloqueio.",
        code: "BLOCK_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR VISITANTE
  // DELETE /cadastro-visitantes/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const io = getIo();
    const { id } = request.params;

    // Verifica se é admin
    if (!request.usuario || !request.usuario.isAdmin) {
      return response.status(403).json({
        error: "Somente administradores podem excluir cadastros.",
        code: "ADMIN_REQUIRED",
      });
    }

    try {
      const visitante = await connection(TABELA_VISITANTES)
        .where("id", id)
        .first();

      if (!visitante) {
        return response.status(404).json({
          error: "Cadastro não encontrado.",
          code: "NOT_FOUND",
        });
      }

      // Deleta imagens do Cloudinary
      const deleteImage = async (url) => {
        if (!url) return;
        try {
          const publicId = url.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error(`Erro ao deletar imagem ${url}:`, error);
        }
      };

      await Promise.all([
        deleteImage(visitante.imagem1),
        deleteImage(visitante.imagem2),
        deleteImage(visitante.imagem3),
      ]);

      // Deleta do banco
      await connection(TABELA_VISITANTES).where("id", id).delete();

      console.log("✅ Visitante deletado:", id);

      // Emite evento Socket.IO
      io.to("global").emit("visitante:deleted", { id });

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar visitante:", error);
      return response.status(500).json({
        error: "Erro ao excluir cadastro.",
        code: "DELETE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR DADOS PARA CRACHÁ
  // GET /cadastro-visitantes/:id/cracha
  // ═══════════════════════════════════════════════════════════════
  async cracha(request, response) {
    const { id } = request.params;

    try {
      const dados = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .where(`${TABELA_VISITANTES}.id`, id)
        .select(
          `${TABELA_VISITANTES}.id`,
          `${TABELA_VISITANTES}.nome`,
          `${TABELA_VISITANTES}.cpf`,
          `${TABELA_VISITANTES}.telefone`,
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
          "funcao_visitante.nome as funcao",
          "empresa_visitante.nome as empresa",
          "setor_visitante.nome as setor",
          `${TABELA_VISITANTES}.avatar_imagem`
        )
        .first();

      if (!dados) {
        return response.status(404).json({
          error: "Colaborador não encontrado.",
          code: "NOT_FOUND",
        });
      }

      return response.json(dados);
    } catch (error) {
      console.error("❌ Erro ao buscar crachá:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "BADGE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // VERIFICAR SE CPF EXISTE
  // GET /cadastro-visitantes/cpf/:cpf
  // ═══════════════════════════════════════════════════════════════
  async verificarCpf(request, response) {
    const { cpf } = request.params;

    try {
      const cpfLimpo = cpf.replace(/\D/g, "");
      const visitante = await connection(TABELA_VISITANTES)
        .where("cpf", cpfLimpo)
        .first();

      return response.json({ exists: !!visitante });
    } catch (error) {
      console.error("❌ Erro ao verificar CPF:", error);
      return response.status(500).json({
        error: "Erro ao verificar CPF.",
        code: "CPF_CHECK_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR VISITANTES (por nome ou CPF)
  // GET /cadastro-visitantes/buscar?query=xxx
  // ═══════════════════════════════════════════════════════════════
  async buscar(request, response) {
    const { query } = request.query;

    if (!query || query.trim() === "") {
      return response.status(400).json({
        error: "Parâmetro de busca não informado.",
        code: "QUERY_REQUIRED",
      });
    }

    try {
      const visitantes = await connection(TABELA_VISITANTES)
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .where(function () {
          this.where("nome", "ILIKE", `%${query}%`).orWhere(
            "cpf",
            "ILIKE",
            `%${query}%`
          );
        })
        .select([
          `${TABELA_VISITANTES}.id`,
          `${TABELA_VISITANTES}.nome`,
          `${TABELA_VISITANTES}.cpf`,
          `${TABELA_VISITANTES}.telefone`,
          `${TABELA_VISITANTES}.nascimento`,
          `${TABELA_VISITANTES}.empresa_id`,
          `${TABELA_VISITANTES}.setor_id`,
          `${TABELA_VISITANTES}.avatar_imagem`,
          `${TABELA_VISITANTES}.bloqueado`,
          `${TABELA_VISITANTES}.usuario_id`,
          `${TABELA_VISITANTES}.funcao_visitante_id`,
          `${TABELA_VISITANTES}.veiculo_visitante_id`,
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
          "funcao_visitante.nome as funcao",
        ]);

      return response.json(visitantes);
    } catch (error) {
      console.error("❌ Erro na busca:", error);
      return response.status(500).json({
        error: "Erro ao realizar busca",
        code: "SEARCH_ERROR",
      });
    }
  },

  // Alias para compatibilidade com rotas legadas
  async search(request, response) {
    return this.buscar(request, response);
  },

  // ═══════════════════════════════════════════════════════════════
  // BLOQUEAR/DESBLOQUEAR VISITANTE
  // PUT /cadastro-visitantes/:id/bloquear
  // ═══════════════════════════════════════════════════════════════
  async blockIncident(request, response) {
    const io = getIo();
    const { id } = request.params;
    const { bloqueado } = request.body;

    // Extrai o token do header Authorization
    const authHeader = request.headers.authorization;
    const usuario_id = authHeader ? authHeader.replace("Bearer ", "") : null;

    console.log("🚫 Bloqueio solicitado:", { id, bloqueado, usuario_id });

    try {
      // Verificar se é admin via papéis
      const papeis = await connection("usuarios_papeis")
        .join("papeis", "usuarios_papeis.papel_id", "papeis.id")
        .where("usuarios_papeis.usuario_id", usuario_id)
        .pluck("papeis.nome");

      const isAdmin = Array.isArray(papeis) && papeis.includes("ADMIN");

      if (!isAdmin) {
        console.log(
          `❌ Tentativa de bloqueio não autorizada por: ${usuario_id}`
        );
        return response.status(403).json({
          error: "Somente administradores podem bloquear cadastros.",
        });
      }

      const visitante = await connection(TABELA_VISITANTES)
        .where("id", id)
        .first();
      if (!visitante) {
        return response.status(404).json({ error: "Cadastro não encontrado." });
      }

      await connection(TABELA_VISITANTES)
        .where("id", id)
        .update({ bloqueado: !!bloqueado });

      const eventData = {
        id,
        bloqueado: !!bloqueado,
        timestamp: new Date(),
        visitante_nome: visitante.nome,
      };

      io.to("global").emit("visitante:block", eventData);
      io.to("global").emit("visitante:update", eventData);

      if (bloqueado) {
        io.to("global").emit("bloqueio:created", eventData);
      } else {
        io.to("global").emit("bloqueio:updated", {
          ...eventData,
          acao: "desbloqueado",
        });
      }

      console.log(
        `✅ Cadastro ${bloqueado ? "bloqueado" : "desbloqueado"} com sucesso`
      );

      return response.json({
        success: true,
        bloqueado: !!bloqueado,
      });
    } catch (error) {
      console.error("❌ Erro ao bloquear/desbloquear:", error);
      return response.status(500).json({
        error: "Erro ao processar bloqueio",
        code: "BLOCK_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR DADOS PARA CRACHÁ
  // GET /cadastro-visitantes/:id/badge
  // ═══════════════════════════════════════════════════════════════
  async showBadge(request, response) {
    const { id } = request.params;

    try {
      const badgeData = await connection(TABELA_VISITANTES)
        .leftJoin(
          "empresa_visitante",
          "empresa_visitante.id",
          "=",
          `${TABELA_VISITANTES}.empresa_id`
        )
        .leftJoin(
          "setor_visitante",
          "setor_visitante.id",
          "=",
          `${TABELA_VISITANTES}.setor_id`
        )
        .leftJoin(
          "funcao_visitante",
          "funcao_visitante.id",
          "=",
          `${TABELA_VISITANTES}.funcao_visitante_id`
        )
        .leftJoin(
          "veiculo_visitante",
          "veiculo_visitante.id",
          "=",
          `${TABELA_VISITANTES}.veiculo_visitante_id`
        )
        .leftJoin(
          "cor_veiculo_visitante",
          "cor_veiculo_visitante.id",
          "=",
          "veiculo_visitante.cor_veiculo_visitante_id"
        )
        .leftJoin(
          "tipo_veiculo_visitante",
          "tipo_veiculo_visitante.id",
          "=",
          "veiculo_visitante.tipo_veiculo_visitante_id"
        )
        .where(`${TABELA_VISITANTES}.id`, id)
        .select(
          `${TABELA_VISITANTES}.id`,
          `${TABELA_VISITANTES}.nome`,
          `${TABELA_VISITANTES}.cpf`,
          `${TABELA_VISITANTES}.telefone`,
          "veiculo_visitante.placa_veiculo",
          "cor_veiculo_visitante.nome as cor_veiculo",
          "tipo_veiculo_visitante.nome as tipo_veiculo",
          "funcao_visitante.nome as funcao",
          "empresa_visitante.nome as empresa",
          "setor_visitante.nome as setor",
          `${TABELA_VISITANTES}.avatar_imagem`
        )
        .first();

      if (!badgeData) {
        return response
          .status(404)
          .json({ error: "Colaborador não encontrado." });
      }

      return response.json(badgeData);
    } catch (error) {
      console.error("❌ Erro ao buscar crachá:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "BADGE_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // VERIFICAR SE CPF JÁ EXISTE
  // GET /cpf-existe/:cpf
  // ═══════════════════════════════════════════════════════════════
  async checkCpf(request, response) {
    const { cpf } = request.params;

    try {
      const cpfLimpo = cpf.replace(/\D/g, "");
      const visitante = await connection(TABELA_VISITANTES)
        .where("cpf", cpfLimpo)
        .first();

      return response.json({ exists: !!visitante });
    } catch (error) {
      console.error("❌ Erro ao verificar CPF:", error);
      return response.status(500).json({
        error: "Erro ao verificar CPF.",
        code: "CPF_CHECK_ERROR",
      });
    }
  },
};
