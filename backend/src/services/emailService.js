// services/emailService.js
const nodemailer = require("nodemailer");

/**
 * Configuração do transporter de e-mail
 * Configure as variáveis de ambiente:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM
 */
const createTransporter = () => {
  // Verificar se as credenciais estão configuradas
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(
      "⚠️ Credenciais SMTP não configuradas. E-mails não serão enviados."
    );
    console.log("   Configure SMTP_USER e SMTP_PASS no arquivo .env");
    return null;
  }

  // Em desenvolvimento sem host, usar console
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    console.log("📧 Modo desenvolvimento: e-mails serão logados no console");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Formatar data para exibição
 */
const formatarData = (data) => {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Template base de e-mail HTML
 */
const templateBase = (conteudo, titulo) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: #667eea;
    }
    .info-item {
      display: flex;
      margin: 8px 0;
    }
    .info-label {
      font-weight: 600;
      min-width: 140px;
      color: #555;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 14px;
    }
    .status-pendente {
      background-color: #fff3cd;
      color: #856404;
    }
    .status-aprovado {
      background-color: #d4edda;
      color: #155724;
    }
    .status-rejeitado {
      background-color: #f8d7da;
      color: #721c24;
    }
    .observacao {
      background-color: #e7f1ff;
      border: 1px solid #b8d4fe;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
    }
    .observacao-title {
      font-weight: 600;
      color: #0056b3;
      margin-bottom: 8px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .highlight {
      background-color: #fffbcc;
      padding: 2px 6px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${conteudo}
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
      <p>Sistema de Controle de Visitantes - Liberaê</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Enviar e-mail de confirmação de recebimento da solicitação
 */
async function enviarEmailSolicitacaoRecebida(dados) {
  const {
    email,
    empresa_nome,
    motorista_nome,
    placa_veiculo,
    horario_solicitado,
    tipo_carga,
  } = dados;

  const conteudo = `
    <div class="header">
      <h1>📦 Solicitação Recebida</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${empresa_nome}</strong>!</p>
      <p>Sua solicitação de agendamento de descarga foi recebida com sucesso e está aguardando análise.</p>
      
      <div class="info-box">
        <h3>📋 Dados da Solicitação</h3>
        <div class="info-item">
          <span class="info-label">Empresa:</span>
          <span>${empresa_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Motorista:</span>
          <span>${motorista_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Placa:</span>
          <span>${placa_veiculo}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tipo de Carga:</span>
          <span>${tipo_carga}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Data/Hora Solicitada:</span>
          <span class="highlight">${formatarData(horario_solicitado)}</span>
        </div>
      </div>
      
      <p style="text-align: center;">
        <span class="status-badge status-pendente">⏳ Aguardando Análise</span>
      </p>
      
      <p>Você receberá um novo e-mail assim que sua solicitação for analisada pela nossa equipe.</p>
    </div>
  `;

  await enviarEmail({
    to: email,
    subject: `📦 Solicitação de Descarga Recebida - ${empresa_nome}`,
    html: templateBase(conteudo, "Solicitação Recebida"),
  });
}

/**
 * Enviar e-mail de status (aprovado/rejeitado)
 */
async function enviarEmailStatusSolicitacao(dados) {
  const {
    email,
    empresa_nome,
    motorista_nome,
    placa_veiculo,
    horario_solicitado,
    tipo_carga,
    status,
    observacao,
    validado_por,
  } = dados;

  const statusClass =
    status === "APROVADO" ? "status-aprovado" : "status-rejeitado";
  const statusIcon = status === "APROVADO" ? "✅" : "❌";
  const statusTexto = status === "APROVADO" ? "Aprovada" : "Rejeitada";

  const mensagemAdicional =
    status === "APROVADO"
      ? `<p style="color: #155724;"><strong>Importante:</strong> Compareça no horário agendado com os documentos do motorista e do veículo.</p>`
      : `<p style="color: #721c24;"><strong>Atenção:</strong> Caso necessário, você pode enviar uma nova solicitação com as correções necessárias.</p>`;

  const conteudo = `
    <div class="header">
      <h1>${statusIcon} Solicitação ${statusTexto}</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${empresa_nome}</strong>!</p>
      <p>Sua solicitação de agendamento de descarga foi <strong>${statusTexto.toLowerCase()}</strong>.</p>
      
      <p style="text-align: center; margin: 25px 0;">
        <span class="status-badge ${statusClass}">${statusIcon} ${statusTexto}</span>
      </p>
      
      <div class="info-box">
        <h3>📋 Dados da Solicitação</h3>
        <div class="info-item">
          <span class="info-label">Empresa:</span>
          <span>${empresa_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Motorista:</span>
          <span>${motorista_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Placa:</span>
          <span>${placa_veiculo}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tipo de Carga:</span>
          <span>${tipo_carga}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Data/Hora:</span>
          <span class="highlight">${formatarData(horario_solicitado)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Validado por:</span>
          <span>${validado_por}</span>
        </div>
      </div>
      
      ${
        observacao
          ? `
      <div class="observacao">
        <div class="observacao-title">💬 Observação:</div>
        <p style="margin: 0;">${observacao}</p>
      </div>
      `
          : ""
      }
      
      ${mensagemAdicional}
    </div>
  `;

  await enviarEmail({
    to: email,
    subject: `${statusIcon} Solicitação de Descarga ${statusTexto} - ${empresa_nome}`,
    html: templateBase(conteudo, `Solicitação ${statusTexto}`),
  });
}

/**
 * Enviar e-mail de horário ajustado
 */
async function enviarEmailHorarioAjustado(dados) {
  const {
    email,
    empresa_nome,
    motorista_nome,
    placa_veiculo,
    horario_anterior,
    horario_novo,
    tipo_carga,
    observacao,
    ajustado_por,
  } = dados;

  const conteudo = `
    <div class="header">
      <h1>🕐 Horário Ajustado</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>${empresa_nome}</strong>!</p>
      <p>O horário da sua solicitação de descarga foi ajustado pela nossa equipe.</p>
      
      <div class="info-box">
        <h3>📋 Dados da Solicitação</h3>
        <div class="info-item">
          <span class="info-label">Empresa:</span>
          <span>${empresa_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Motorista:</span>
          <span>${motorista_nome}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Placa:</span>
          <span>${placa_veiculo}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tipo de Carga:</span>
          <span>${tipo_carga}</span>
        </div>
      </div>
      
      <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #856404;">📅 Alteração de Horário</h3>
        <div class="info-item">
          <span class="info-label" style="color: #856404;">Horário Anterior:</span>
          <span style="text-decoration: line-through; color: #6c757d;">${formatarData(horario_anterior)}</span>
        </div>
        <div class="info-item">
          <span class="info-label" style="color: #856404;">Novo Horário:</span>
          <span class="highlight" style="font-weight: bold; font-size: 16px;">${formatarData(horario_novo)}</span>
        </div>
        <div class="info-item">
          <span class="info-label" style="color: #856404;">Ajustado por:</span>
          <span>${ajustado_por}</span>
        </div>
      </div>
      
      ${
        observacao
          ? `
      <div class="observacao">
        <div class="observacao-title">💬 Motivo do Ajuste:</div>
        <p style="margin: 0;">${observacao}</p>
      </div>
      `
          : ""
      }
      
      <p style="text-align: center;">
        <span class="status-badge status-pendente">⏳ Aguardando Aprovação</span>
      </p>
      
      <p><strong>Importante:</strong> Sua solicitação continua em análise. Você receberá um novo e-mail com a confirmação final.</p>
    </div>
  `;

  await enviarEmail({
    to: email,
    subject: `🕐 Horário de Descarga Ajustado - ${empresa_nome}`,
    html: templateBase(conteudo, "Horário Ajustado"),
  });
}

/**
 * Função principal de envio de e-mail
 */
async function enviarEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  // Se não há transporter configurado (desenvolvimento), logar no console
  if (!transporter) {
    console.log("\n📧 ════════════════════════════════════════════════");
    console.log(`📧 E-MAIL (Simulado em desenvolvimento)`);
    console.log(`📧 Para: ${to}`);
    console.log(`📧 Assunto: ${subject}`);
    console.log("📧 ════════════════════════════════════════════════\n");
    return { messageId: "dev-mode-" + Date.now() };
  }

  const mailOptions = {
    from:
      process.env.SMTP_FROM ||
      `"Sistema de Visitantes" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text:
      text ||
      "Por favor, visualize este e-mail em um cliente que suporte HTML.",
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 E-mail enviado: ${info.messageId} para ${to}`);
    return info;
  } catch (error) {
    console.error(`❌ Erro ao enviar e-mail para ${to}:`, error.message);
    throw error;
  }
}

module.exports = {
  enviarEmail,
  enviarEmailSolicitacaoRecebida,
  enviarEmailStatusSolicitacao,
  enviarEmailHorarioAjustado,
};
