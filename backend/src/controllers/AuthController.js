const connection = require("../database/connection");
const { gerarToken } = require("../utils/jwt");
const {
  verificarSenha,
  hashSenha,
  gerarSenhaTemporaria,
  gerarTokenRedefinicao,
} = require("../utils/password");

module.exports = {
  /**
   * LOGIN - Autenticação por email e senha
   * POST /auth/login
   */
  async login(request, response) {
    const { email, senha } = request.body;

    try {
      // Busca usuário pelo email
      const usuario = await connection("usuarios")
        .where("email", email.toLowerCase())
        .select(
          "id",
          "name",
          "email",
          "type",
          "empresa_id",
          "setor_id",
          "senha"
        )
        .first();

      if (!usuario) {
        return response.status(401).json({
          error: "Email ou senha inválidos",
          code: "INVALID_CREDENTIALS",
        });
      }

      // Verifica se o usuário tem senha cadastrada
      if (!usuario.senha) {
        // Primeiro acesso - precisa criar senha
        return response.status(403).json({
          error: "Primeiro acesso detectado. É necessário criar uma senha.",
          code: "PASSWORD_NOT_SET",
          requirePasswordSetup: true,
          userId: usuario.id,
        });
      }

      // Verifica a senha
      const senhaValida = verificarSenha(senha, usuario.senha);

      if (!senhaValida) {
        return response.status(401).json({
          error: "Email ou senha inválidos",
          code: "INVALID_CREDENTIALS",
        });
      }

      // Gera o token JWT
      const token = gerarToken({
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        tipo: usuario.type,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      });

      return response.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          tipo: usuario.type,
          empresa_id: usuario.empresa_id,
          setor_id: usuario.setor_id,
        },
      });
    } catch (error) {
      console.error("❌ Erro no login:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * LOGIN LEGADO - Mantém compatibilidade com login por ID
   * POST /auth/login-id (temporário - remover após migração)
   */
  async loginPorId(request, response) {
    const { id } = request.body;

    try {
      const usuario = await connection("usuarios")
        .where("id", id)
        .select("id", "name", "email", "type", "empresa_id", "setor_id")
        .first();

      if (!usuario) {
        return response.status(400).json({
          error: "Nenhum cadastro encontrado com este ID",
          code: "USER_NOT_FOUND",
        });
      }

      // Gera o token JWT
      const token = gerarToken({
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        tipo: usuario.type,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      });

      return response.json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          tipo: usuario.type,
          empresa_id: usuario.empresa_id,
          setor_id: usuario.setor_id,
        },
        // Mantém campos antigos para compatibilidade
        name: usuario.name,
        type: usuario.type,
        setor_id: usuario.setor_id,
      });
    } catch (error) {
      console.error("❌ Erro no login por ID:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * CRIAR SENHA - Para primeiro acesso ou migração
   * POST /auth/criar-senha
   */
  async criarSenha(request, response) {
    const { userId, senha, confirmarSenha } = request.body;

    try {
      // Validações
      if (senha !== confirmarSenha) {
        return response.status(400).json({
          error: "As senhas não coincidem",
          code: "PASSWORD_MISMATCH",
        });
      }

      if (senha.length < 6) {
        return response.status(400).json({
          error: "A senha deve ter pelo menos 6 caracteres",
          code: "PASSWORD_TOO_SHORT",
        });
      }

      const usuario = await connection("usuarios")
        .where("id", userId)
        .select(
          "id",
          "name",
          "email",
          "type",
          "empresa_id",
          "setor_id",
          "senha"
        )
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      // Gera hash da senha
      const senhaHash = hashSenha(senha);

      // Atualiza a senha do usuário
      await connection("usuarios")
        .where("id", userId)
        .update({ senha: senhaHash });

      // Gera o token JWT
      const token = gerarToken({
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        tipo: usuario.type,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      });

      return response.json({
        message: "Senha criada com sucesso",
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.name,
          email: usuario.email,
          tipo: usuario.type,
          empresa_id: usuario.empresa_id,
          setor_id: usuario.setor_id,
        },
      });
    } catch (error) {
      console.error("❌ Erro ao criar senha:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * SOLICITAR REDEFINIÇÃO DE SENHA
   * POST /auth/esqueci-senha
   */
  async esqueciSenha(request, response) {
    const { email } = request.body;

    try {
      const usuario = await connection("usuarios")
        .select("id", "name", "email")
        .first();

      if (!usuario) {
        // Por segurança, não revela se o email existe ou não
        return response.json({
          message:
            "Se o email existir em nossa base, você receberá instruções para redefinir sua senha.",
        });
      }

      // Gera token de redefinição
      const { token, expiracao } = gerarTokenRedefinicao();

      // Salva o token no banco (pode criar uma tabela específica ou usar coluna na tabela usuarios)
      await connection("usuarios").where("id", usuario.id).update({
        reset_token: token,
        reset_token_expira: expiracao,
      });

      // TODO: Enviar email com link de redefinição
      // Por enquanto, retorna o token (apenas em desenvolvimento)
      const isDev = process.env.NODE_ENV === "development";

      return response.json({
        message:
          "Se o email existir em nossa base, você receberá instruções para redefinir sua senha.",
        ...(isDev && {
          dev_token: token,
          dev_message: "Token de redefinição (apenas em desenvolvimento)",
        }),
      });
    } catch (error) {
      console.error("❌ Erro ao solicitar redefinição de senha:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * REDEFINIR SENHA (com token)
   * POST /auth/redefinir-senha
   */
  async redefinirSenha(request, response) {
    const { token, novaSenha, confirmarSenha } = request.body;

    try {
      // Validações
      if (novaSenha !== confirmarSenha) {
        return response.status(400).json({
          error: "As senhas não coincidem",
          code: "PASSWORD_MISMATCH",
        });
      }

      if (novaSenha.length < 6) {
        return response.status(400).json({
          error: "A senha deve ter pelo menos 6 caracteres",
          code: "PASSWORD_TOO_SHORT",
        });
      }

      const usuario = await connection("usuarios")
        .where("reset_token", token)
        .where("reset_token_expira", ">", new Date())
        .select("id", "name", "email")
        .first();

      if (!usuario) {
        return response.status(400).json({
          error: "Token inválido ou expirado",
          code: "INVALID_TOKEN",
        });
      }

      // Gera hash da nova senha
      const senhaHash = hashSenha(novaSenha);

      // Atualiza senha e limpa tokens de redefinição
      await connection("usuarios").where("id", usuario.id).update({
        senha: senhaHash,
        reset_token: null,
        reset_token_expira: null,
      });

      return response.json({
        message: "Senha redefinida com sucesso. Faça login com sua nova senha.",
      });
    } catch (error) {
      console.error("❌ Erro ao redefinir senha:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * ALTERAR SENHA (usuário logado)
   * PUT /auth/alterar-senha
   */
  async alterarSenha(request, response) {
    const { senhaAtual, novaSenha, confirmarSenha } = request.body;
    const { id } = request.usuario; // Vem do authMiddleware

    try {
      // Validações
      if (novaSenha !== confirmarSenha) {
        return response.status(400).json({
          error: "As senhas não coincidem",
          code: "PASSWORD_MISMATCH",
        });
      }

      if (novaSenha.length < 6) {
        return response.status(400).json({
          error: "A senha deve ter pelo menos 6 caracteres",
          code: "PASSWORD_TOO_SHORT",
        });
      }

      const usuario = await connection("usuarios")
        .where("id", id)
        .select("id", "senha")
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      // Verifica senha atual (se já tiver uma)
      if (usuario.senha) {
        const senhaValida = verificarSenha(senhaAtual, usuario.senha);
        if (!senhaValida) {
          return response.status(401).json({
            error: "Senha atual incorreta",
            code: "INVALID_CURRENT_PASSWORD",
          });
        }
      }

      // Gera hash da nova senha
      const senhaHash = hashSenha(novaSenha);

      // Atualiza a senha
      await connection("usuarios").where("id", id).update({ senha: senhaHash });

      return response.json({
        message: "Senha alterada com sucesso",
      });
    } catch (error) {
      console.error("❌ Erro ao alterar senha:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * VERIFICAR TOKEN - Valida se o token ainda é válido
   * GET /auth/verificar
   */
  async verificarToken(request, response) {
    // Se chegou aqui, o authMiddleware já validou o token
    return response.json({
      valid: true,
      usuario: request.usuario,
    });
  },

  /**
   * RECUPERAR ID (manter compatibilidade legado)
   * POST /auth/recuperar-id
   */
  async recuperarId(request, response) {
    const { email, data_nascimento } = request.body;

    try {
      const usuario = await connection("usuarios")
        .where({
          email: email.toLowerCase(),
          birthdate: data_nascimento,
        })
        .select("id")
        .first();

      if (!usuario) {
        return response.status(404).json({
          error: "Usuário não encontrado",
          code: "USER_NOT_FOUND",
        });
      }

      return response.json({ id: usuario.id });
    } catch (error) {
      console.error("❌ Erro ao recuperar ID:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },

  /**
   * SESSIONS - Login legado (compatibilidade com frontend antigo)
   * POST /sessions
   * Recebe { id } e retorna dados do usuário + token JWT
   */
  async sessions(request, response) {
    const { id } = request.body;

    try {
      const usuario = await connection("usuarios")
        .where("id", id)
        .select("id", "name", "email", "type", "empresa_id", "setor_id")
        .first();

      if (!usuario) {
        return response.status(400).json({
          error: "Nenhum CADASTRO encontrado com este ID",
          code: "USER_NOT_FOUND",
        });
      }

      // Gera o token JWT
      const token = gerarToken({
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        tipo: usuario.type,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      });

      // Retorna no formato esperado pelo frontend legado
      return response.json({
        token,
        name: usuario.name,
        type: usuario.type,
        setor_id: usuario.setor_id,
      });
    } catch (error) {
      console.error("❌ Erro no sessions:", error);
      return response.status(500).json({
        error: "Erro interno no servidor",
        code: "INTERNAL_ERROR",
      });
    }
  },
};
