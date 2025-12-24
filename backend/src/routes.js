const express = require("express");
const { celebrate, Segments, Joi } = require("celebrate");

const OngController = require("./controllers/OngController");
const IncidentController = require("./controllers/IncidentController");
const ProfileController = require("./controllers/ProfileController");
const SessionController = require("./controllers/SessionController");
const VisitorController = require("./controllers/VisitorController");
const TicketController = require("./controllers/TicketController");
const CodigoController = require("./controllers/CodigoController");
const FuncionarioController = require("./controllers/FuncionarioController");
const RegistroFuncionarioController = require("./controllers/RegistroFuncionarioController");

const EmpresasController = require("./controllers/EmpresasController");
const SetoresController = require("./controllers/SetoresController");
const EmpresasVisitantesController = require("./controllers/EmpresasVisitantesController");
const SetoresVisitantesController = require("./controllers/SetoresVisitantesController");
const AgendamentoController = require("./controllers/AgendamentoController");

const ResponsavelController = require("./controllers/ResponsavelController");

const ComunicadoController = require("./controllers/ComunicadoController");

const multer = require("multer");
const multerConfig = require("./config/multer");
const uploadAgendamento = require("./config/multerAgendamentos");
const upload = multer(multerConfig);

const routes = express.Router();

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "Erro no upload",
      details:
        err.code === "LIMIT_FILE_SIZE"
          ? "Tamanho máximo por imagem: 3MB"
          : "Máximo de 3 imagens permitidas",
    });
  }
  next(err);
};

routes.post("/sessions", SessionController.create);

routes.post(
  "/recuperar-id",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      data_nascimento: Joi.string()
        .required()
        .regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  SessionController.recuperarId
);

routes.get("/ongs", OngController.index);
routes.post(
  "/ongs",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().required(),
      birthdate: Joi.string().required(), // Adicionando data de nascimento
      cpf: Joi.string()
        .required()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/), // Adicionando CPF (11 dígitos)
      empresa_id: Joi.number().integer().required(),
      setor_id: Joi.number().integer().required(),
      email: Joi.string().required().email(),
      whatsapp: Joi.string().required().min(10).max(11),
      city: Joi.string().required(),
      uf: Joi.string().required().length(2),
      type: Joi.string().valid("ADM", "USER").default("USER"), // ✅ Adicione type
      codigo_acesso: Joi.when("type", {
        // ✅ Validação condicional
        is: "USER",
        then: Joi.string()
          .required()
          .pattern(/^[A-Z0-9]{3,20}$/),
        otherwise: Joi.string().optional(),
      }),
    }),
  }),
  OngController.create
);

// Buscar uma ONG por ID
routes.get(
  "/ongs/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  OngController.show
);

// Atualizar usuário (PUT)
routes.put("/ongs/:id", OngController.update);

// Deletar usuário (DELETE)
routes.delete("/ongs/:id", OngController.delete);

routes.get(
  "/profile",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  ProfileController.index
);

// Busca global de visitantes (por nome ou CPF)
routes.get(
  "/search",
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      query: Joi.string().required(),
    }),
  }),
  IncidentController.search
);

routes.get(
  "/incidents",
  celebrate({
    [Segments.QUERY]: Joi.object().keys({
      page: Joi.number(),
    }),
  }),
  IncidentController.index
);

routes.post(
  "/incidents",
  upload.array("fotos", 3),
  handleUploadErrors,
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      nascimento: Joi.string().required(),
      cpf: Joi.string().required(),
      empresa: Joi.string().required(),
      setor: Joi.string().required(),
      telefone: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      observacao: Joi.string().allow("", null),
    }),
  }),
  IncidentController.create
);

routes.delete(
  "/incidents/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(), // Valida que o ID é um número
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(), // Exige o token de autorização (ong_id)
    }).unknown(), // Permite outros headers além do 'authorization'
  }),
  IncidentController.delete
);

routes.get(
  "/visitors",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  VisitorController.index
);

routes.post(
  "/visitors",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      name: Joi.string().required(),
      cpf: Joi.string().required(),
      company: Joi.string().required(),
      sector: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      responsavel: Joi.string().required(),
      observacao: Joi.string().allow("", null).optional(),
    }),
  }),
  VisitorController.create
);

