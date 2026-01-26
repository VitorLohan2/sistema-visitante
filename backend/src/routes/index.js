/**
 * Index de Rotas
 * Centraliza todas as rotas da aplicação
 */

const express = require("express");
const { errors } = require("celebrate");
const { celebrate, Segments, Joi } = require("celebrate");

// Controllers para rotas na raiz
const AuthController = require("../controllers/AuthController");

// Importar rotas
const authRoutes = require("./auth.routes");
const usuariosRoutes = require("./usuarios.routes");
const cadastroVisitantesRoutes = require("./cadastroVisitantes.routes");
const visitantesRoutes = require("./visitantes.routes");
const ticketsRoutes = require("./tickets.routes");
const funcionariosRoutes = require("./funcionarios.routes");
const agendamentosRoutes = require("./agendamentos.routes");
const pontoRoutes = require("./ponto.routes");
const empresasSetoresRoutes = require("./empresasSetores.routes");
const papeisRoutes = require("./papeis.routes");
const permissoesRoutes = require("./permissoes.routes");
const usuariosPapeisRoutes = require("./usuariosPapeis.routes");
const solicitacoesDescargaRoutes = require("./solicitacoesDescarga.routes");
const dashboardRoutes = require("./dashboard.routes");
const veiculosVisitantesRoutes = require("./veiculosVisitantes.routes");
const feedbackRoutes = require("./feedback.routes");
const patchNotesRoutes = require("./patchNotes.routes");

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// ROTAS LEGADAS NA RAIZ (compatibilidade com frontend)
// ═══════════════════════════════════════════════════════════════

// POST /sessions - Login legado por ID (usado pelo frontend)
router.post(
  "/sessions",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  AuthController.sessions,
);

// POST /recuperar-id - Recuperar ID por email e data nascimento
router.post(
  "/recuperar-id",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      data_nascimento: Joi.string()
        .required()
        .regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  AuthController.recuperarId,
);

// ═══════════════════════════════════════════════════════════════
// MONTAR ROTAS
// ═══════════════════════════════════════════════════════════════

// Autenticação
router.use("/auth", authRoutes);

// Usuários (novo nome para ONG)
router.use("/usuarios", usuariosRoutes);

// Cadastro de Visitantes (novo nome para Incidents)
router.use("/cadastro-visitantes", cadastroVisitantesRoutes);

// Visitantes em tempo real (entrada/saída)
router.use("/visitantes", visitantesRoutes);

// Tickets de suporte
router.use("/tickets", ticketsRoutes);

// Funcionários
router.use("/funcionarios", funcionariosRoutes);

// Agendamentos
router.use("/agendamentos", agendamentosRoutes);

// Ponto eletrônico
router.use("/ponto", pontoRoutes);

// Empresas e Setores (monta direto na raiz)
router.use("/", empresasSetoresRoutes);

// Papéis (Roles)
router.use("/papeis", papeisRoutes);

// Permissões
router.use("/permissoes", permissoesRoutes);

// Gerenciamento de Usuários e Papéis
router.use("/usuarios-papeis", usuariosPapeisRoutes);

// Solicitações de Descarga (público + autenticado)
router.use("/solicitacoes-descarga", solicitacoesDescargaRoutes);

// Dashboard (estatísticas)
router.use("/dashboard", dashboardRoutes);

// Veículos, Funções, Cores e Tipos de Veículos de Visitantes (monta direto na raiz)
router.use("/", veiculosVisitantesRoutes);

// Feedback (envio de sugestões por email)
router.use("/feedback", feedbackRoutes);

// Patch Notes (atualizações do sistema)
router.use("/patch-notes", patchNotesRoutes);

// Chat de Suporte (IA + humano)
const chatSuporteRoutes = require("./chatSuporte.routes");
router.use("/chat-suporte", chatSuporteRoutes);

// Ronda de Vigilante (GPS e checkpoints)
const rondaRoutes = require("./ronda.routes");
router.use("/rondas", rondaRoutes);

// ═══════════════════════════════════════════════════════════════
// ROTAS LEGADAS ADICIONAIS (compatibilidade com frontend)
// ═══════════════════════════════════════════════════════════════
const ResponsavelController = require("../controllers/ResponsavelController");
const VisitanteController = require("../controllers/VisitanteController");
const { authMiddleware } = require("../middleware/authMiddleware");

// GET /responsaveis - Lista de responsáveis (usado pelo frontend)
router.get("/responsaveis", ResponsavelController.index);

// GET /history - Histórico de visitas (usado pelo frontend)
router.get(
  "/history",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  VisitanteController.history,
);

// ═══════════════════════════════════════════════════════════════
// ROTA DE HEALTH CHECK
// ═══════════════════════════════════════════════════════════════
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE DE ERROS DO CELEBRATE
// ═══════════════════════════════════════════════════════════════
router.use(errors());

module.exports = router;
