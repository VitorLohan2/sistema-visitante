/**
 * Constantes de rotas do sistema
 * Centraliza todos os paths para evitar strings hardcoded
 */

export const ROTAS = {
  // Públicas
  LOGIN: "/",
  REGISTRO: "/register",
  RECUPERAR_SENHA: "/recuperar-id",
  HELPDESK: "/helpdesk",

  // Dashboard
  DASHBOARD: "/dashboard",
  PROFILE: "/listagem-visitante",

  // Visitantes
  VISITANTES: {
    LISTA: "/visitantes",
    NOVO: "/cadastro-visitantes/novo",
    EDITAR: (id) => `/cadastro-visitantes/edit/${id}`,
    VISUALIZAR: (id) => `/cadastro-visitantes/view/${id}`,
    HISTORICO: "/historico-visitante",
  },

  // Funcionários
  FUNCIONARIOS: {
    LISTA: "/funcionarios",
    CADASTRAR: "/funcionarios/cadastrar",
    EDITAR: (cracha) => `/funcionarios/editar/${cracha}`,
    HISTORICO: (cracha) => `/funcionarios/historico/${cracha}`,
  },

  // Agendamentos
  AGENDAMENTOS: {
    LISTA: "/agendamentos",
    NOVO: "/agendamentos/novo",
    EDITAR: (id) => `/agendamentos/editar/${id}`,
  },

  // Tickets
  TICKETS: {
    LISTA: "/tickets",
    DASHBOARD: "/ticket-dashboard",
  },

  // Configurações
  PONTO: "/ponto",
  CHAVE_CADASTRO: "/chave-cadastro",
  EMPRESA_VISITANTES: "/cadastrar-empresa-visitante",
};

export default ROTAS;
