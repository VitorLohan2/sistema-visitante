/**
 * UsuarioController
 * Gerencia CRUD de usuários do sistema
 **/

const generateUniqueId = require("../utils/generateUniqueId");
const connection = require("../database/connection");
const { getIo } = require("../socket");
const { hashSenha } = require("../utils/password");
const {
  isAdmin: verificarAdmin,
} = require("../middleware/permissaoMiddleware");

// Nome da tabela (facilita futura migration)
const TABELA_USUARIOS = "usuarios"; // Tabela atualizada

module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // LISTAR TODOS OS USUÁRIOS
  // GET /usuarios
  // ═══════════════════════════════════════════════════════════════
  async index(request, response) {
    try {
      const usuarios = await connection(TABELA_USUARIOS)
        .leftJoin("empresas", `${TABELA_USUARIOS}.empresa_id`, "empresas.id")
        .leftJoin("setores", `${TABELA_USUARIOS}.setor_id`, "setores.id")
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.name as nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.birthdate as data_nascimento`,
          `${TABELA_USUARIOS}.city as cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.type as tipo`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresas.nome as empresa_nome",
          "setores.nome as setor_nome"
        )
        .orderBy(`${TABELA_USUARIOS}.name`, "asc");

      return response.json(usuarios);
    } catch (error) {
      console.error("❌ Erro ao listar usuários:", error);
      return response.status(500).json({
        error: "Erro ao listar usuários.",
        code: "LIST_ERROR",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIAR NOVO USUÁRIO (Cadastro público)
  // POST /usuarios
  // ═══════════════════════════════════════════════════════════════
  async create(request, response) {
    const io = getIo();
    const {
      nome,
      data_nascimento,
      cpf,
      empresa_id,
      setor_id,
      email,
      whatsapp,
      cidade,
      uf,
      tipo,
      codigo_acesso,
      senha, // Novo campo para senha
    } = request.body;

    // Mapeamento para compatibilidade com campos antigos
    const name = nome || request.body.name;
    const birthdate = data_nascimento || request.body.birthdate;
    const city = cidade || request.body.city;

    // Tipo do usuário
    const tipoUsuario = tipo || request.body.type || "USER";

    // 🔐 Validação do código (apenas para USER)
    if (tipoUsuario === "USER") {
      try {
        const codigoValido = await connection("codigos_cadastro")
          .where({
            codigo: codigo_acesso.toUpperCase(),
            ativo: true,
          })
          .andWhereRaw("usos_atuais < limite_usos")
          .first();

        if (!codigoValido) {
          return response.status(400).json({
            error: "Código de acesso inválido ou limite de usos atingido",
            code: "INVALID_ACCESS_CODE",
          });
        }

        await connection("codigos_cadastro")
          .where("codigo", codigo_acesso.toUpperCase())
          .increment("usos_atuais", 1);
      } catch (error) {
        console.error("❌ Erro ao validar código:", error);
        return response.status(500).json({
          error: "Erro ao validar código de acesso",
          code: "CODE_VALIDATION_ERROR",
        });
      }
    }

    try {
      const cleanedCpf = cpf.replace(/\D/g, "");
      const cleanedWhatsapp = whatsapp ? whatsapp.replace(/\D/g, "") : null;

      // Verifica se email já existe
      const emailExiste = await connection(TABELA_USUARIOS)
        .where("email", email.toLowerCase())
        .first();

      if (emailExiste) {
        return response.status(400).json({
          error: "Este email já está cadastrado",
          code: "EMAIL_EXISTS",
        });
      }

      // Verifica se CPF já existe
      const cpfExiste = await connection(TABELA_USUARIOS)
        .where("cpf", cleanedCpf)
        .first();

      if (cpfExiste) {
        return response.status(400).json({
          error: "Este CPF já está cadastrado",
          code: "CPF_EXISTS",
        });
      }

      const id = generateUniqueId();

      // Dados para inserção
      const dadosInsercao = {
        id,
        name,
        birthdate: birthdate || null,
        cpf: cleanedCpf,
        empresa_id: empresa_id || null,
        setor_id: setor_id || null,
        email: email.toLowerCase(),
        whatsapp: cleanedWhatsapp,
        city: city || null,
        uf: uf ? uf.toUpperCase() : null,
        type: tipoUsuario,
      };

      // Se senha foi fornecida, adiciona hash
      if (senha) {
        dadosInsercao.senha = hashSenha(senha);
      }

      await connection(TABELA_USUARIOS).insert(dadosInsercao);

      console.log("✅ Usuário cadastrado:", id);

      // Emite evento Socket.IO
      io.to("global").emit("usuario:created", {
        id,
        nome: name,
        tipo: tipoUsuario,
      });

      return response.status(201).json({
        id,
        message: "Usuário cadastrado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      return response.status(500).json({
        error: "Erro ao criar usuário",
        code: "CREATE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR USUÁRIO ESPECÍFICO
  // GET /usuarios/:id
  // ═══════════════════════════════════════════════════════════════
  async show(request, response) {
    const { id } = request.params;

    try {
      const usuario = await connection(TABELA_USUARIOS)
        .leftJoin("empresas", `${TABELA_USUARIOS}.empresa_id`, "empresas.id")
        .leftJoin("setores", `${TABELA_USUARIOS}.setor_id`, "setores.id")
        .where(`${TABELA_USUARIOS}.id`, id)
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.name as nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.birthdate as data_nascimento`,
          `${TABELA_USUARIOS}.city as cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.type as tipo`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresas.nome as empresa_nome",
          "setores.nome as setor_nome",
          // Campos antigos para compatibilidade
          `${TABELA_USUARIOS}.name`,
          `${TABELA_USUARIOS}.birthdate`,
          `${TABELA_USUARIOS}.city`,
          `${TABELA_USUARIOS}.type`,
          "empresas.nome as empresa",
          "setores.nome as setor"
        )
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      return response.json(usuario);
    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      return response.status(500).json({
        error: "Erro ao buscar usuário",
        code: "SHOW_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ATUALIZAR USUÁRIO
  // PUT /usuarios/:id
  // ═══════════════════════════════════════════════════════════════
  async update(request, response) {
    const io = getIo();
    const { id } = request.params;
    const {
      nome,
      data_nascimento,
      cpf,
      empresa_id,
      setor_id,
      email,
      whatsapp,
      cidade,
      uf,
    } = request.body;

    // Mapeamento para compatibilidade
    const name = nome || request.body.name;
    const birthdate = data_nascimento || request.body.birthdate;
    const city = cidade || request.body.city;

    try {
      // 1. Verificar se o usuário existe
      const usuarioExiste = await connection(TABELA_USUARIOS)
        .where("id", id)
        .first();

      if (!usuarioExiste) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      // 2. Verificar se é ADM (não pode editar ADM)
      const usuarioIsAdmin = await verificarAdmin(usuarioExiste.id);
      if (usuarioIsAdmin) {
        // Permite apenas se o próprio usuário estiver editando
        if (!request.usuario || request.usuario.id !== id) {
          return response.status(403).json({
            error: "Administradores só podem editar seus próprios dados",
            code: "ADMIN_SELF_EDIT_ONLY",
          });
        }
      }

      // 3. Limpar CPF e WhatsApp
      const cleanedCpf = cpf ? cpf.replace(/\D/g, "") : usuarioExiste.cpf;
      const cleanedWhatsapp = whatsapp
        ? whatsapp.replace(/\D/g, "")
        : usuarioExiste.whatsapp;

      // 4. Verificar se CPF já existe (outro usuário)
      if (cpf) {
        const cpfEmUso = await connection(TABELA_USUARIOS)
          .where("cpf", cleanedCpf)
          .whereNot("id", id)
          .first();

        if (cpfEmUso) {
          return response.status(400).json({
            error: "Este CPF já está cadastrado para outro usuário",
            code: "CPF_IN_USE",
          });
        }
      }

      // 5. Verificar se email já existe (outro usuário)
      if (email) {
        const emailEmUso = await connection(TABELA_USUARIOS)
          .where("email", email.toLowerCase())
          .whereNot("id", id)
          .first();

        if (emailEmUso) {
          return response.status(400).json({
            error: "Este email já está cadastrado para outro usuário",
            code: "EMAIL_IN_USE",
          });
        }
      }

      // 6. Atualizar usuário
      await connection(TABELA_USUARIOS)
        .where("id", id)
        .update({
          name: name || usuarioExiste.name,
          birthdate: birthdate || usuarioExiste.birthdate,
          cpf: cleanedCpf,
          empresa_id:
            empresa_id !== undefined ? empresa_id : usuarioExiste.empresa_id,
          setor_id: setor_id !== undefined ? setor_id : usuarioExiste.setor_id,
          email: email ? email.toLowerCase() : usuarioExiste.email,
          whatsapp: cleanedWhatsapp,
          city: city !== undefined ? city : usuarioExiste.city,
          uf: uf ? uf.toUpperCase() : usuarioExiste.uf,
          updated_at: connection.fn.now(),
        });

      console.log("✅ Usuário atualizado:", id);

      // Emite evento Socket.IO
      io.to("global").emit("usuario:updated", { id });

      return response.json({
        message: "Usuário atualizado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário:", error);
      return response.status(500).json({
        error: "Erro ao atualizar usuário",
        code: "UPDATE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // DELETAR USUÁRIO
  // DELETE /usuarios/:id
  // ═══════════════════════════════════════════════════════════════
  async delete(request, response) {
    const io = getIo();
    const { id } = request.params;

    try {
      // 1. Verificar se o usuário existe
      const usuarioExiste = await connection(TABELA_USUARIOS)
        .where("id", id)
        .first();

      if (!usuarioExiste) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      // 2. Verificar se é ADM (não pode deletar ADM)
      const usuarioIsAdmin = await verificarAdmin(usuarioExiste.id);
      if (usuarioIsAdmin) {
        return response.status(403).json({
          error: "Administradores não podem ser excluídos",
          code: "ADMIN_DELETE_FORBIDDEN",
        });
      }

      // 3. Deletar registros relacionados
      await connection("history").where("usuario_id", id).delete();

      // 4. Deletar o usuário
      await connection(TABELA_USUARIOS).where("id", id).delete();

      console.log("✅ Usuário deletado:", id);

      // Emite evento Socket.IO
      io.to("global").emit("usuario:deleted", { id });

      return response.status(204).send();
    } catch (error) {
      console.error("❌ Erro ao deletar usuário:", error);
      return response.status(500).json({
        error: "Erro ao deletar usuário",
        code: "DELETE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSCAR PERFIL DO USUÁRIO LOGADO
  // GET /usuarios/perfil (requer authMiddleware)
  // ═══════════════════════════════════════════════════════════════
  async perfil(request, response) {
    const { id } = request.usuario; // Vem do authMiddleware

    try {
      const usuario = await connection(TABELA_USUARIOS)
        .leftJoin("empresas", `${TABELA_USUARIOS}.empresa_id`, "empresas.id")
        .leftJoin("setores", `${TABELA_USUARIOS}.setor_id`, "setores.id")
        .where(`${TABELA_USUARIOS}.id`, id)
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.name as nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.birthdate as data_nascimento`,
          `${TABELA_USUARIOS}.city as cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.type as tipo`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresas.nome as empresa_nome",
          "setores.nome as setor_nome",
          // Campos antigos para compatibilidade
          `${TABELA_USUARIOS}.name`,
          `${TABELA_USUARIOS}.type`
        )
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      return response.json(usuario);
    } catch (error) {
      console.error("❌ Erro ao buscar perfil:", error);
      return response.status(500).json({
        error: "Erro ao buscar perfil",
        code: "PROFILE_ERROR",
      });
    }
  },
};
