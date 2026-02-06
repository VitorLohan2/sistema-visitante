/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVIÇO DE IMPRESSORA DE ETIQUETAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Suporta múltiplas linguagens de impressora:
 * - ZPL/ZPL II (Zebra Programming Language)
 * - DPL (Datamax Programming Language - Honeywell)
 * - ESC/POS (Epson Standard Code)
 * - CPCL (Comtec Printer Control Language)
 *
 * Compatível com impressoras:
 * - Honeywell PC42E-T (DPL, ZPL, EPL)
 * - Zebra (ZPL, EPL, CPCL)
 * - Datamax (DPL)
 * - Epson, TSC, etc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import logger from "../utils/logger";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES E CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Linguagens de impressora suportadas
 */
export const LINGUAGENS_IMPRESSORA = {
  ZPL: "ZPL", // Zebra Programming Language
  DPL: "DPL", // Datamax/Honeywell Programming Language
  ESCPOS: "ESCPOS", // ESC/POS (Epson)
  CPCL: "CPCL", // Comtec Printer Control Language
  HTML: "HTML", // Impressão via navegador (fallback)
};

/**
 * Configurações padrão de etiqueta (em mm)
 */
export const CONFIGURACOES_ETIQUETA = {
  largura: 101.6, // mm (4")
  altura: 152.4, // mm (6")
  dpi: 203, // dots per inch (padrão para PC42E-T)
  margemEsquerda: 2,
  margemTopo: 2,
};

/**
 * Converte mm para dots baseado no DPI
 * @param {number} mm - Valor em milímetros
 * @param {number} dpi - DPI da impressora
 * @returns {number} Valor em dots
 */
