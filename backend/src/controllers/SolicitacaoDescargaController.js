// controllers/SolicitacaoDescargaController.js
const connection = require("../database/connection");
const { getIo } = require("../socket");
const { getUsuarioId } = require("../utils/authHelper");
const { temPermissao } = require("../middleware/permissaoMiddleware");
const emailService = require("../services/emailService");

/**
 * Validação de CNPJ
 */
function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != digitos.charAt(0)) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado == digitos.charAt(1);
}

/**
 * Validação de CPF
 */
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}

module.exports = {
  /**
   * Criar solicitação de descarga (PÚBLICO - sem autenticação)
   * POST /solicitacoes-descarga
   */
  async create(request, response) {
    const io = getIo();
    const {
      empresa_nome,
      empresa_cnpj,
      empresa_email,
      empresa_contato,
      empresa_telefone,
      motorista_nome,
      motorista_cpf,
      placa_veiculo,
      tipo_veiculo,
      transportadora_nome,
      tipo_carga,
      observacao,
      horario_solicitado,
      notas_fiscais,
      quantidade_volumes,
    } = request.body;

    try {
      console.log("=== NOVA SOLICITAÇÃO DE DESCARGA ===");
      console.log("Dados recebidos:", JSON.stringify(request.body, null, 2));

      // Validações obrigatórias
      if (!empresa_nome || empresa_nome.trim() === "") {
        console.log("❌ ERRO: Nome da empresa é obrigatório");
        return response
          .status(400)
          .json({ error: "Nome da empresa é obrigatório" });
      }
      console.log("✅ empresa_nome OK");

      if (!empresa_cnpj) {
        console.log("❌ ERRO: CNPJ é obrigatório");
        return response.status(400).json({ error: "CNPJ é obrigatório" });
      }
      console.log("✅ empresa_cnpj presente");

      const cnpjLimpo = empresa_cnpj.replace(/[^\d]/g, "");
      console.log("CNPJ limpo:", cnpjLimpo);
      if (!validarCNPJ(cnpjLimpo)) {
        console.log("❌ ERRO: CNPJ inválido");
        return response.status(400).json({ error: "CNPJ inválido" });
      }
      console.log("✅ CNPJ válido");

      if (!empresa_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresa_email)) {
        console.log("❌ ERRO: E-mail inválido");
        return response.status(400).json({ error: "E-mail inválido" });
      }
      console.log("✅ empresa_email OK");

      if (!empresa_contato || empresa_contato.trim() === "") {
        console.log("❌ ERRO: Nome do solicitante é obrigatório");
        return response
          .status(400)
          .json({ error: "Nome do solicitante é obrigatório" });
      }
      console.log("✅ empresa_contato OK");

      if (
        !empresa_telefone ||
        empresa_telefone.replace(/[^\d]/g, "").length < 10
      ) {
        console.log(
          "❌ ERRO: Telefone inválido, dígitos:",
          empresa_telefone?.replace(/[^\d]/g, "").length
        );
        return response.status(400).json({
          error: "Telefone é obrigatório e deve ter pelo menos 10 dígitos",
        });
      }
      console.log("✅ empresa_telefone OK");

      if (!motorista_nome || motorista_nome.trim() === "") {
        console.log("❌ ERRO: Nome do motorista é obrigatório");
        return response
          .status(400)
          .json({ error: "Nome do motorista é obrigatório" });
      }
      console.log("✅ motorista_nome OK");

      if (!motorista_cpf) {
        console.log("❌ ERRO: CPF do motorista é obrigatório");
        return response
          .status(400)
          .json({ error: "CPF do motorista é obrigatório" });
      }
      console.log("✅ motorista_cpf presente");

      const cpfLimpo = motorista_cpf.replace(/[^\d]/g, "");
      console.log("CPF limpo:", cpfLimpo);
      if (!validarCPF(cpfLimpo)) {
        console.log("❌ ERRO: CPF do motorista inválido");
        return response
          .status(400)
          .json({ error: "CPF do motorista inválido" });
      }
      console.log("✅ CPF válido");

      if (!placa_veiculo || placa_veiculo.trim() === "") {
        console.log("❌ ERRO: Placa do veículo é obrigatória");
        return response
          .status(400)
          .json({ error: "Placa do veículo é obrigatória" });
      }
      console.log("✅ placa_veiculo OK");

      if (!tipo_veiculo || tipo_veiculo.trim() === "") {
        console.log("❌ ERRO: Tipo de veículo é obrigatório");
        return response
          .status(400)
          .json({ error: "Tipo de veículo é obrigatório" });
      }
      console.log("✅ tipo_veiculo OK");

      if (!transportadora_nome || transportadora_nome.trim() === "") {
        console.log("❌ ERRO: Nome da transportadora é obrigatório");
        return response
          .status(400)
          .json({ error: "Nome da transportadora é obrigatório" });
      }
      console.log("✅ transportadora_nome OK");

      if (!tipo_carga || tipo_carga.trim() === "") {
        console.log("❌ ERRO: Tipo de carga é obrigatório");
        return response
          .status(400)
          .json({ error: "Tipo de carga é obrigatório" });
      }
      console.log("✅ tipo_carga OK");

      if (!quantidade_volumes || quantidade_volumes <= 0) {
        console.log(
          "❌ ERRO: Quantidade de volumes inválida:",
          quantidade_volumes
        );
        return response
          .status(400)
          .json({ error: "Quantidade de volumes é obrigatória" });
      }
      console.log("✅ quantidade_volumes OK");

      if (!horario_solicitado) {
        console.log("❌ ERRO: Horário solicitado é obrigatório");
        return response
          .status(400)
          .json({ error: "Horário solicitado é obrigatório" });
      }
      console.log("✅ horario_solicitado presente");

      // Verificar se é data futura
      const dataHorario = new Date(horario_solicitado);
      console.log("Data horário:", dataHorario, "Agora:", new Date());
      if (dataHorario <= new Date()) {
        console.log("❌ ERRO: O horário solicitado deve ser no futuro");
        return response
          .status(400)
          .json({ error: "O horário solicitado deve ser no futuro" });
      }
      console.log("✅ Data é no futuro");

      // Formatar a data/hora para salvar sem conversão de timezone
      // O horario_solicitado vem como "2026-01-15T14:30" ou "2026-01-15T14:30:00"
      // Precisamos salvar exatamente esse horário, sem converter para UTC
      let horarioParaSalvar = horario_solicitado;

      // Se vier com Z no final (UTC), converter para horário local de Brasília
      if (
        horario_solicitado.endsWith("Z") ||
        horario_solicitado.includes("+")
      ) {
        // Formatar como string de data local sem timezone
        const d = new Date(horario_solicitado);
        horarioParaSalvar =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0") +
          "T" +
          String(d.getHours()).padStart(2, "0") +
          ":" +
          String(d.getMinutes()).padStart(2, "0") +
          ":" +
          String(d.getSeconds()).padStart(2, "0");
      }

      // Inserir no banco
      const [solicitacao] = await connection("solicitacoes_descarga")
        .insert({
          empresa_nome: empresa_nome.trim().toUpperCase(),
          empresa_cnpj: cnpjLimpo,
          empresa_email: empresa_email.trim().toLowerCase(),
          empresa_contato: empresa_contato.trim(),
          empresa_telefone: empresa_telefone.replace(/[^\d]/g, ""),
          motorista_nome: motorista_nome.trim().toUpperCase(),
          motorista_cpf: cpfLimpo,
          placa_veiculo: placa_veiculo
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ""),
          tipo_veiculo: tipo_veiculo.trim(),
          transportadora_nome: transportadora_nome.trim().toUpperCase(),
          tipo_carga: tipo_carga.trim(),
          observacao: observacao ? observacao.trim() : null,
          horario_solicitado: horarioParaSalvar,
          notas_fiscais: notas_fiscais ? notas_fiscais.trim() : null,
          quantidade_volumes: parseInt(quantidade_volumes),
          status: "PENDENTE",
        })
        .returning("*");

      console.log("✅ Solicitação de descarga criada:", solicitacao.id);

      // Gerar protocolo
      const protocolo = `DESC-${solicitacao.id.toString().padStart(6, "0")}`;

      // Atualizar o protocolo no banco
      await connection("solicitacoes_descarga")
        .where("id", solicitacao.id)
        .update({ protocolo });

      // Emitir evento via Socket para notificar usuários internos
      // Enviando TODOS os dados necessários para exibição na tabela
      io.to("global").emit("descarga:nova", {
        ...solicitacao,
        protocolo: protocolo,
      });

      console.log("📡 Evento descarga:nova emitido");

      // Enviar e-mail de confirmação para a empresa
      try {
        console.log("📧 Enviando email com protocolo:", protocolo);
        await emailService.enviarEmailSolicitacaoRecebida({
          email: solicitacao.empresa_email,
          protocolo: protocolo,
          empresa_nome: solicitacao.empresa_nome,
          motorista_nome: solicitacao.motorista_nome,
          placa_veiculo: solicitacao.placa_veiculo,
          horario_solicitado: solicitacao.horario_solicitado,
          tipo_carga: solicitacao.tipo_carga,
        });

        await connection("solicitacoes_descarga")
          .where("id", solicitacao.id)
          .update({
            email_enviado: true,
            email_enviado_em: new Date().toISOString(),
          });
      } catch (emailError) {
        console.error(
          "⚠️ Erro ao enviar e-mail de confirmação:",
          emailError.message
        );
      }

      return response.status(201).json({
        message: "Solicitação de descarga enviada com sucesso!",
        id: solicitacao.id,
        protocolo: protocolo,
      });
    } catch (error) {
      console.error("❌ Erro ao criar solicitação de descarga:", error);
      return response.status(500).json({
        error: "Erro interno ao processar solicitação",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  /**
   * Listar todas as solicitações (INTERNO - requer autenticação e permissão)
   * GET /solicitacoes-descarga
   */
  async index(request, response) {
    const usuario_id = getUsuarioId(request);
    const {
      status,
      data_inicio,
      data_fim,
      page = 1,
      limit = 20,
    } = request.query;

    try {
      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar permissão
      const podeVisualizar = await temPermissao(
        usuario_id,
        "descarga_visualizar"
      );
      if (!podeVisualizar) {
        return response.status(403).json({
          error: "Sem permissão para visualizar solicitações de descarga",
        });
      }

      let query = connection("solicitacoes_descarga")
        .select("*")
        .orderBy("criado_em", "desc");

      // Filtros
      if (status) {
        query = query.where("status", status.toUpperCase());
      }

      if (data_inicio) {
        query = query.where("horario_solicitado", ">=", data_inicio);
      }

      if (data_fim) {
        query = query.where("horario_solicitado", "<=", data_fim);
      }

      // Paginação
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.offset(offset).limit(parseInt(limit));

      const solicitacoes = await query;

      // Contar total para paginação
      const [{ count }] = await connection("solicitacoes_descarga")
        .count("id as count")
        .modify((qb) => {
          if (status) qb.where("status", status.toUpperCase());
          if (data_inicio) qb.where("horario_solicitado", ">=", data_inicio);
          if (data_fim) qb.where("horario_solicitado", "<=", data_fim);
        });

      return response.json({
        data: solicitacoes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(count),
          totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Erro ao listar solicitações:", error);
      return response
        .status(500)
        .json({ error: "Erro ao buscar solicitações" });
    }
  },

  /**
   * Buscar solicitação por ID (INTERNO)
   * GET /solicitacoes-descarga/:id
   */
  async show(request, response) {
    const usuario_id = getUsuarioId(request);
    const { id } = request.params;

    try {
      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const podeVisualizar = await temPermissao(
        usuario_id,
        "descarga_visualizar"
      );
      if (!podeVisualizar) {
        return response.status(403).json({ error: "Sem permissão" });
      }

      const solicitacao = await connection("solicitacoes_descarga")
        .where("id", id)
        .first();

      if (!solicitacao) {
        return response
          .status(404)
          .json({ error: "Solicitação não encontrada" });
      }

      // Buscar histórico
      const historico = await connection("solicitacoes_descarga_historico")
        .where("solicitacao_id", id)
        .orderBy("criado_em", "desc");

      return response.json({
        ...solicitacao,
        historico,
      });
    } catch (error) {
      console.error("Erro ao buscar solicitação:", error);
      return response.status(500).json({ error: "Erro ao buscar solicitação" });
    }
  },

  /**
   * Contar solicitações pendentes (para badge)
   * GET /solicitacoes-descarga/pendentes/count
   */
  async countPendentes(request, response) {
    const usuario_id = getUsuarioId(request);

    try {
      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const podeVisualizar = await temPermissao(
        usuario_id,
        "descarga_visualizar"
      );
      if (!podeVisualizar) {
        return response.json({ count: 0 });
      }

      const [{ count }] = await connection("solicitacoes_descarga")
        .where("status", "PENDENTE")
        .count("id as count");

      return response.json({ count: parseInt(count) });
    } catch (error) {
      console.error("Erro ao contar pendentes:", error);
      return response.status(500).json({ error: "Erro ao contar pendentes" });
    }
  },

  /**
   * Aprovar solicitação de descarga (INTERNO)
   * POST /solicitacoes-descarga/:id/aprovar
   */
  async aprovar(request, response) {
    const io = getIo();
    const usuario_id = getUsuarioId(request);
    const { id } = request.params;
    const { observacao } = request.body;

    try {
      console.log("=== APROVAR SOLICITAÇÃO DE DESCARGA ===");

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      // Verificar permissão
      const podeAprovar = await temPermissao(usuario_id, "descarga_aprovar");
      if (!podeAprovar) {
        return response
          .status(403)
          .json({ error: "Sem permissão para aprovar solicitações" });
      }

      // Buscar usuário
      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();
      if (!usuario) {
        return response.status(404).json({ error: "Usuário não encontrado" });
      }

      // Buscar solicitação
      const solicitacao = await connection("solicitacoes_descarga")
        .where("id", id)
        .first();
      if (!solicitacao) {
        return response
          .status(404)
          .json({ error: "Solicitação não encontrada" });
      }

      if (solicitacao.status !== "PENDENTE") {
        return response
          .status(400)
          .json({ error: `Solicitação já está ${solicitacao.status}` });
      }

      // Buscar setor ESTOQUE
      let setorEstoque = await connection("setor_visitante")
        .whereRaw("UPPER(nome) LIKE ?", ["%ESTOQUE%"])
        .first();

      // Se não encontrar, usar setor padrão ou criar
      if (!setorEstoque) {
        // Tentar buscar qualquer setor ou usar id 1
        setorEstoque = await connection("setor_visitante").first();
        if (!setorEstoque) {
          setorEstoque = { id: 1, nome: "ESTOQUE" };
        }
      }

      // Iniciar transação
      const trx = await connection.transaction();

      try {
        // 1. Atualizar status da solicitação
        await trx("solicitacoes_descarga").where("id", id).update({
          status: "APROVADO",
          validado_por: usuario.name,
          validado_em: new Date().toISOString(),
        });

        // 2. Criar registro no histórico
        await trx("solicitacoes_descarga_historico").insert({
          solicitacao_id: id,
          acao: "APROVADO",
          observacao: observacao || "Solicitação aprovada",
          usuario_id: usuario_id.toString(),
        });

        // 3. Criar agendamento
        const observacaoAgendamento = `[DESCARGA] ${solicitacao.tipo_carga} - Empresa: ${solicitacao.empresa_nome} - Placa: ${solicitacao.placa_veiculo}${observacao ? ` - Obs: ${observacao}` : ""}`;

        const [agendamento] = await trx("agendamentos")
          .insert({
            nome: solicitacao.motorista_nome,
            cpf: solicitacao.motorista_cpf,
            setor_id: setorEstoque.id,
            setor: setorEstoque.nome || "ESTOQUE",
            horario_agendado: solicitacao.horario_solicitado,
            observacao: observacaoAgendamento,
            criado_por: usuario.name,
            usuario_id: usuario_id,
            solicitacao_descarga_id: parseInt(id),
          })
          .returning("*");

        await trx.commit();

        console.log(
          "✅ Solicitação aprovada e agendamento criado:",
          agendamento.id
        );

        // Emitir eventos via Socket
        io.to("global").emit("descarga:atualizada", {
          id: parseInt(id),
          status: "APROVADO",
          validado_por: usuario.name,
        });

        io.to("global").emit("agendamento:create", {
          ...agendamento,
          confirmado: false,
          presente: false,
          timestamp: new Date(),
        });

        // Enviar e-mail de aprovação
        try {
          await emailService.enviarEmailStatusSolicitacao({
            email: solicitacao.empresa_email,
            protocolo: solicitacao.protocolo,
            empresa_nome: solicitacao.empresa_nome,
            motorista_nome: solicitacao.motorista_nome,
            placa_veiculo: solicitacao.placa_veiculo,
            horario_solicitado: solicitacao.horario_solicitado,
            tipo_carga: solicitacao.tipo_carga,
            status: "APROVADO",
            observacao: observacao || "Solicitação aprovada",
            validado_por: usuario.name,
          });
        } catch (emailError) {
          console.error("⚠️ Erro ao enviar e-mail:", emailError.message);
        }

        return response.json({
          message: "Solicitação aprovada com sucesso!",
          agendamento_id: agendamento.id,
        });
      } catch (trxError) {
        await trx.rollback();
        throw trxError;
      }
    } catch (error) {
      console.error("❌ Erro ao aprovar solicitação:", error);
      return response
        .status(500)
        .json({ error: "Erro ao aprovar solicitação" });
    }
  },

  /**
   * Rejeitar solicitação de descarga (INTERNO)
   * POST /solicitacoes-descarga/:id/rejeitar
   */
  async rejeitar(request, response) {
    const io = getIo();
    const usuario_id = getUsuarioId(request);
    const { id } = request.params;
    const { observacao } = request.body;

    try {
      console.log("=== REJEITAR SOLICITAÇÃO DE DESCARGA ===");

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const podeRejeitar = await temPermissao(usuario_id, "descarga_aprovar");
      if (!podeRejeitar) {
        return response
          .status(403)
          .json({ error: "Sem permissão para rejeitar solicitações" });
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();
      if (!usuario) {
        return response.status(404).json({ error: "Usuário não encontrado" });
      }

      const solicitacao = await connection("solicitacoes_descarga")
        .where("id", id)
        .first();
      if (!solicitacao) {
        return response
          .status(404)
          .json({ error: "Solicitação não encontrada" });
      }

      if (solicitacao.status !== "PENDENTE") {
        return response
          .status(400)
          .json({ error: `Solicitação já está ${solicitacao.status}` });
      }

      // Atualizar status
      await connection("solicitacoes_descarga").where("id", id).update({
        status: "REJEITADO",
        validado_por: usuario.name,
        validado_em: new Date().toISOString(),
      });

      // Salvar histórico
      await connection("solicitacoes_descarga_historico").insert({
        solicitacao_id: id,
        acao: "REJEITADO",
        observacao: observacao || "Solicitação rejeitada",
        usuario_id: usuario_id.toString(),
      });

      console.log("✅ Solicitação rejeitada:", id);

      // Emitir evento
      io.to("global").emit("descarga:atualizada", {
        id: parseInt(id),
        status: "REJEITADO",
        validado_por: usuario.name,
      });

      // Enviar e-mail
      try {
        await emailService.enviarEmailStatusSolicitacao({
          email: solicitacao.empresa_email,
          protocolo: solicitacao.protocolo,
          empresa_nome: solicitacao.empresa_nome,
          motorista_nome: solicitacao.motorista_nome,
          placa_veiculo: solicitacao.placa_veiculo,
          horario_solicitado: solicitacao.horario_solicitado,
          tipo_carga: solicitacao.tipo_carga,
          status: "REJEITADO",
          observacao: observacao || "Solicitação rejeitada",
          validado_por: usuario.name,
        });
      } catch (emailError) {
        console.error("⚠️ Erro ao enviar e-mail:", emailError.message);
      }

      return response.json({ message: "Solicitação rejeitada" });
    } catch (error) {
      console.error("❌ Erro ao rejeitar solicitação:", error);
      return response
        .status(500)
        .json({ error: "Erro ao rejeitar solicitação" });
    }
  },

  /**
   * Ajustar horário da solicitação (INTERNO)
   * POST /solicitacoes-descarga/:id/ajustar-horario
   */
  async ajustarHorario(request, response) {
    const io = getIo();
    const usuario_id = getUsuarioId(request);
    const { id } = request.params;
    const { novo_horario, observacao } = request.body;

    try {
      console.log("=== AJUSTAR HORÁRIO DE SOLICITAÇÃO ===");

      if (!usuario_id) {
        return response.status(401).json({ error: "Não autorizado" });
      }

      const podeAjustar = await temPermissao(usuario_id, "descarga_editar");
      if (!podeAjustar) {
        return response
          .status(403)
          .json({ error: "Sem permissão para ajustar solicitações" });
      }

      if (!novo_horario) {
        return response
          .status(400)
          .json({ error: "Novo horário é obrigatório" });
      }

      // Validar se a data é válida
      const novaData = new Date(novo_horario);
      if (isNaN(novaData.getTime())) {
        return response
          .status(400)
          .json({ error: "Formato de data/hora inválido" });
      }

      if (novaData <= new Date()) {
        return response
          .status(400)
          .json({ error: "O novo horário deve ser no futuro" });
      }

      // Formatar a data/hora para salvar sem conversão de timezone
      // O novo_horario vem como "2026-01-15T14:30:00" (sem Z = horário local)
      let horarioParaSalvar = novo_horario;

      // Se vier com Z no final (UTC), converter para string local
      if (novo_horario.endsWith("Z") || novo_horario.includes("+")) {
        const d = new Date(novo_horario);
        horarioParaSalvar =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0") +
          "T" +
          String(d.getHours()).padStart(2, "0") +
          ":" +
          String(d.getMinutes()).padStart(2, "0") +
          ":" +
          String(d.getSeconds()).padStart(2, "0");
      }

      const usuario = await connection("usuarios")
        .where("id", usuario_id)
        .first();
      if (!usuario) {
        return response.status(404).json({ error: "Usuário não encontrado" });
      }

      const solicitacao = await connection("solicitacoes_descarga")
        .where("id", id)
        .first();
      if (!solicitacao) {
        return response
          .status(404)
          .json({ error: "Solicitação não encontrada" });
      }

      if (solicitacao.status !== "PENDENTE") {
        return response
          .status(400)
          .json({ error: `Solicitação já está ${solicitacao.status}` });
      }

      const horarioAnterior = solicitacao.horario_solicitado;

      // Atualizar horário - usar horarioParaSalvar sem conversão UTC
      await connection("solicitacoes_descarga").where("id", id).update({
        horario_solicitado: horarioParaSalvar,
      });

      // Salvar histórico com horários
      await connection("solicitacoes_descarga_historico").insert({
        solicitacao_id: id,
        acao: "AJUSTADO",
        observacao: observacao || "Horário ajustado",
        horario_anterior: horarioAnterior,
        horario_novo: horarioParaSalvar,
        usuario_id: usuario_id.toString(),
      });

      console.log("✅ Horário ajustado:", id);

      // Emitir evento
      io.to("global").emit("descarga:atualizada", {
        id: parseInt(id),
        horario_solicitado: horarioParaSalvar,
        status: "PENDENTE",
      });

      // Enviar e-mail
      try {
        await emailService.enviarEmailHorarioAjustado({
          email: solicitacao.empresa_email,
          protocolo: solicitacao.protocolo,
          empresa_nome: solicitacao.empresa_nome,
          motorista_nome: solicitacao.motorista_nome,
          placa_veiculo: solicitacao.placa_veiculo,
          horario_anterior: horarioAnterior,
          horario_novo: horarioParaSalvar,
          tipo_carga: solicitacao.tipo_carga,
          observacao: observacao || "Horário ajustado pela equipe interna",
          ajustado_por: usuario.name,
        });
      } catch (emailError) {
        console.error("⚠️ Erro ao enviar e-mail:", emailError.message);
      }

      return response.json({
        message: "Horário ajustado com sucesso",
        horario_anterior: horarioAnterior,
        horario_novo: horarioParaSalvar,
      });
    } catch (error) {
      console.error("❌ Erro ao ajustar horário:", error);
      return response.status(500).json({ error: "Erro ao ajustar horário" });
    }
  },
};
