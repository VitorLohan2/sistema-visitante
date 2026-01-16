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
        .leftJoin(
          "empresa_interno",
          `${TABELA_USUARIOS}.empresa_id`,
          "empresa_interno.id"
        )
        .leftJoin(
          "setor_usuario",
          `${TABELA_USUARIOS}.setor_id`,
          "setor_usuario.id"
        )
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.nascimento as data_nascimento`,
          `${TABELA_USUARIOS}.cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresa_interno.nome as empresa_nome",
          "setor_usuario.nome as setor_nome"
        )
        .orderBy(`${TABELA_USUARIOS}.nome`, "asc");

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
        nome: name,
        nascimento: birthdate || null,
        cpf: cleanedCpf,
        empresa_id: empresa_id || null,
        setor_id: setor_id || null,
        email: email.toLowerCase(),
        whatsapp: cleanedWhatsapp,
        cidade: city || null,
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
        .leftJoin(
          "empresa_interno",
          `${TABELA_USUARIOS}.empresa_id`,
          "empresa_interno.id"
        )
        .leftJoin(
          "setor_usuario",
          `${TABELA_USUARIOS}.setor_id`,
          "setor_usuario.id"
        )
        .where(`${TABELA_USUARIOS}.id`, id)
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.nascimento as data_nascimento`,
          `${TABELA_USUARIOS}.cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresa_interno.nome as empresa_nome",
          "setor_usuario.nome as setor_nome",
          // Campos antigos para compatibilidade
          `${TABELA_USUARIOS}.nome as name`,
          `${TABELA_USUARIOS}.nascimento as birthdate`,
          `${TABELA_USUARIOS}.cidade as city`,
          "empresa_interno.nome as empresa",
          "setor_usuario.nome as setor"
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
          nome: name || usuarioExiste.nome,
          nascimento: birthdate || usuarioExiste.nascimento,
          cpf: cleanedCpf,
          empresa_id:
            empresa_id !== undefined ? empresa_id : usuarioExiste.empresa_id,
          setor_id: setor_id !== undefined ? setor_id : usuarioExiste.setor_id,
          email: email ? email.toLowerCase() : usuarioExiste.email,
          whatsapp: cleanedWhatsapp,
          cidade: city !== undefined ? city : usuarioExiste.cidade,
          uf: uf ? uf.toUpperCase() : usuarioExiste.uf,
          atualizado_em: connection.fn.now(),
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
      await connection("historico_visitante").where("usuario_id", id).delete();

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
        .leftJoin(
          "empresa_interno",
          `${TABELA_USUARIOS}.empresa_id`,
          "empresa_interno.id"
        )
        .leftJoin(
          "setor_usuario",
          `${TABELA_USUARIOS}.setor_id`,
          "setor_usuario.id"
        )
        .where(`${TABELA_USUARIOS}.id`, id)
        .select(
          `${TABELA_USUARIOS}.id`,
          `${TABELA_USUARIOS}.nome`,
          `${TABELA_USUARIOS}.email`,
          `${TABELA_USUARIOS}.whatsapp`,
          `${TABELA_USUARIOS}.cpf`,
          `${TABELA_USUARIOS}.nascimento as data_nascimento`,
          `${TABELA_USUARIOS}.cidade`,
          `${TABELA_USUARIOS}.uf`,
          `${TABELA_USUARIOS}.empresa_id`,
          `${TABELA_USUARIOS}.setor_id`,
          "empresa_interno.nome as empresa_nome",
          "setor_usuario.nome as setor_nome",
          // Campos antigos para compatibilidade
          `${TABELA_USUARIOS}.nome as name`
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

  // ═══════════════════════════════════════════════════════════════
  // CRIAR USUÁRIO INTERNO (Apenas Admin - sem código de acesso)
  // POST /usuarios/interno
  // ═══════════════════════════════════════════════════════════════
  async createInterno(request, response) {
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
      papel_id, // Papel para vincular em usuarios_papeis
      senha,
    } = request.body;

    console.log("📝 === CADASTRO DE USUÁRIO INTERNO ===");
    console.log("📝 Body completo recebido:", request.body);
    console.log("📝 Campos extraídos:", {
      nome,
      cpf,
      email,
      papel_id,
      senha: senha ? "****" : "não fornecido",
    });

    // Valida se papel_id foi informado
    if (!papel_id) {
      console.error("❌ Papel não informado");
      return response.status(400).json({
        error: "Papel do usuário é obrigatório",
        code: "PAPEL_REQUIRED",
      });
    }

    // Valida campos obrigatórios
    if (!cpf || !email || !nome) {
      console.error("❌ Campos obrigatórios faltando:", { cpf, email, nome });
      return response.status(400).json({
        error: "CPF, Email e Nome são obrigatórios",
        code: "MISSING_FIELDS",
      });
    }
    // Valida tamanho mínimo da senha
    if (senha.length < 6) {
      console.error("❌ Senha muito curta:", senha.length);
      return response.status(400).json({
        error: "A senha deve ter no mínimo 6 caracteres",
        code: "WEAK_PASSWORD",
      });
    }
    try {
      const cleanedCpf = cpf.replace(/\D/g, "");
      const cleanedWhatsapp = whatsapp ? whatsapp.replace(/\D/g, "") : null;

      console.log("📌 CPF limpo:", cleanedCpf);

      // Verifica se o papel existe
      const papelExiste = await connection("papeis")
        .where("id", papel_id)
        .first();

      console.log("🔍 Papel encontrado:", papelExiste);

      if (!papelExiste) {
        console.error("❌ Papel não encontrado com ID:", papel_id);
        return response.status(400).json({
          error: "Papel não encontrado",
          code: "PAPEL_NOT_FOUND",
        });
      }

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

      // Dados para inserção (sem type - agora usa papeis)
      const dadosInsercao = {
        id,
        nome: nome,
        nascimento: data_nascimento || null,
        cpf: cleanedCpf,
        empresa_id: empresa_id || null,
        setor_id: setor_id || null,
        email: email.toLowerCase(),
        whatsapp: cleanedWhatsapp,
        cidade: cidade || null,
        uf: uf ? uf.toUpperCase() : null,
      };

      // Se senha foi fornecida, adiciona hash
      if (senha) {
        dadosInsercao.senha = hashSenha(senha);
      }

      // Usando transação para garantir consistência
      await connection.transaction(async (trx) => {
        // Insere o usuário
        await trx(TABELA_USUARIOS).insert(dadosInsercao);

        // Vincula o usuário ao papel na tabela usuarios_papeis
        await trx("usuarios_papeis").insert({
          usuario_id: id,
          papel_id: parseInt(papel_id),
        });
      });

      console.log(
        "✅ Usuário interno cadastrado:",
        id,
        "com papel:",
        papelExiste.nome
      );

      // Emite evento Socket.IO
      io.to("global").emit("usuario:created", {
        id,
        nome,
        papel: papelExiste.nome,
      });

      return response.status(201).json({
        id,
        nome,
        email: email.toLowerCase(),
        papel: papelExiste.nome,
        message: "Usuário cadastrado com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao criar usuário interno:", error.message);
      console.error("Stack:", error.stack);

      // Trata erros específicos de banco de dados
      if (error.message.includes("cpf")) {
        return response.status(400).json({
          error: "CPF inválido ou já cadastrado",
          code: "CPF_ERROR",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      if (error.message.includes("email")) {
        return response.status(400).json({
          error: "Email inválido ou já cadastrado",
          code: "EMAIL_ERROR",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      return response.status(500).json({
        error: "Erro ao criar usuário",
        code: "CREATE_ERROR",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};
