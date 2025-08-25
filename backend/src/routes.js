const express = require('express')
const { celebrate, Segments, Joi } = require('celebrate')

const OngController = require('./controllers/OngController')
const IncidentController = require('./controllers/IncidentController')
const ProfileController = require('./controllers/ProfileController')
const SessionController = require('./controllers/SessionController')
const VisitorController = require('./controllers/VisitorController')
const TicketController = require('./controllers/TicketController')
const CodigoController = require('./controllers/CodigoController')
const FuncionarioController = require('./controllers/FuncionarioController')
const RegistroFuncionarioController = require('./controllers/RegistroFuncionarioController')

const EmpresasController = require('./controllers/EmpresasController');
const SetoresController = require('./controllers/SetoresController');
const EmpresasVisitantesController = require('./controllers/EmpresasVisitantesController');
const SetoresVisitantesController = require('./controllers/SetoresVisitantesController');

const multer = require('multer');
const multerConfig = require('./config/multer');
const upload = multer(multerConfig);


const routes = express.Router()

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'Erro no upload', 
      details: err.code === 'LIMIT_FILE_SIZE' 
        ? 'Tamanho máximo por imagem: 3MB' 
        : 'Máximo de 3 imagens permitidas'
    });
  }
  next(err);
};

routes.post('/sessions', SessionController.create)

routes.post('/recuperar-id',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().required().email(),
      data_nascimento: Joi.string().required().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  }),
  SessionController.recuperarId
);

routes.get('/ongs', OngController.index)
routes.post('/ongs', celebrate({
  [Segments.BODY]: Joi.object().keys({
    name: Joi.string().required(),
    birthdate: Joi.string().required(), // Adicionando data de nascimento
    cpf: Joi.string().required().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/), // Adicionando CPF (11 dígitos)
    empresa_id: Joi.number().integer().required(), 
    setor_id: Joi.number().integer().required(),   
    email: Joi.string().required().email(),
    whatsapp: Joi.string().required().min(10).max(11),
    city: Joi.string().required(),
    uf: Joi.string().required().length(2),
    type: Joi.string().valid('ADM', 'USER').default('USER'), // ✅ Adicione type
    codigo_acesso: Joi.when('type', { // ✅ Validação condicional
      is: 'USER',
      then: Joi.string().required().pattern(/^[A-Z0-9]{3,20}$/),
      otherwise: Joi.string().optional()
    })
  })
}), OngController.create)

// Buscar uma ONG por ID
routes.get('/ongs/:id',
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required()
    })
  }),
  OngController.show);


routes.get('/profile', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
}), ProfileController.index)

routes.get('/incidents', celebrate({
  [Segments.QUERY]: Joi.object().keys({
    page: Joi.number(),
  })
}), IncidentController.index)

routes.post(
  '/incidents',
  upload.array('fotos', 3),
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
      observacao: Joi.string().allow('', null)
    })
  }),
  IncidentController.create);

routes.delete('/incidents/:id', celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.number().required(),          // Valida que o ID é um número
  }),
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),   // Exige o token de autorização (ong_id)
  }).unknown(),   // Permite outros headers além do 'authorization'
}), IncidentController.delete)

routes.get('/visitors', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
}), VisitorController.index);

routes.post('/visitors', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.BODY]: Joi.object().keys({
    name: Joi.string().required(),
    cpf: Joi.string().required(),
    company: Joi.string().required(),
    sector: Joi.string().required()
  })
}), VisitorController.create);

// Encerrar visita
routes.put('/visitors/:id/exit',
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown()
  }),
  VisitorController.endVisit
);

// Buscar histórico
routes.get('/history',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown()
  }),
  VisitorController.history
);

routes.get('/incidents/:id', IncidentController.show);

routes.put('/incidents/:id',
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
      observacao: Joi.string().allow('', null),
      bloqueado: Joi.boolean().optional()
    })
  }),
  IncidentController.update
);

// Rota dedicada apenas para bloqueio (similar à rota de delete)
routes.put('/incidents/:id/block',
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required(),
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(), // Mantemos a autorização
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      bloqueado: Joi.boolean().required() // Campo obrigatório
    })
  }),
  IncidentController.blockIncident // Novo método no controller
);

