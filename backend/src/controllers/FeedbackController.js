// controllers/FeedbackController.js
const emailService = require("../services/emailService");

/**
 * Enviar feedback por email
 */
const enviarFeedback = async (req, res) => {
  try {
    const { mensagem, usuario_nome, usuario_email } = req.body;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: "Mensagem é obrigatória" });
    }

    // Configurações do destinatário (pode vir do .env)
    const destinatario = process.env.SMTP_USER || "vitorlohanrj@gmail.com";

    // Monta o conteúdo do email
    const assunto = `[Feedback] Nova sugestão de ${usuario_nome || "Usuário"}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback do Sistema</title>
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: #10b981;
    }
    .message-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .message-box p {
      margin: 0;
      white-space: pre-wrap;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💡 Nova Sugestão Recebida</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <h3>Informações do Usuário</h3>
        <p><strong>Nome:</strong> ${usuario_nome || "Não informado"}</p>
        <p><strong>Email:</strong> ${usuario_email || "Não informado"}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
      </div>
      
      <h3>📝 Mensagem</h3>
      <div class="message-box">
        <p>${mensagem}</p>
      </div>
    </div>
    <div class="footer">
      Sistema de Gestão de Visitantes - Feedback Automático
    </div>
  </div>
</body>
</html>
    `;

    // Envia o email
    await emailService.enviarEmailGenerico({
      to: destinatario,
      subject: assunto,
      html: htmlContent,
    });

    res.json({ message: "Feedback enviado com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar feedback:", error);
    res.status(500).json({ error: "Erro ao enviar feedback" });
  }
};

module.exports = {
  enviarFeedback,
};
