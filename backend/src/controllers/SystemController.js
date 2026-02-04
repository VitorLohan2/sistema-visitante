/**
 * SystemController
 * Fornece informações do sistema como versão, último commit, etc.
 */

const connection = require("../database/connection");

// Configuração do repositório GitHub
const GITHUB_OWNER = "VitorLohan2"; // Ajuste para seu usuário/organização
const GITHUB_REPO = "sistema-visitante"; // Ajuste para o nome do seu repositório

// Versão da API do Backend - ATUALIZE A CADA DEPLOY!
// Esta versão é usada para detectar incompatibilidades frontend/backend
const API_VERSION = "2.2.7";
const API_BUILD_TIME = new Date().toISOString();

module.exports = {
  /**
   * GET /system/health
   * Health check rápido com versão da API
   * Usado pelo frontend para verificar compatibilidade
   */
  async healthCheck(request, response) {
    return response.json({
      status: "healthy",
      apiVersion: API_VERSION,
      buildTime: API_BUILD_TIME,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },

  /**
   * GET /system/info
   * Retorna informações do sistema (versão, último commit)
   */
  async getInfo(request, response) {
    try {
      let version = "2.5.0";
      let lastCommitDate = null;
      let lastCommitMessage = null;

      // Tenta buscar a última tag do GitHub (apenas tags do backend principal)
      try {
        const tagsResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/tags?per_page=100`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "sistema-visitante-backend",
            },
          },
        );

        if (tagsResponse.ok) {
          const tags = await tagsResponse.json();
          if (tags && tags.length > 0) {
            // Filtra apenas tags do backend principal (formato: v*.*.*)
            // Ignora tags de microserviços como: controlid-v*, mobile-v*, etc.
            const backendTags = tags.filter((tag) =>
              /^v\d+\.\d+\.\d+$/.test(tag.name),
            );

            if (backendTags.length > 0) {
              // Remove o 'v' do início
              version = backendTags[0].name.replace(/^v/, "");
            }
          }
        }
      } catch (githubError) {
        console.warn(
          "⚠️ Não foi possível buscar tags do GitHub:",
          githubError.message,
        );
      }

      // Tenta buscar o último commit
      try {
        const commitsResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=1`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "sistema-visitante-backend",
            },
          },
        );

        if (commitsResponse.ok) {
          const commits = await commitsResponse.json();
          if (commits && commits.length > 0) {
            const commit = commits[0];
            lastCommitDate = commit.commit.author.date;
            lastCommitMessage = commit.commit.message.split("\n")[0]; // Primeira linha
          }
        }
      } catch (githubError) {
        console.warn(
          "⚠️ Não foi possível buscar commits do GitHub:",
          githubError.message,
        );
      }

      return response.json({
        version,
        lastCommitDate,
        lastCommitMessage,
        environment: process.env.NODE_ENV || "development",
      });
    } catch (error) {
      console.error("❌ Erro ao buscar informações do sistema:", error);
      return response.status(500).json({
        error: "Erro ao buscar informações do sistema",
      });
    }
  },

  /**
   * GET /system/permissions-stats
   * Retorna estatísticas de permissões do usuário logado
   */
  async getPermissionsStats(request, response) {
    try {
      const usuarioId = request.usuario?.id;

      if (!usuarioId) {
        return response.status(401).json({ error: "Usuário não autenticado" });
      }

      // Busca total de permissões existentes no sistema
      const [{ count: totalPermissoes }] =
        await connection("permissoes").count("* as count");

      // Busca permissões do usuário (via papéis)
      const permissoesUsuario = await connection("usuarios_papeis")
        .join(
          "papeis_permissoes",
          "usuarios_papeis.papel_id",
          "papeis_permissoes.papel_id",
        )
        .where("usuarios_papeis.usuario_id", usuarioId)
        .countDistinct("papeis_permissoes.permissao_id as count")
        .first();

      const totalUsuario = parseInt(permissoesUsuario?.count || 0);
      const total = parseInt(totalPermissoes || 1);

      // Calcula porcentagem
      const porcentagem = Math.round((totalUsuario / total) * 100);

      return response.json({
        permissoesUsuario: totalUsuario,
        permissoesTotais: total,
        porcentagem: Math.min(porcentagem, 100), // Garante que não passe de 100%
      });
    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas de permissões:", error);
      return response.status(500).json({
        error: "Erro ao buscar estatísticas de permissões",
      });
    }
  },
};
