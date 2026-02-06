// src/components/ModalCracha.js
import React, { useRef, useState, useEffect } from "react";
import {
  FiX,
  FiPrinter,
  FiSettings,
  FiCode,
  FiMonitor,
  FiHardDrive,
  FiWifi,
} from "react-icons/fi";
import logo from "../assets/logo.svg";
import "../styles/ModalCracha.css";
import api from "../services/api";
import {
  LINGUAGENS_IMPRESSORA,
  CONFIGURACOES_ETIQUETA,
  gerarComandosImpressao,
  gerarPreviewComandos,
  carregarConfiguracaoImpressora,
  salvarConfiguracaoImpressora,
  webUSBDisponivel,
  conectarImpressoraUSB,
  enviarParaImpressoraUSB,
} from "../services/impressoraService";

export default function ModalCracha({ visible, onClose, badgeData }) {
  const printRef = useRef(null);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarPreviewComandos, setMostrarPreviewComandos] = useState(false);
  const [configuracao, setConfiguracao] = useState(
    carregarConfiguracaoImpressora(),
  );
  const [dispositivoUSB, setDispositivoUSB] = useState(null);
  const [statusImpressao, setStatusImpressao] = useState("");

  // Carrega configuração ao montar
  useEffect(() => {
    setConfiguracao(carregarConfiguracaoImpressora());
  }, [visible]);

  if (!visible || !badgeData) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // IMPRESSÃO VIA NAVEGADOR (HTML - fallback)
  // ═══════════════════════════════════════════════════════════════════════
  const imprimirViaNavegador = () => {
    const printWindow = window.open("", "PRINT", "height=600,width=400");

    // Define tamanhos baseado na orientação
    const isRetrato = configuracao.orientacao === "retrato";
    const largura = isRetrato ? "101.6mm" : "152.4mm";
    const altura = isRetrato ? "152.4mm" : "101.6mm";
    const larguraConteudo = isRetrato ? "95mm" : "145mm";
    const alturaConteudo = isRetrato ? "145mm" : "95mm";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Crachá de Visitante</title>
          <style>
            /* Etiqueta padrão 101.6mm x 152.4mm (4" x 6") */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: ${largura} ${altura};
              margin: 0;
            }
            
            @media print {
              html, body {
                width: ${largura};
                height: ${altura};
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            
            body {
              font-family: Arial, Helvetica, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              width: ${largura};
              height: ${altura};
              background: #fff;
              margin: 0;
              padding: 0;
            }
            
            .badge-print {
              width: ${larguraConteudo};
              height: ${alturaConteudo};
              padding: 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              border: 1px solid #000;
              border-radius: 3mm;
              background: #fff;
            }
            
            .badge-header {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              padding-bottom: 3mm;
              border-bottom: 1px solid #ccc;
            }
            
            .badge-logo {
              max-width: 50mm;
              max-height: 25mm;
              object-fit: contain;
            }
            
            .badge-title {
              font-size: 14pt;
              font-weight: bold;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 3mm;
            }
            
            .badge-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              text-align: center;
              gap: 4mm;
              padding: 5mm 0;
            }
            
            .badge-nome {
              font-size: 16pt;
              font-weight: bold;
              color: #000;
              text-transform: uppercase;
              line-height: 1.2;
              max-width: 100%;
              word-wrap: break-word;
            }
            
            .badge-empresa {
              font-size: 14pt;
              font-weight: 600;
              color: #333;
              text-transform: uppercase;
            }
            
            .badge-setor {
              font-size: 12pt;
              color: #555;
              font-weight: 500;
            }
            
            .badge-footer {
              width: 100%;
              padding-top: 3mm;
              border-top: 1px solid #ccc;
              text-align: center;
            }
            
            .badge-date {
              font-size: 10pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="badge-print">
            <div class="badge-header">
              <img src="${logo}" alt="Logo" class="badge-logo" onerror="this.style.display='none'" />
            </div>
            <div class="badge-title">VISITANTE</div>
            
            <div class="badge-content">
              <div class="badge-nome">${badgeData.nome || ""}</div>
              <div class="badge-empresa">${badgeData.empresa || ""}</div>
              <div class="badge-setor">${badgeData.setor || ""}</div>
            </div>
            
            <div class="badge-footer">
              <span class="badge-date">${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Aguarda o carregamento antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // IMPRESSÃO VIA USB (WebUSB)
  // ═══════════════════════════════════════════════════════════════════════
  const imprimirViaUSB = async () => {
    const comandos = gerarComandosImpressao(
      badgeData,
      configuracao.linguagem,
      configuracao.etiqueta,
    );

    if (!comandos) {
      setStatusImpressao("❌ Linguagem não suportada para USB");
      return;
    }

    try {
      setStatusImpressao("🔌 Conectando à impressora USB...");

      let dispositivo = dispositivoUSB;
      if (!dispositivo || !dispositivo.opened) {
        dispositivo = await conectarImpressoraUSB();
        if (dispositivo) {
          setDispositivoUSB(dispositivo);
        }
      }

      if (!dispositivo) {
        setStatusImpressao("❌ Impressora USB não conectada");
        return;
      }

      setStatusImpressao("📤 Enviando comandos...");
      const sucesso = await enviarParaImpressoraUSB(dispositivo, comandos);

      if (sucesso) {
        setStatusImpressao("✅ Crachá impresso com sucesso!");
        setTimeout(() => setStatusImpressao(""), 3000);
      } else {
        setStatusImpressao("❌ Erro ao enviar para impressora");
      }
    } catch (erro) {
      // Mensagem amigável para erros comuns do WebUSB
      if (erro.message.includes("Access denied")) {
        setStatusImpressao(
          "❌ Acesso negado. O driver do Windows está usando a impressora. Use 'Via Rede' ou 'Via Navegador'.",
        );
      } else if (erro.message.includes("No device selected")) {
        setStatusImpressao("❌ Nenhuma impressora selecionada");
      } else {
        setStatusImpressao(`❌ Erro: ${erro.message}`);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // IMPRESSÃO VIA REDE (TCP/IP porta 9100)
  // ═══════════════════════════════════════════════════════════════════════
  const imprimirViaRede = async () => {
    const comandos = gerarComandosImpressao(
      badgeData,
      configuracao.linguagem,
      configuracao.etiqueta,
    );

    if (!comandos) {
      setStatusImpressao("❌ Linguagem não suportada para impressão via rede");
      return;
    }

    if (!configuracao.enderecoIP) {
      setStatusImpressao("❌ Configure o IP da impressora nas configurações");
      return;
    }

    try {
      setStatusImpressao(`🌐 Enviando para ${configuracao.enderecoIP}...`);

      const resposta = await api.post("/impressora/imprimir", {
        enderecoIP: configuracao.enderecoIP,
        porta: configuracao.porta || 9100,
        comandos: comandos,
        linguagem: configuracao.linguagem,
      });

      if (resposta.data.sucesso) {
        setStatusImpressao("✅ Crachá impresso com sucesso!");
        setTimeout(() => setStatusImpressao(""), 3000);
      } else {
        setStatusImpressao(`❌ ${resposta.data.mensagem}`);
      }
    } catch (erro) {
      const mensagem = erro.response?.data?.mensagem || erro.message;
      setStatusImpressao(`❌ ${mensagem}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // TESTAR CONEXÃO COM IMPRESSORA
  // ═══════════════════════════════════════════════════════════════════════
  const testarConexaoImpressora = async () => {
    if (!configuracao.enderecoIP) {
      setStatusImpressao("❌ Digite o IP da impressora primeiro");
      return;
    }

    try {
      setStatusImpressao(
        `🔍 Testando conexão com ${configuracao.enderecoIP}...`,
      );

      const resposta = await api.post("/impressora/testar-conexao", {
        enderecoIP: configuracao.enderecoIP,
        porta: configuracao.porta || 9100,
      });

      if (resposta.data.sucesso) {
        setStatusImpressao("✅ Impressora conectada!");
        setTimeout(() => setStatusImpressao(""), 3000);
      } else {
        setStatusImpressao(`❌ ${resposta.data.mensagem}`);
      }
    } catch (erro) {
      const mensagem = erro.response?.data?.mensagem || erro.message;
      setStatusImpressao(`❌ ${mensagem}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // IMPRESSÃO VIA COMANDOS (abre janela com comandos raw)
  // ═══════════════════════════════════════════════════════════════════════
  const imprimirViaComandos = () => {
    const comandos = gerarComandosImpressao(
      badgeData,
      configuracao.linguagem,
      configuracao.etiqueta,
    );

    if (!comandos) {
      imprimirViaNavegador();
      return;
    }

    // Cria um blob com os comandos e oferece para download
    const blob = new Blob([comandos], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cracha_${badgeData.nome?.replace(/\s/g, "_") || "visitante"}.${configuracao.linguagem.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setStatusImpressao(`✅ Arquivo ${configuracao.linguagem} gerado!`);
    setTimeout(() => setStatusImpressao(""), 3000);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // HANDLER PRINCIPAL DE IMPRESSÃO
  // ═══════════════════════════════════════════════════════════════════════
  const handlePrint = async () => {
    setStatusImpressao("");

    // Se linguagem é HTML, usa impressão via navegador
    if (configuracao.linguagem === LINGUAGENS_IMPRESSORA.HTML) {
      imprimirViaNavegador();
      return;
    }

    // Decide o método de envio baseado na configuração
    switch (configuracao.metodoEnvio) {
      case "usb":
        await imprimirViaUSB();
        break;
      case "rede":
        await imprimirViaRede();
        break;
      case "arquivo":
        imprimirViaComandos();
        break;
      case "navegador":
      default:
        imprimirViaNavegador();
        break;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DA IMPRESSORA
  // ═══════════════════════════════════════════════════════════════════════
  const atualizarConfiguracao = (campo, valor) => {
    const novaConfig = { ...configuracao, [campo]: valor };
    setConfiguracao(novaConfig);
    salvarConfiguracaoImpressora(novaConfig);
  };

  const atualizarConfiguracaoEtiqueta = (campo, valor) => {
    const novaConfig = {
      ...configuracao,
      etiqueta: { ...configuracao.etiqueta, [campo]: valor },
    };
    setConfiguracao(novaConfig);
    salvarConfiguracaoImpressora(novaConfig);
  };

  // Preview dos comandos gerados
  const obterPreviewComandos = () => {
    const comandos = gerarComandosImpressao(
      badgeData,
      configuracao.linguagem,
      configuracao.etiqueta,
    );
    if (!comandos) return "<p>Modo HTML - sem comandos de impressora</p>";
    return gerarPreviewComandos(comandos, configuracao.linguagem);
  };

  const currentDate = new Date().toLocaleDateString("pt-BR");
  const currentTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL DE CONFIGURAÇÃO
  // ═══════════════════════════════════════════════════════════════════════
  const renderModalConfiguracao = () => (
    <div
      className="config-impressora-overlay"
      onClick={() => setMostrarConfig(false)}
    >
      <div
        className="config-impressora-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="config-impressora-header">
          <h3>
            <FiSettings size={18} /> Configuração da Impressora
          </h3>
          <button onClick={() => setMostrarConfig(false)}>
            <FiX size={18} />
          </button>
        </div>

        <div className="config-impressora-body">
          {/* Linguagem */}
          <div className="config-group">
            <label>Linguagem da Impressora:</label>
            <select
              value={configuracao.linguagem}
              onChange={(e) =>
                atualizarConfiguracao("linguagem", e.target.value)
              }
            >
              <option value={LINGUAGENS_IMPRESSORA.HTML}>
                HTML (Navegador)
              </option>
              <option value={LINGUAGENS_IMPRESSORA.ZPL}>
                ZPL/ZPL II (Zebra)
              </option>
              <option value={LINGUAGENS_IMPRESSORA.DPL}>
                DPL (Honeywell/Datamax)
              </option>
              <option value={LINGUAGENS_IMPRESSORA.ESCPOS}>
                ESC/POS (Epson)
              </option>
              <option value={LINGUAGENS_IMPRESSORA.CPCL}>
                CPCL (Zebra Móvel)
              </option>
            </select>
            <small>
              {configuracao.linguagem === "ZPL" &&
                "Compatível: Zebra, Honeywell (modo ZPL)"}
              {configuracao.linguagem === "DPL" &&
                "Compatível: Honeywell PC42E-T, Datamax"}
              {configuracao.linguagem === "ESCPOS" &&
                "Compatível: Epson, impressoras térmicas genéricas"}
              {configuracao.linguagem === "CPCL" &&
                "Compatível: Zebra QL, RW, MZ series"}
              {configuracao.linguagem === "HTML" &&
                "Usa impressão padrão do navegador"}
            </small>
          </div>

          {/* Método de Envio */}
          {configuracao.linguagem !== LINGUAGENS_IMPRESSORA.HTML && (
            <div className="config-group">
              <label>Método de Envio:</label>
              <div className="config-radio-group">
                <label className="config-radio recomendado">
                  <input
                    type="radio"
                    name="metodoEnvio"
                    value="navegador"
                    checked={configuracao.metodoEnvio === "navegador"}
                    onChange={(e) =>
                      atualizarConfiguracao("metodoEnvio", e.target.value)
                    }
                  />
                  <FiMonitor size={16} />
                  <span>Via Navegador - Recomendado para USB</span>
                </label>
                <label className="config-radio">
                  <input
                    type="radio"
                    name="metodoEnvio"
                    value="arquivo"
                    checked={configuracao.metodoEnvio === "arquivo"}
                    onChange={(e) =>
                      atualizarConfiguracao("metodoEnvio", e.target.value)
                    }
                  />
                  <FiCode size={16} />
                  <span>Baixar Arquivo DPL/ZPL</span>
                </label>
                <label className="config-radio">
                  <input
                    type="radio"
                    name="metodoEnvio"
                    value="rede"
                    checked={configuracao.metodoEnvio === "rede"}
                    onChange={(e) =>
                      atualizarConfiguracao("metodoEnvio", e.target.value)
                    }
                  />
                  <FiWifi size={16} />
                  <span>Via Rede (apenas se impressora tiver IP)</span>
                </label>
              </div>
              <small style={{ marginTop: "8px", display: "block" }}>
                💡 Para impressora USB com driver instalado, use "Via
                Navegador".
              </small>
            </div>
          )}

          {/* Configuração de Rede (se método for rede) */}
          {configuracao.metodoEnvio === "rede" &&
            configuracao.linguagem !== LINGUAGENS_IMPRESSORA.HTML && (
              <div className="config-group">
                <label>Endereço IP da Impressora:</label>
                <div className="config-ip-group">
                  <input
                    type="text"
                    value={configuracao.enderecoIP || ""}
                    onChange={(e) =>
                      atualizarConfiguracao("enderecoIP", e.target.value)
                    }
                    placeholder="Ex: 192.168.10.64"
                  />
                  <input
                    type="number"
                    value={configuracao.porta || 9100}
                    onChange={(e) =>
                      atualizarConfiguracao("porta", Number(e.target.value))
                    }
                    min={1}
                    max={65535}
                    style={{ width: "80px" }}
                    title="Porta (padrão: 9100)"
                  />
                  <button
                    type="button"
                    className="btn-testar"
                    onClick={testarConexaoImpressora}
                  >
                    Testar
                  </button>
                </div>
                <small>
                  Verifique o IP nas configurações de rede da sua impressora.
                  Porta padrão: 9100
                </small>
              </div>
            )}

          {/* Tamanho da Etiqueta */}
          <div className="config-group">
            <label>Tamanho da Etiqueta:</label>
            <div className="config-inline-group">
              <div>
                <label>Largura (mm):</label>
                <input
                  type="number"
                  value={configuracao.etiqueta.largura}
                  onChange={(e) =>
                    atualizarConfiguracaoEtiqueta(
                      "largura",
                      Number(e.target.value),
                    )
                  }
                  min={20}
                  max={150}
                />
              </div>
              <div>
                <label>Altura (mm):</label>
                <input
                  type="number"
                  value={configuracao.etiqueta.altura}
                  onChange={(e) =>
                    atualizarConfiguracaoEtiqueta(
                      "altura",
                      Number(e.target.value),
                    )
                  }
                  min={15}
                  max={100}
                />
              </div>
              <div>
                <label>DPI:</label>
                <select
                  value={configuracao.etiqueta.dpi}
                  onChange={(e) =>
                    atualizarConfiguracaoEtiqueta("dpi", Number(e.target.value))
                  }
                >
                  <option value={203}>203 dpi</option>
                  <option value={300}>300 dpi</option>
                  <option value={600}>600 dpi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orientação */}
          <div className="config-group">
            <label>Orientação:</label>
            <div className="config-radio-group">
              <label className="config-radio">
                <input
                  type="radio"
                  name="orientacao"
                  value="retrato"
                  checked={configuracao.orientacao === "retrato"}
                  onChange={(e) =>
                    atualizarConfiguracao("orientacao", e.target.value)
                  }
                />
                <span>📱 Retrato (101.6 x 152.4mm)</span>
              </label>
              <label className="config-radio">
                <input
                  type="radio"
                  name="orientacao"
                  value="paisagem"
                  checked={configuracao.orientacao === "paisagem"}
                  onChange={(e) =>
                    atualizarConfiguracao("orientacao", e.target.value)
                  }
                />
                <span>🖼️ Paisagem (152.4 x 101.6mm)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="config-impressora-footer">
          <button
            className="btn-secondary"
            onClick={() => setMostrarPreviewComandos(!mostrarPreviewComandos)}
          >
            <FiCode size={14} />
            {mostrarPreviewComandos ? "Ocultar Comandos" : "Ver Comandos"}
          </button>
          <button
            className="btn-primary"
            onClick={() => setMostrarConfig(false)}
          >
            Fechar
          </button>
        </div>

        {/* Preview dos comandos */}
        {mostrarPreviewComandos && (
          <div
            className="preview-comandos"
            dangerouslySetInnerHTML={{ __html: obterPreviewComandos() }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-cracha-overlay" onClick={onClose}>
      <div
        className="modal-cracha-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-cracha-header">
          <h2>Crachá de Visitante</h2>
          <div className="modal-header-actions">
            <button
              className="btn-icon"
              onClick={() => setMostrarConfig(true)}
              title="Configurar Impressora"
            >
              <FiSettings size={18} />
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Preview do Crachá */}
        <div className="modal-cracha-body">
          <p className="preview-label">Pré-visualização do crachá:</p>

          <div className="badge-preview" ref={printRef}>
            <div className="badge-preview-header">
              <img src={logo} alt="Logo" className="badge-preview-logo" />
              <span className="badge-preview-title">VISITANTE</span>
            </div>

            <div className="badge-preview-content">
              <div className="badge-preview-nome">{badgeData.nome}</div>
              <div className="badge-preview-empresa">{badgeData.empresa}</div>
              <div className="badge-preview-setor">{badgeData.setor}</div>
            </div>

            <div className="badge-preview-footer">
              <span className="badge-preview-date">
                {currentDate} - {currentTime}
              </span>
            </div>
          </div>

          <div className="badge-info">
            <p>
              <strong>Tamanho:</strong> {configuracao.etiqueta.largura}mm x{" "}
              {configuracao.etiqueta.altura}mm
            </p>
            <p>
              <strong>Linguagem:</strong> {configuracao.linguagem}
              {configuracao.linguagem !== LINGUAGENS_IMPRESSORA.HTML && (
                <span> ({configuracao.metodoEnvio})</span>
              )}
            </p>
          </div>

          {/* Status da impressão */}
          {statusImpressao && (
            <div
              className={`status-impressao ${statusImpressao.includes("❌") ? "erro" : statusImpressao.includes("✅") ? "sucesso" : "info"}`}
            >
              {statusImpressao}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-cracha-footer">
          <button className="btn-primary" onClick={handlePrint}>
            <FiPrinter size={16} />
            Imprimir Crachá
          </button>
          <button className="btn-modal-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>

      {/* Modal de Configuração */}
      {mostrarConfig && renderModalConfiguracao()}
    </div>
  );
}