// Encerrar visita
routes.put(
  "/visitors/:id/exit",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  VisitorController.endVisit
);

// Buscar histórico
routes.get(
  "/history",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  VisitorController.history
);

// Buscar responsáveis (Modal de Liberar Visita)
routes.get("/responsaveis", ResponsavelController.index);

routes.get("/incidents/:id", IncidentController.show);

routes.put(
  "/incidents/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(), // Certifique-se de que o ID seja um número
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required(),
      nascimento: Joi.string().required(),
      cpf: Joi.string().required(),
      empresa: Joi.string().required(),
      setor: Joi.string().required(),
      telefone: Joi.string().required(),
      placa_veiculo: Joi.string().allow("", null).optional(),
      cor_veiculo: Joi.string().allow("", null).optional(),
      observacao: Joi.string().allow("", null),
      bloqueado: Joi.boolean().optional(),
      avatar_imagem: Joi.string().uri().allow(null, ""),
    }),
  }),
  IncidentController.update
);

// Rota dedicada apenas para bloqueio (similar à rota de delete)
routes.put(
  "/incidents/:id/block",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(), // Mantemos a autorização
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      bloqueado: Joi.boolean().required(), // Campo obrigatório
    }),
  }),
  IncidentController.blockIncident // Novo método no controller
);

// Criar novo ticket
routes.post(
  "/tickets",
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      funcionario: Joi.string().required(),
      motivo: Joi.string().required(),
      descricao: Joi.string().required(),
      setorResponsavel: Joi.string().required(),
      nomeUsuario: Joi.string().required(),
      setorUsuario: Joi.string().required(),
    }),
  }),
  TicketController.create
);

// Listar tickets (usuário vê os próprios, admin vê todos)
routes.get(
  "/tickets",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  TicketController.index
);

// Atualizar status do ticket
routes.put(
  "/tickets/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      status: Joi.string()
        .valid("Aberto", "Em andamento", "Resolvido")
        .required(),
    }),
  }),
  TicketController.update
);

// Contar tickets não visualizados (apenas para segurança)
routes.get(
  "/tickets/unseen",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  TicketController.countUnseen
);

// Ver detalhes de um ticket
routes.get(
  "/tickets/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  TicketController.show
);

// Marcar tickets como visualizados (apenas para segurança)
routes.put(
  "/tickets/mark-seen",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  TicketController.markAllSeen
);

// Rota pública para validação de código
routes.get(
  "/codigos/validar/:codigo",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      codigo: Joi.string()
        .required()
        .pattern(/^[A-Z0-9]{3,20}$/), // Ex: CODIGO2024
    }),
  }),
  CodigoController.validarCodigo
);

// Rotas protegidas para ADMs (a verificação será feita no controller)
routes.post(
  "/codigos",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      codigo: Joi.string()
        .required()
        .pattern(/^[A-Z0-9]{3,20}$/),
      limite_usos: Joi.number().integer().min(1).max(1000).required(),
    }),
  }),
  CodigoController.gerarCodigo // A verificação de ADM será feita aqui
);

routes.get(
  "/codigos",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  CodigoController.listarCodigos // A verificação de ADM será feita aqui
);

// ROTA DE DESATIVAR (já existente, apenas comentando para clareza)
routes.put(
  "/codigos/:id/desativar",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.desativarCodigo
);

routes.put(
  "/codigos/:id/ativar",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.ativarCodigo
);

routes.delete(
  "/codigos/:id/delete",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
  }),
  CodigoController.deleteCodigo
);

// Rotas para Funcionários                              ### --------- ###
routes.get(
  "/funcionarios",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.QUERY]: Joi.object().keys({
      mostrarInativos: Joi.boolean().default(false),
    }),
  }),
  FuncionarioController.index
);

routes.get(
  "/funcionarios/:cracha",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
  }),
  FuncionarioController.buscarPorCracha
);

routes.post(
  "/funcionarios",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20),
      nome: Joi.string().required().min(3).max(255),
      setor: Joi.string().required().max(100),
      funcao: Joi.string().required().max(100),
      data_admissao: Joi.date().iso().required(),
    }),
  }),
  FuncionarioController.criar
);