export function mmParaDots(mm, dpi = 203) {
  // 1 polegada = 25.4mm
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Formata data para exibição
 * @param {Date} data - Data a formatar
 * @returns {string} Data formatada
 */
function formatarData(data = new Date()) {
  return data.toLocaleDateString("pt-BR");
}

/**
 * Formata hora para exibição
 * @param {Date} data - Data a formatar
 * @returns {string} Hora formatada
 */
function formatarHora(data = new Date()) {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR ZPL (Zebra Programming Language)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera código ZPL para crachá de visitante
 *
 * Comandos ZPL principais:
 * ^XA = Início do label
 * ^XZ = Fim do label
 * ^FO = Field Origin (posição X,Y)
 * ^FD = Field Data (dados do campo)
 * ^FS = Field Separator (fim do campo)
 * ^CF = Change Font
 * ^GB = Graphic Box (desenhar linha/caixa)
 * ^PW = Print Width (largura de impressão)
 * ^LL = Label Length (altura da etiqueta)
 *
 * @param {object} dados - Dados do crachá
 * @param {object} config - Configurações da etiqueta
 * @returns {string} Código ZPL
 */
export function gerarZPL(dados, config = CONFIGURACOES_ETIQUETA) {
  const larguraDots = mmParaDots(config.largura, config.dpi);
  const alturaDots = mmParaDots(config.altura, config.dpi);
  const margemX = mmParaDots(config.margemEsquerda, config.dpi);
  const margemY = mmParaDots(config.margemTopo, config.dpi);

  const nome = (dados.nome || "").substring(0, 30).toUpperCase();
  const empresa = (dados.empresa || "").substring(0, 25).toUpperCase();
  const setor = (dados.setor || "").substring(0, 25);
  const dataHora = `${formatarData()} - ${formatarHora()}`;

  // Posições calculadas
  const centroX = Math.round(larguraDots / 2);
  const posicaoTitulo = margemY + 10;
  const posicaoNome = posicaoTitulo + 50;
  const posicaoEmpresa = posicaoNome + 45;
  const posicaoSetor = posicaoEmpresa + 35;
  const posicaoData = alturaDots - 30;

  return `^XA
^CI28
^PW${larguraDots}
^LL${alturaDots}
^LH0,0

; ══════════════════════════════════════
; TITULO: VISITANTE
; ══════════════════════════════════════
^CF0,28
^FO${margemX + 10},${posicaoTitulo}
^FB${larguraDots - margemX * 2},1,0,C,0
^FDVISITANTE^FS

; Linha separadora superior
^FO${margemX},${posicaoTitulo + 35}
^GB${larguraDots - margemX * 2},2,2^FS

; ══════════════════════════════════════
; NOME DO VISITANTE
; ══════════════════════════════════════
^CF0,36
^FO${margemX + 10},${posicaoNome}
^FB${larguraDots - margemX * 2},1,0,C,0
^FD${nome}^FS

; ══════════════════════════════════════
; EMPRESA
; ══════════════════════════════════════
^CF0,24
^FO${margemX + 10},${posicaoEmpresa}
^FB${larguraDots - margemX * 2},1,0,C,0
^FD${empresa}^FS

; ══════════════════════════════════════
; SETOR
; ══════════════════════════════════════
^CF0,20
^FO${margemX + 10},${posicaoSetor}
^FB${larguraDots - margemX * 2},1,0,C,0
^FD${setor}^FS

; Linha separadora inferior
^FO${margemX},${posicaoData - 15}
^GB${larguraDots - margemX * 2},1,1^FS

; ══════════════════════════════════════
; DATA E HORA
; ══════════════════════════════════════
^CF0,16
^FO${margemX + 10},${posicaoData}
^FB${larguraDots - margemX * 2},1,0,C,0
^FD${dataHora}^FS

^XZ`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR DPL (Datamax/Honeywell Programming Language)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera código DPL para crachá de visitante
 *
 * Comandos DPL principais:
 * <STX>L = Início do label
 * E = Fim do label (e print)
 * H = Posição horizontal
 * V = Posição vertical
 * A = Texto alfanumérico
 * 1 = Font
 * Lo = Line (desenhar linha)
 *
 * @param {object} dados - Dados do crachá
 * @param {object} config - Configurações da etiqueta
 * @returns {string} Código DPL
 */
export function gerarDPL(dados, config = CONFIGURACOES_ETIQUETA) {
  const STX = "\x02"; // Start of Text
  const larguraDots = mmParaDots(config.largura, config.dpi);
  const alturaDots = mmParaDots(config.altura, config.dpi);

  const nome = (dados.nome || "").substring(0, 30).toUpperCase();
  const empresa = (dados.empresa || "").substring(0, 25).toUpperCase();
  const setor = (dados.setor || "").substring(0, 25);
  const dataHora = `${formatarData()} - ${formatarHora()}`;

  // Posições (origem bottom-left no DPL)
  const centroX = Math.round(larguraDots / 2) - 50;
  const posicaoTitulo = alturaDots - 40;
  const posicaoNome = alturaDots - 100;
  const posicaoEmpresa = alturaDots - 150;
  const posicaoSetor = alturaDots - 190;
  const posicaoData = 30;

  return `${STX}L
D11
H20
; ══════════════════════════════════════
; TITULO: VISITANTE
; ══════════════════════════════════════
1911A0020${String(posicaoTitulo).padStart(4, "0")}VISITANTE
; Linha separadora
Lo0015${String(posicaoTitulo - 20).padStart(4, "0")}${larguraDots - 30}0002

; ══════════════════════════════════════
; NOME DO VISITANTE
; ══════════════════════════════════════
1911A0020${String(posicaoNome).padStart(4, "0")}${nome}

; ══════════════════════════════════════
; EMPRESA
; ══════════════════════════════════════
1711A0020${String(posicaoEmpresa).padStart(4, "0")}${empresa}

; ══════════════════════════════════════
; SETOR
; ══════════════════════════════════════
1511A0020${String(posicaoSetor).padStart(4, "0")}${setor}

; Linha separadora inferior
Lo0015${String(posicaoData + 25).padStart(4, "0")}${larguraDots - 30}0001

; ══════════════════════════════════════
; DATA E HORA
; ══════════════════════════════════════
1311A0020${String(posicaoData).padStart(4, "0")}${dataHora}
Q0001
E`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR ESC/POS (Epson Standard Code)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera código ESC/POS para crachá de visitante
 *
 * Comandos ESC/POS principais:
 * ESC @ = Inicializa impressora
 * ESC a n = Alinhamento (0=esquerda, 1=centro, 2=direita)
 * ESC E n = Negrito on/off
 * ESC ! n = Modo de impressão (tamanho, etc)
 * GS V = Corte de papel
 * LF = Line feed
 *
 * @param {object} dados - Dados do crachá
 * @param {object} config - Configurações da etiqueta
 * @returns {string} Código ESC/POS (como array de bytes seria mais preciso, mas retornamos string)
 */
export function gerarESCPOS(dados, config = CONFIGURACOES_ETIQUETA) {
  const ESC = "\x1B";
  const GS = "\x1D";
  const LF = "\x0A";

  const nome = (dados.nome || "").substring(0, 30).toUpperCase();
  const empresa = (dados.empresa || "").substring(0, 25).toUpperCase();
  const setor = (dados.setor || "").substring(0, 25);
  const dataHora = `${formatarData()} - ${formatarHora()}`;

  // ESC/POS é mais usado para recibos, adaptamos para etiqueta
  const comandos = [
    `${ESC}@`, // Inicializa impressora
    `${ESC}a\x01`, // Centraliza texto

    // Título VISITANTE (negrito, tamanho duplo)
    `${ESC}E\x01`, // Negrito ON
    `${ESC}!\x30`, // Tamanho duplo altura e largura
    `VISITANTE${LF}`,
    `${ESC}!\x00`, // Tamanho normal

    // Linha separadora
    `--------------------------------${LF}`,

    // Nome (negrito)
    `${ESC}!\x10`, // Tamanho duplo altura
    `${nome}${LF}`,
    `${ESC}!\x00`, // Tamanho normal
    `${ESC}E\x00`, // Negrito OFF

    // Empresa
    `${LF}${empresa}${LF}`,

    // Setor
    `${setor}${LF}`,

    // Linha separadora
    `--------------------------------${LF}`,

    // Data e hora
    `${dataHora}${LF}`,

    // Espaçamento final e corte
    `${LF}${LF}`,
    `${GS}V\x00`, // Corte total
  ];

  return comandos.join("");
}

/**
 * Gera código ESC/POS como array de bytes (para envio direto)
 * @param {object} dados - Dados do crachá
 * @param {object} config - Configurações da etiqueta
 * @returns {Uint8Array} Bytes ESC/POS
 */
export function gerarESCPOSBytes(dados, config = CONFIGURACOES_ETIQUETA) {
  const str = gerarESCPOS(dados, config);
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR CPCL (Comtec Printer Control Language)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera código CPCL para crachá de visitante
 *
 * Comandos CPCL principais:
 * ! offset 200 200 altura quantidade = Início do label
 * TEXT font size x y dados = Texto
 * LINE x0 y0 x1 y1 largura = Desenha linha
 * PRINT = Imprime
 *
 * @param {object} dados - Dados do crachá
 * @param {object} config - Configurações da etiqueta
 * @returns {string} Código CPCL
 */
export function gerarCPCL(dados, config = CONFIGURACOES_ETIQUETA) {
  const larguraDots = mmParaDots(config.largura, config.dpi);
  const alturaDots = mmParaDots(config.altura, config.dpi);

  const nome = (dados.nome || "").substring(0, 30).toUpperCase();
  const empresa = (dados.empresa || "").substring(0, 25).toUpperCase();
  const setor = (dados.setor || "").substring(0, 25);
  const dataHora = `${formatarData()} - ${formatarHora()}`;

  // Posições
  const centroX = 10;
  const posicaoTitulo = 20;
  const posicaoNome = 80;
  const posicaoEmpresa = 140;
  const posicaoSetor = 185;
  const posicaoData = alturaDots - 45;

  return `! 0 200 200 ${alturaDots} 1
; ══════════════════════════════════════
; CRACHÁ DE VISITANTE
; ══════════════════════════════════════

; Título
CENTER
TEXT 4 3 0 ${posicaoTitulo} VISITANTE

; Linha separadora superior
LINE 10 ${posicaoTitulo + 40} ${larguraDots - 10} ${posicaoTitulo + 40} 2

; Nome do visitante
TEXT 4 2 0 ${posicaoNome} ${nome}

; Empresa
LEFT
TEXT 4 1 ${centroX} ${posicaoEmpresa} ${empresa}

; Setor
TEXT 4 0 ${centroX} ${posicaoSetor} ${setor}

; Linha separadora inferior
LINE 10 ${posicaoData - 15} ${larguraDots - 10} ${posicaoData - 15} 1

; Data e hora
CENTER
TEXT 4 0 0 ${posicaoData} ${dataHora}

FORM
PRINT
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL - GERAR COMANDOS DE IMPRESSÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera comandos de impressão na linguagem especificada
 *
 * @param {object} dados - Dados do crachá {nome, empresa, setor}
 * @param {string} linguagem - Linguagem de impressora (ZPL, DPL, ESCPOS, CPCL, HTML)
 * @param {object} config - Configurações opcionais da etiqueta
 * @returns {string} Comandos de impressão ou HTML
 */
export function gerarComandosImpressao(
  dados,
  linguagem = LINGUAGENS_IMPRESSORA.ZPL,
  config = CONFIGURACOES_ETIQUETA,
) {
  logger.log(`📠 Gerando comandos de impressão em ${linguagem}...`);

  switch (linguagem.toUpperCase()) {
    case LINGUAGENS_IMPRESSORA.ZPL:
      return gerarZPL(dados, config);

    case LINGUAGENS_IMPRESSORA.DPL:
      return gerarDPL(dados, config);

    case LINGUAGENS_IMPRESSORA.ESCPOS:
      return gerarESCPOS(dados, config);

    case LINGUAGENS_IMPRESSORA.CPCL:
      return gerarCPCL(dados, config);

    case LINGUAGENS_IMPRESSORA.HTML:
    default:
      logger.log("📠 Usando modo HTML (fallback)");
      return null; // Retorna null para indicar uso do método HTML
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MÉTODOS DE ENVIO PARA IMPRESSORA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detecta se a API WebUSB está disponível
 * @returns {boolean}
 */
export function webUSBDisponivel() {
  return "usb" in navigator;
}

/**
 * Conecta a uma impressora via WebUSB
 * @returns {Promise<USBDevice|null>}
 */
export async function conectarImpressoraUSB() {
  if (!webUSBDisponivel()) {
    logger.warn("⚠️ WebUSB não disponível neste navegador");
    return null;
  }

  try {
    // Filtros para impressoras comuns
    const dispositivo = await navigator.usb.requestDevice({
      filters: [
        // Honeywell
        { vendorId: 0x0536 }, // Honeywell
        { vendorId: 0x0c2e }, // Honeywell (Metrologic)
        // Zebra
        { vendorId: 0x0a5f }, // Zebra
        { vendorId: 0x05e0 }, // Zebra (Symbol)
        // Datamax
        { vendorId: 0x0b91 }, // Datamax-O'Neil
        // Epson
        { vendorId: 0x04b8 }, // Epson
        // TSC
        { vendorId: 0x1203 }, // TSC
        // Brother
        { vendorId: 0x04f9 }, // Brother
      ],
    });

    await dispositivo.open();
    logger.log("✅ Impressora conectada via USB:", dispositivo.productName);
    return dispositivo;
  } catch (erro) {
    logger.warn("⚠️ Erro ao conectar impressora USB:", erro.message);
    return null;
  }
}

/**
 * Envia comandos para impressora via WebUSB
 * @param {USBDevice} dispositivo - Dispositivo USB conectado
 * @param {string} comandos - Comandos de impressão
 * @returns {Promise<boolean>}
 */
export async function enviarParaImpressoraUSB(dispositivo, comandos) {
  if (!dispositivo) {
    logger.error("❌ Dispositivo USB não conectado");
    return false;
  }

  try {
    // Seleciona a configuração e interface
    if (dispositivo.configuration === null) {
      await dispositivo.selectConfiguration(1);
    }

    // Procura a interface de impressão
    const interfaceNumero = 0;
    await dispositivo.claimInterface(interfaceNumero);

    // Procura o endpoint de saída (OUT)
    const interfaceAlternativa =
      dispositivo.configuration.interfaces[interfaceNumero].alternate;
    const endpointSaida = interfaceAlternativa.endpoints.find(
      (ep) => ep.direction === "out",
    );

    if (!endpointSaida) {
      throw new Error("Endpoint de saída não encontrado");
    }

    // Converte comandos para bytes
    const encoder = new TextEncoder();
    const dados = encoder.encode(comandos);

    // Envia os dados
    await dispositivo.transferOut(endpointSaida.endpointNumber, dados);

    logger.log("✅ Comandos enviados para impressora via USB");
    return true;
  } catch (erro) {
    logger.error("❌ Erro ao enviar para impressora USB:", erro.message);
    return false;
  }
}

/**
 * Imprime via Raw Socket (requer servidor intermediário ou configuração especial)
 * Esta função prepara os dados para envio via API do backend
 *
 * @param {string} comandos - Comandos de impressão
 * @param {string} enderecoIP - IP da impressora
 * @param {number} porta - Porta (padrão: 9100 para RAW)
 * @returns {object} Objeto com dados para o backend
 */
export function prepararImpressaoRede(comandos, enderecoIP, porta = 9100) {
  return {
    enderecoIP,
    porta,
    comandos,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO E PERSISTÊNCIA
// ═══════════════════════════════════════════════════════════════════════════

const CHAVE_CONFIG_IMPRESSORA = "config_impressora";

/**
 * Carrega configuração da impressora do localStorage
 * @returns {object}
 */
export function carregarConfiguracaoImpressora() {
  try {
    const configStr = localStorage.getItem(CHAVE_CONFIG_IMPRESSORA);
    if (configStr) {
      const config = JSON.parse(configStr);
      // Garante que a orientação existe (migração de config antigas)
      if (!config.orientacao) {
        config.orientacao = "retrato";
      }
      return config;
    }
  } catch (erro) {
    logger.warn("⚠️ Erro ao carregar configuração da impressora:", erro);
  }

  // Configuração padrão
  return {
    linguagem: LINGUAGENS_IMPRESSORA.HTML,
    etiqueta: { ...CONFIGURACOES_ETIQUETA },
    metodoEnvio: "navegador", // "navegador", "usb", "rede"
    orientacao: "retrato", // "retrato" ou "paisagem"
    enderecoIP: "",
    porta: 9100,
  };
}

/**
 * Salva configuração da impressora no localStorage
 * @param {object} config - Configuração a salvar
 */
export function salvarConfiguracaoImpressora(config) {
  try {
    localStorage.setItem(CHAVE_CONFIG_IMPRESSORA, JSON.stringify(config));
    logger.log("✅ Configuração da impressora salva");
  } catch (erro) {
    logger.error("❌ Erro ao salvar configuração da impressora:", erro);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW DOS COMANDOS (para debug)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera um preview visual dos comandos (para debug)
 * @param {string} comandos - Comandos de impressão
 * @param {string} linguagem - Linguagem dos comandos
 * @returns {string} HTML com preview formatado
 */
export function gerarPreviewComandos(comandos, linguagem) {
  const escapado = comandos
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\x02/g, "[STX]")
    .replace(/\x1B/g, "[ESC]")
    .replace(/\x1D/g, "[GS]")
    .replace(/\x0A/g, "[LF]\n");

  return `
    <div style="font-family: monospace; font-size: 12px; background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 4px; white-space: pre-wrap; max-height: 400px; overflow: auto;">
      <div style="color: #6a9955; margin-bottom: 10px;">// Linguagem: ${linguagem}</div>
      ${escapado}
    </div>
  `;
}

export default {
  // Constantes
  LINGUAGENS_IMPRESSORA,
  CONFIGURACOES_ETIQUETA,

  // Geradores
  gerarZPL,
  gerarDPL,
  gerarESCPOS,
  gerarESCPOSBytes,
  gerarCPCL,
  gerarComandosImpressao,

  // USB
  webUSBDisponivel,
  conectarImpressoraUSB,
  enviarParaImpressoraUSB,

  // Rede
  prepararImpressaoRede,

  // Configuração
  carregarConfiguracaoImpressora,
  salvarConfiguracaoImpressora,

  // Utilitários
  mmParaDots,
  gerarPreviewComandos,
};