// Criar novo ticket
routes.post('/tickets',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      funcionario: Joi.string().required(),
      motivo: Joi.string().required(),
      descricao: Joi.string().required(),
      setorResponsavel: Joi.string().required(),
      nomeUsuario: Joi.string().required(),
      setorUsuario: Joi.string().required()
    })
  }),
  TicketController.create
);

// Listar tickets (usuário vê os próprios, admin vê todos)
routes.get('/tickets',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required()
    }).unknown()
  }),
  TicketController.index
);

// Atualizar status do ticket
routes.put('/tickets/:id',
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required()
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required()
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      status: Joi.string().valid('Aberto', 'Em andamento', 'Resolvido').required()
    })
  }),
  TicketController.update
);

// Contar tickets não visualizados (apenas para segurança)
routes.get('/tickets/unseen',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required()
    }).unknown()
  }),
  TicketController.countUnseen
);

// Ver detalhes de um ticket
routes.get('/tickets/:id',
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.number().required()
    }),
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required()
    }).unknown()
  }),
  TicketController.show
);

// Marcar tickets como visualizados (apenas para segurança)
routes.put('/tickets/mark-seen',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required()
    }).unknown()
  }),
  TicketController.markAllSeen
);

// Rota pública para validação de código
routes.get('/codigos/validar/:codigo', 
  celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      codigo: Joi.string().required().pattern(/^[A-Z0-9]{3,20}$/) // Ex: CODIGO2024
    })
  }),
  CodigoController.validarCodigo
);

// Rotas protegidas para ADMs (a verificação será feita no controller)
routes.post('/codigos', 
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      codigo: Joi.string().required().pattern(/^[A-Z0-9]{3,20}$/),
      limite_usos: Joi.number().integer().min(1).max(1000).required()
    })
  }),
  CodigoController.gerarCodigo // A verificação de ADM será feita aqui
);

routes.get('/codigos',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown()
  }),
  CodigoController.listarCodigos // A verificação de ADM será feita aqui
);

// ROTA DE DESATIVAR (já existente, apenas comentando para clareza)
routes.put('/codigos/:id/desativar',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required()
    })
  }),
  CodigoController.desativarCodigo
);

routes.put('/codigos/:id/ativar',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required()
    })
  }),
  CodigoController.ativarCodigo
);

routes.delete('/codigos/:id/delete',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      id: Joi.string().required()
    })
  }),
  CodigoController.deleteCodigo
);

// Rotas para Funcionários                              ### --------- ###
routes.get('/funcionarios', 
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.QUERY]: Joi.object().keys({
      mostrarInativos: Joi.boolean().default(false)
    })
  }),
  FuncionarioController.index
);

routes.get('/funcionarios/:cracha',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required()
    })
  }),
  FuncionarioController.buscarPorCracha
);

routes.post('/funcionarios',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20),
      nome: Joi.string().required().min(3).max(255),
      setor: Joi.string().required().max(100),
      funcao: Joi.string().required().max(100),
      data_admissao: Joi.date().iso().required()
    })
  }),
  FuncionarioController.criar
);

routes.put('/funcionarios/:cracha',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.PARAMS]: Joi.object().keys({
      cracha: Joi.string().required() 
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
      ativo: Joi.boolean()
    })
  }),
  FuncionarioController.atualizar
);

// Rotas para Registros de Ponto
routes.post('/registros-ponto',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.BODY]: Joi.object().keys({
      cracha: Joi.string().required().min(3).max(20)
    })
  }),
  RegistroFuncionarioController.registrarPonto
);

routes.get('/registros-ponto/historico',
  celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
    [Segments.QUERY]: Joi.object().keys({
      cracha: Joi.string().required(),
      dataInicio: Joi.date().iso(),
      dataFim: Joi.date().iso()
    })
  }),
  RegistroFuncionarioController.historico
);

routes.get('/cpf-existe/:cpf', IncidentController.checkCpf);

routes.get('/empresas', EmpresasController.index);  //Empresas

routes.get('/setores', SetoresController.index);    //Setores

routes.get('/empresas-visitantes', EmpresasVisitantesController.index);  //Empresas Visitantes
routes.post('/empresas-visitantes', EmpresasVisitantesController.create);


routes.get('/setores-visitantes', SetoresVisitantesController.index);    //Setores Visitantes

// 🔹 Nova rota para abrir o modal do crachá
routes.get('/incidents/:id/badge', IncidentController.showBadge);

module.exports = routes
