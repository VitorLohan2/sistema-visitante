/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTROLLER: Control iD - Integração com Equipamentos de Controle de Acesso
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este controller gerencia todas as operações relacionadas aos equipamentos
 * Control iD através do microserviço de integração.
 *
 * Permissões RBAC:
 * - controlid_visualizar: Visualizar equipamentos
 * - controlid_status: Ver status em tempo real
 * - controlid_cadastrar: Cadastrar equipamentos
 * - controlid_editar: Editar equipamentos
 * - controlid_excluir: Excluir equipamentos
 * - controlid_abrir_porta: Abrir portas/relés
 * - controlid_liberar_catraca: Liberar catracas
 * - controlid_usuarios_visualizar: Ver usuários nos equipamentos
 * - controlid_usuarios_gerenciar: Gerenciar usuários
 * - controlid_credenciais_visualizar: Ver credenciais
 * - controlid_credenciais_gerenciar: Gerenciar credenciais
 * - controlid_logs_visualizar: Ver logs de acesso
 * - controlid_gerenciar: Acesso total
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const controlIdService = require("../services/controlIdService");

module.exports = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPOSITIVOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todos os dispositivos cadastrados
   * GET /controlid/devices
   * Permissão: controlid_visualizar
   */
  async listarDispositivos(request, response) {
    try {
      const dispositivos = await controlIdService.listarDispositivos();
      return response.json(dispositivos);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar dispositivos:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar dispositivos",
      });
    }
  },

  /**
   * Busca um dispositivo pelo ID
   * GET /controlid/devices/:id
   * Permissão: controlid_visualizar
   */
  async buscarDispositivo(request, response) {
    try {
      const { id } = request.params;
      const dispositivo = await controlIdService.buscarDispositivo(id);
      return response.json(dispositivo);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar dispositivo:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar dispositivo",
      });
    }
  },

  /**
   * Cadastra um novo dispositivo
   * POST /controlid/devices
   * Permissão: controlid_cadastrar
   */
  async cadastrarDispositivo(request, response) {
    try {
      const dados = request.body;
      const dispositivo = await controlIdService.cadastrarDispositivo(dados);

      console.log(
        `[ControlID] Dispositivo cadastrado por usuário ${request.usuario?.id}: ${dados.name} (${dados.ip})`,
      );

      return response.status(201).json(dispositivo);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao cadastrar dispositivo:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao cadastrar dispositivo",
      });
    }
  },

  /**
   * Atualiza um dispositivo
   * PUT /controlid/devices/:id
   * Permissão: controlid_editar
   */
  async atualizarDispositivo(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const dispositivo = await controlIdService.atualizarDispositivo(
        id,
        dados,
      );

      console.log(
        `[ControlID] Dispositivo ${id} atualizado por usuário ${request.usuario?.id}`,
      );

      return response.json(dispositivo);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao atualizar dispositivo:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao atualizar dispositivo",
      });
    }
  },

  /**
   * Remove um dispositivo
   * DELETE /controlid/devices/:id
   * Permissão: controlid_excluir
   */
  async removerDispositivo(request, response) {
    try {
      const { id } = request.params;
      await controlIdService.removerDispositivo(id);

      console.log(
        `[ControlID] Dispositivo ${id} removido por usuário ${request.usuario?.id}`,
      );

      return response.status(204).send();
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao remover dispositivo:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao remover dispositivo",
      });
    }
  },

  /**
   * Verifica status de um dispositivo
   * POST /controlid/devices/:id/check-status
   * Permissão: controlid_status
   */
  async verificarStatus(request, response) {
    try {
      const { id } = request.params;
      const status = await controlIdService.verificarStatus(id);
      return response.json(status);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao verificar status:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao verificar status do dispositivo",
      });
    }
  },

  /**
   * Busca informações do sistema do dispositivo
   * GET /controlid/devices/:id/system-info
   * Permissão: controlid_visualizar
   */
  async buscarInfoSistema(request, response) {
    try {
      const { id } = request.params;
      const info = await controlIdService.buscarInfoSistema(id);
      return response.json(info);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar info sistema:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar informações do sistema",
      });
    }
  },

  /**
   * Lista modelos suportados
   * GET /controlid/devices/models
   * Permissão: controlid_visualizar
   */
  async listarModelos(request, response) {
    try {
      const modelos = await controlIdService.listarModelos();
      return response.json(modelos);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar modelos:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar modelos",
      });
    }
  },

  /**
   * Resumo de status de todos dispositivos
   * GET /controlid/devices/status-summary
   * Permissão: controlid_status
   */
  async resumoStatus(request, response) {
    try {
      const resumo = await controlIdService.resumoStatus();
      return response.json(resumo);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar resumo status:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar resumo de status",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USUÁRIOS NO DISPOSITIVO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista usuários de um dispositivo
   * GET /controlid/devices/:id/users
   * Permissão: controlid_usuarios_visualizar
   */
  async listarUsuarios(request, response) {
    try {
      const { id } = request.params;
      const filtros = request.query;
      const usuarios = await controlIdService.listarUsuarios(id, filtros);
      return response.json(usuarios);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar usuários:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar usuários",
      });
    }
  },

  /**
   * Busca um usuário pelo ID
   * GET /controlid/devices/:id/users/:userId
   * Permissão: controlid_usuarios_visualizar
   */
  async buscarUsuario(request, response) {
    try {
      const { id, userId } = request.params;
      const usuario = await controlIdService.buscarUsuario(id, userId);
      return response.json(usuario);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar usuário:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar usuário",
      });
    }
  },

  /**
   * Cria um usuário no dispositivo
   * POST /controlid/devices/:id/users
   * Permissão: controlid_usuarios_gerenciar
   */
  async criarUsuario(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const usuario = await controlIdService.criarUsuario(id, dados);

      console.log(
        `[ControlID] Usuário criado no dispositivo ${id} por ${request.usuario?.id}: ${dados.name}`,
      );

      return response.status(201).json(usuario);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao criar usuário:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao criar usuário",
      });
    }
  },

  /**
   * Atualiza um usuário no dispositivo
   * PUT /controlid/devices/:id/users/:userId
   * Permissão: controlid_usuarios_gerenciar
   */
  async atualizarUsuario(request, response) {
    try {
      const { id, userId } = request.params;
      const dados = request.body;
      const usuario = await controlIdService.atualizarUsuario(
        id,
        userId,
        dados,
      );

      console.log(
        `[ControlID] Usuário ${userId} atualizado no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.json(usuario);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao atualizar usuário:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao atualizar usuário",
      });
    }
  },

  /**
   * Remove um usuário do dispositivo
   * DELETE /controlid/devices/:id/users/:userId
   * Permissão: controlid_usuarios_gerenciar
   */
  async removerUsuario(request, response) {
    try {
      const { id, userId } = request.params;
      await controlIdService.removerUsuario(id, userId);

      console.log(
        `[ControlID] Usuário ${userId} removido do dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(204).send();
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao remover usuário:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao remover usuário",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENCIAIS (CARTÕES, TAGS UHF, QR CODES)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista cartões de um dispositivo
   * GET /controlid/devices/:id/cards
   * Permissão: controlid_credenciais_visualizar
   */
  async listarCartoes(request, response) {
    try {
      const { id } = request.params;
      const cartoes = await controlIdService.listarCartoes(id);
      return response.json(cartoes);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar cartões:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar cartões",
      });
    }
  },

  /**
   * Cria um cartão
   * POST /controlid/devices/:id/cards
   * Permissão: controlid_credenciais_gerenciar
   */
  async criarCartao(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const cartao = await controlIdService.criarCartao(id, dados);

      console.log(
        `[ControlID] Cartão criado no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(201).json(cartao);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao criar cartão:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao criar cartão",
      });
    }
  },

  /**
   * Remove um cartão
   * DELETE /controlid/devices/:id/cards/:cardId
   * Permissão: controlid_credenciais_gerenciar
   */
  async removerCartao(request, response) {
    try {
      const { id, cardId } = request.params;
      await controlIdService.removerCartao(id, cardId);

      console.log(
        `[ControlID] Cartão ${cardId} removido do dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(204).send();
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao remover cartão:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao remover cartão",
      });
    }
  },

  /**
   * Lista tags UHF de um dispositivo
   * GET /controlid/devices/:id/uhf-tags
   * Permissão: controlid_credenciais_visualizar
   */
  async listarTagsUHF(request, response) {
    try {
      const { id } = request.params;
      const tags = await controlIdService.listarTagsUHF(id);
      return response.json(tags);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar tags UHF:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar tags UHF",
      });
    }
  },

  /**
   * Cria uma tag UHF
   * POST /controlid/devices/:id/uhf-tags
   * Permissão: controlid_credenciais_gerenciar
   */
  async criarTagUHF(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const tag = await controlIdService.criarTagUHF(id, dados);

      console.log(
        `[ControlID] Tag UHF criada no dispositivo ${id} por ${request.usuario?.id}: ${dados.value}`,
      );

      return response.status(201).json(tag);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao criar tag UHF:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao criar tag UHF",
      });
    }
  },

  /**
   * Remove uma tag UHF
   * DELETE /controlid/devices/:id/uhf-tags/:tagId
   * Permissão: controlid_credenciais_gerenciar
   */
  async removerTagUHF(request, response) {
    try {
      const { id, tagId } = request.params;
      await controlIdService.removerTagUHF(id, tagId);

      console.log(
        `[ControlID] Tag UHF ${tagId} removida do dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(204).send();
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao remover tag UHF:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao remover tag UHF",
      });
    }
  },

  /**
   * Lista QR Codes de um dispositivo
   * GET /controlid/devices/:id/qr-codes
   * Permissão: controlid_credenciais_visualizar
   */
  async listarQRCodes(request, response) {
    try {
      const { id } = request.params;
      const qrCodes = await controlIdService.listarQRCodes(id);
      return response.json(qrCodes);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar QR Codes:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar QR Codes",
      });
    }
  },

  /**
   * Cria um QR Code
   * POST /controlid/devices/:id/qr-codes
   * Permissão: controlid_credenciais_gerenciar
   */
  async criarQRCode(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const qrCode = await controlIdService.criarQRCode(id, dados);

      console.log(
        `[ControlID] QR Code criado no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(201).json(qrCode);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao criar QR Code:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao criar QR Code",
      });
    }
  },

  /**
   * Remove um QR Code
   * DELETE /controlid/devices/:id/qr-codes/:qrId
   * Permissão: controlid_credenciais_gerenciar
   */
  async removerQRCode(request, response) {
    try {
      const { id, qrId } = request.params;
      await controlIdService.removerQRCode(id, qrId);

      console.log(
        `[ControlID] QR Code ${qrId} removido do dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.status(204).send();
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao remover QR Code:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao remover QR Code",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AÇÕES DE CONTROLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Abre porta/relé
   * POST /controlid/devices/:id/actions/open-door
   * Permissão: controlid_abrir_porta
   */
  async abrirPorta(request, response) {
    try {
      const { id } = request.params;
      const { door_id = 1 } = request.body;
      const resultado = await controlIdService.abrirPorta(id, door_id);

      console.log(
        `[ControlID] Porta ${door_id} aberta no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.json(resultado);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao abrir porta:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao abrir porta",
      });
    }
  },

  /**
   * Abre via SecBox
   * POST /controlid/devices/:id/actions/open-sec-box
   * Permissão: controlid_abrir_porta
   */
  async abrirSecBox(request, response) {
    try {
      const { id } = request.params;
      const { secbox_id, action = "open" } = request.body;
      const resultado = await controlIdService.abrirSecBox(
        id,
        secbox_id,
        action,
      );

      console.log(
        `[ControlID] SecBox ${secbox_id} acionada no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.json(resultado);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao abrir SecBox:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao abrir SecBox",
      });
    }
  },

  /**
   * Libera catraca
   * POST /controlid/devices/:id/actions/release-turnstile
   * Permissão: controlid_liberar_catraca
   */
  async liberarCatraca(request, response) {
    try {
      const { id } = request.params;
      const { direction = "clockwise" } = request.body;
      const resultado = await controlIdService.liberarCatraca(id, direction);

      console.log(
        `[ControlID] Catraca liberada (${direction}) no dispositivo ${id} por ${request.usuario?.id}`,
      );

      return response.json(resultado);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao liberar catraca:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao liberar catraca",
      });
    }
  },

  /**
   * Busca estado das portas
   * GET /controlid/devices/:id/actions/doors-state
   * Permissão: controlid_status
   */
  async estadoPortas(request, response) {
    try {
      const { id } = request.params;
      const estado = await controlIdService.estadoPortas(id);
      return response.json(estado);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar estado portas:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar estado das portas",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca logs de acesso de um dispositivo
   * GET /controlid/devices/:id/access-logs
   * Permissão: controlid_logs_visualizar
   */
  async buscarLogsAcesso(request, response) {
    try {
      const { id } = request.params;
      const filtros = request.query;
      const logs = await controlIdService.buscarLogsAcesso(id, filtros);
      return response.json(logs);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar logs acesso:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar logs de acesso",
      });
    }
  },

  /**
   * Busca logs de alarme de um dispositivo
   * GET /controlid/devices/:id/alarm-logs
   * Permissão: controlid_logs_visualizar
   */
  async buscarLogsAlarme(request, response) {
    try {
      const { id } = request.params;
      const filtros = request.query;
      const logs = await controlIdService.buscarLogsAlarme(id, filtros);
      return response.json(logs);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar logs alarme:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar logs de alarme",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRUPOS E REGRAS DE ACESSO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista grupos de um dispositivo
   * GET /controlid/devices/:id/groups
   * Permissão: controlid_usuarios_visualizar
   */
  async listarGrupos(request, response) {
    try {
      const { id } = request.params;
      const grupos = await controlIdService.listarGrupos(id);
      return response.json(grupos);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar grupos:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar grupos",
      });
    }
  },

  /**
   * Cria um grupo
   * POST /controlid/devices/:id/groups
   * Permissão: controlid_usuarios_gerenciar
   */
  async criarGrupo(request, response) {
    try {
      const { id } = request.params;
      const dados = request.body;
      const grupo = await controlIdService.criarGrupo(id, dados);

      console.log(
        `[ControlID] Grupo criado no dispositivo ${id} por ${request.usuario?.id}: ${dados.name}`,
      );

      return response.status(201).json(grupo);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao criar grupo:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao criar grupo",
      });
    }
  },

  /**
   * Lista regras de acesso
   * GET /controlid/devices/:id/access-rules
   * Permissão: controlid_usuarios_visualizar
   */
  async listarRegrasAcesso(request, response) {
    try {
      const { id } = request.params;
      const regras = await controlIdService.listarRegrasAcesso(id);
      return response.json(regras);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao listar regras:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao listar regras de acesso",
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifica se o microserviço está online
   * GET /controlid/health
   * Permissão: controlid_visualizar
   */
  async healthCheck(request, response) {
    try {
      const status = await controlIdService.healthCheck();
      return response.json(status);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro no health check:",
        error.message,
      );
      return response.status(500).json({
        online: false,
        error: error.message,
      });
    }
  },

  /**
   * Busca logs de operação do microserviço
   * GET /controlid/logs
   * Permissão: controlid_gerenciar
   */
  async buscarLogsOperacao(request, response) {
    try {
      const filtros = request.query;
      const logs = await controlIdService.buscarLogsOperacao(filtros);
      return response.json(logs);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar logs operação:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar logs de operação",
      });
    }
  },

  /**
   * Busca estatísticas de operações
   * GET /controlid/logs/stats
   * Permissão: controlid_gerenciar
   */
  async estatisticasOperacoes(request, response) {
    try {
      const stats = await controlIdService.estatisticasOperacoes();
      return response.json(stats);
    } catch (error) {
      console.error(
        "[ControlID Controller] Erro ao buscar estatísticas:",
        error.message,
      );
      return response.status(500).json({
        error: error.message || "Erro ao buscar estatísticas",
      });
    }
  },
};
