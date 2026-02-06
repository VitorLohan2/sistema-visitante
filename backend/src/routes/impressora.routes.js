/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROTAS DE IMPRESSORA - Impressão via rede (RAW TCP/IP porta 9100)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Permite enviar comandos de impressora (ZPL, DPL, ESC/POS, CPCL) diretamente
 * para impressoras de etiqueta via rede.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const net = require("net");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

/**
 * POST /impressora/imprimir
 * Envia comandos de impressão para uma impressora via rede (porta 9100)
 *
 * Body:
 * - enderecoIP: string (IP da impressora, ex: "192.168.10.64")
 * - porta: number (opcional, padrão 9100)
 * - comandos: string (comandos ZPL, DPL, ESC/POS, etc)
 * - linguagem: string (para log/debug)
 */
router.post("/imprimir", authMiddleware, async (req, res) => {
  const { enderecoIP, porta = 9100, comandos, linguagem = "RAW" } = req.body;

  // Validações
  if (!enderecoIP) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Endereço IP da impressora é obrigatório",
    });
  }

  if (!comandos) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Comandos de impressão são obrigatórios",
    });
  }

  // Valida formato do IP
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(enderecoIP)) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Endereço IP inválido",
    });
  }

  console.log(`📠 Enviando ${linguagem} para ${enderecoIP}:${porta}...`);

  try {
    await enviarParaImpressora(enderecoIP, porta, comandos);

    console.log(`✅ Comandos enviados com sucesso para ${enderecoIP}`);

    return res.json({
      sucesso: true,
      mensagem: `Comandos ${linguagem} enviados para ${enderecoIP}:${porta}`,
    });
  } catch (erro) {
    console.error(`❌ Erro ao imprimir em ${enderecoIP}:`, erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: `Erro ao conectar com impressora: ${erro.message}`,
    });
  }
});

/**
 * POST /impressora/testar-conexao
 * Testa se a impressora está acessível na rede
 */
router.post("/testar-conexao", authMiddleware, async (req, res) => {
  const { enderecoIP, porta = 9100 } = req.body;

  if (!enderecoIP) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Endereço IP é obrigatório",
    });
  }

  try {
    await testarConexao(enderecoIP, porta);

    return res.json({
      sucesso: true,
      mensagem: `Impressora acessível em ${enderecoIP}:${porta}`,
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: erro.message,
    });
  }
});

/**
 * Envia comandos para impressora via socket TCP
 */
function enviarParaImpressora(ip, porta, comandos) {
  return new Promise((resolve, reject) => {
    const cliente = new net.Socket();
    const timeout = 10000; // 10 segundos

    // Timeout de conexão
    cliente.setTimeout(timeout);

    cliente.connect(porta, ip, () => {
      // Conectado - envia os comandos
      cliente.write(comandos, "utf8", (erro) => {
        if (erro) {
          cliente.destroy();
          reject(new Error(`Erro ao enviar dados: ${erro.message}`));
        } else {
          // Aguarda um pouco antes de fechar
          setTimeout(() => {
            cliente.end();
            resolve();
          }, 100);
        }
      });
    });

    cliente.on("error", (erro) => {
      cliente.destroy();

      if (erro.code === "ECONNREFUSED") {
        reject(
          new Error(
            "Conexão recusada. Verifique se a impressora está ligada e o IP está correto.",
          ),
        );
      } else if (erro.code === "ETIMEDOUT" || erro.code === "EHOSTUNREACH") {
        reject(
          new Error(
            "Impressora não encontrada na rede. Verifique o IP e a conexão de rede.",
          ),
        );
      } else if (erro.code === "ENOTFOUND") {
        reject(new Error("Endereço não encontrado."));
      } else {
        reject(new Error(`Erro de conexão: ${erro.message}`));
      }
    });

    cliente.on("timeout", () => {
      cliente.destroy();
      reject(new Error("Timeout - impressora não respondeu a tempo"));
    });

    cliente.on("close", () => {
      // Conexão fechada normalmente
    });
  });
}

/**
 * Testa conexão com a impressora
 */
function testarConexao(ip, porta) {
  return new Promise((resolve, reject) => {
    const cliente = new net.Socket();
    const timeout = 5000; // 5 segundos para teste

    cliente.setTimeout(timeout);

    cliente.connect(porta, ip, () => {
      cliente.end();
      resolve();
    });

    cliente.on("error", (erro) => {
      cliente.destroy();

      if (erro.code === "ECONNREFUSED") {
        reject(
          new Error("Conexão recusada. Verifique se a impressora está ligada."),
        );
      } else if (erro.code === "ETIMEDOUT" || erro.code === "EHOSTUNREACH") {
        reject(new Error("Impressora não encontrada na rede."));
      } else {
        reject(new Error(`Erro: ${erro.message}`));
      }
    });

    cliente.on("timeout", () => {
      cliente.destroy();
      reject(new Error("Timeout - impressora não respondeu"));
    });
  });
}

module.exports = router;