routes.put(
  "/funcionarios/:cracha",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required(),
    }),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().min(3).max(255),
      setor: Joi.string().max(100),
      funcao: Joi.string().max(100),
      data_admissao: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      ),
      data_demissao: Joi.alternatives().try(
        Joi.date().iso(),
        Joi.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        Joi.allow(null)
      ),
      ativo: Joi.boolean(),
    }),
  }),
  FuncionarioController.atualizar
);

// Rotas para Registros de Ponto
routes.post(
  "/registros-ponto",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20),
    }),
  }),
  RegistroFuncionarioController.registrarPonto
);

routes.get(
  "/registros-ponto/historico",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.QUERY]: Joi.object().keys({
      cracha: Joi.string().required(),
      dataInicio: Joi.date().iso(),
      dataFim: Joi.date().iso(),
    }),
  }),
  RegistroFuncionarioController.historico
);

routes.get("/cpf-existe/:cpf", IncidentController.checkCpf);

routes.get("/empresas", EmpresasController.index); //Empresas

routes.get("/setores", SetoresController.index); //Setores

routes.get("/empresas-visitantes", EmpresasVisitantesController.index); //Empresas Visitantes
routes.post("/empresas-visitantes", EmpresasVisitantesController.create);
routes.get("/empresas-visitantes/:id", EmpresasVisitantesController.show);
routes.put("/empresas-visitantes/:id", EmpresasVisitantesController.update);
routes.delete("/empresas-visitantes/:id", EmpresasVisitantesController.delete);

routes.get("/setores-visitantes", SetoresVisitantesController.index); //Setores Visitantes

// 🔹 Nova rota para abrir o modal do crachá
routes.get("/incidents/:id/badge", IncidentController.showBadge);

routes.post(
  "/agendamentos",
  uploadAgendamento.single("foto_colaborador"),
  handleUploadErrors,
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      nome: Joi.string().required().max(100),
      cpf: Joi.string()
        .required()
        .regex(/^\d{11}$/),
      setor_id: Joi.number().integer().required(),
      setor: Joi.string().required().max(100),
      horario_agendado: Joi.date().iso().required(),
      observacao: Joi.string().allow("", null).max(500),
      criado_por: Joi.string().required().max(100),
      foto_colaborador: Joi.any().optional(),
    }),
  }),
  AgendamentoController.create
);

// ✅ Rota para listar agendamentos (se quiser)
routes.get("/agendamentos", AgendamentoController.index);

// ✅ Rota para deletar agendamento
routes.delete(
  "/agendamentos/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  AgendamentoController.delete
);

// ✅ Rota para confirmar agendamento (se necessário)
routes.put(
  "/agendamentos/:id/confirmar",
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().integer().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  AgendamentoController.confirmar
);

routes.put("/agendamentos/:id/presenca", AgendamentoController.presenca);

routes.get(
  "/agendamentos/relatorio/presencas",
  AgendamentoController.relatorioPresencas
);

// ─────────────────────────────────────────────────────────────
// ROTAS DE COMUNICADOS (CRUD COMPLETO)
// ─────────────────────────────────────────────────────────────

/**
 * LISTAR TODOS OS COMUNICADOS
 */
routes.get(
  "/comunicados",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  ComunicadoController.list
);

/**
 * CRIAR NOVO COMUNICADO
 */
routes.post(
  "/comunicados",
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object({
      titulo: Joi.string().required().max(100),
      mensagem: Joi.string().required().max(500),
      prioridade: Joi.string().valid("normal", "urgente").default("normal"),
      ativo: Joi.boolean().default(false),
    }),
  }),
  ComunicadoController.create
);

/**
 * ATUALIZAR / ATIVAR / DESATIVAR COMUNICADO
 */
routes.put(
  "/comunicados/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object({
      titulo: Joi.string().max(100),
      mensagem: Joi.string().max(500),
      prioridade: Joi.string().valid("normal", "urgente"),
      ativo: Joi.boolean(),
    }).min(1), // garante que pelo menos um campo seja enviado
  }),
  ComunicadoController.update
);

/**
 * EXCLUIR COMUNICADO
 */
routes.delete(
  "/comunicados/:id",
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  }),
  ComunicadoController.delete
);

module.exports = routes;
