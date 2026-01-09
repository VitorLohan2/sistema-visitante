/**
 * Mensagens do sistema
 * Centraliza todas as mensagens para facilitar manutenção e internacionalização
 */

export const MENSAGENS = {
  // Erros de autenticação
  SESSAO_EXPIRADA: "Sessão expirada. Faça login novamente.",
  SEM_PERMISSAO: "Você não tem permissão para realizar esta ação.",
  APENAS_ADMIN: "Somente administradores tem permissão!",
  LOGIN_INVALIDO: "Email ou senha inválidos.",

  // Erros de conexão
  ERRO_CONEXAO: "Erro de conexão. Verifique sua internet.",
  ERRO_SERVIDOR: "Erro no servidor. Tente novamente mais tarde.",

  // Erros de validação
  CAMPOS_OBRIGATORIOS: "Preencha todos os campos obrigatórios.",
  CPF_INVALIDO: "CPF inválido.",
  EMAIL_INVALIDO: "Email inválido.",
  TELEFONE_INVALIDO: "Telefone inválido.",

  // Sucesso
  CADASTRO_SUCESSO: "Cadastro realizado com sucesso!",
  ATUALIZACAO_SUCESSO: "Dados atualizados com sucesso!",
  EXCLUSAO_SUCESSO: "Registro excluído com sucesso!",

  // Funcionários
  FUNCIONARIO: {
    INATIVADO: "Funcionário inativado com sucesso!",
    REATIVADO: "Funcionário reativado com sucesso!",
    CADASTRADO: "Funcionário cadastrado com sucesso!",
    ATUALIZADO: "Funcionário atualizado com sucesso!",
    CONFIRMAR_INATIVAR: "Deseja inativar este funcionário?",
    CONFIRMAR_REATIVAR: "Deseja reativar este funcionário?",
  },

  // Visitantes
  VISITANTE: {
    CADASTRADO: "Visitante cadastrado com sucesso!",
    ATUALIZADO: "Visitante atualizado com sucesso!",
    EXCLUIDO: "Visitante excluído com sucesso!",
    BLOQUEADO: "Visitante bloqueado com sucesso!",
    CPF_EXISTENTE: "Este CPF já está cadastrado.",
    CONFIRMAR_EXCLUIR: "Deseja excluir este visitante?",
  },

  // Agendamentos
  AGENDAMENTO: {
    CRIADO: "Agendamento criado com sucesso!",
    ATUALIZADO: "Agendamento atualizado com sucesso!",
    CANCELADO: "Agendamento cancelado com sucesso!",
    CONFIRMADO: "Agendamento confirmado com sucesso!",
    CONFIRMAR_CANCELAR: "Deseja cancelar este agendamento?",
  },

  // Tickets
  TICKET: {
    CRIADO: "Ticket aberto com sucesso!",
    FECHADO: "Ticket fechado com sucesso!",
    COMENTARIO_ADICIONADO: "Comentário adicionado com sucesso!",
  },

  // Estados vazios
  NENHUM_RESULTADO: "Nenhum resultado encontrado.",
  LISTA_VAZIA: "Nenhum registro cadastrado.",

  // Loading
  CARREGANDO: "Carregando...",
  SALVANDO: "Salvando...",
  EXCLUINDO: "Excluindo...",
};

export default MENSAGENS;
