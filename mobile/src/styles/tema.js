/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TEMA: Cores e Estilos
 * Definição centralizada de cores, tipografia e espaçamentos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const cores = {
  // Cores Primárias
  primaria: "#1A1A1A",
  primariaClara: "#333333",
  primariaEscura: "#000000",

  // Cores de Destaque (Verde - igual ao Frontend)
  destaque: "#22C55E",
  destaqueClara: "#4ADE80",
  destaqueEscura: "#16A34A",

  // Cores de Status
  sucesso: "#22C55E",
  sucessoClara: "#4ADE80",
  sucessoFundo: "#DCFCE7",

  erro: "#EF4444",
  erroClara: "#F87171",
  erroFundo: "#FEE2E2",

  alerta: "#F59E0B",
  alertaClara: "#FBBF24",
  alertaFundo: "#FEF3C7",

  info: "#3B82F6",
  infoClara: "#60A5FA",
  infoFundo: "#DBEAFE",

  // Cores Extras
  roxo: "#8B5CF6",
  roxoClaro: "#A78BFA",
  ciano: "#06B6D4",
  cianoClaro: "#22D3EE",

  // Neutras
  branco: "#FFFFFF",
  cinzaClaro: "#F5F5F5",
  cinzaMedio: "#E5E5E5",
  cinza: "#9CA3AF",
  cinzaEscuro: "#6B7280",
  texto: "#1F2937",
  textoSecundario: "#6B7280",
  textoTerciario: "#9CA3AF",
  textoClaro: "#9CA3AF",
  preto: "#000000",

  // Backgrounds
  fundoPagina: "#F8F9FA",
  fundoCard: "#FFFFFF",
  fundoInput: "#F5F5F5",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Bordas
  borda: "#E5E5E5",
  bordaFocada: "#22C55E",
};

export const tipografia = {
  // Tamanhos
  tamanhoTitulo: 24,
  tamanhoSubtitulo: 18,
  tamanhoTexto: 16,
  tamanhoTextoMedio: 14,
  tamanhoTextoPequeno: 12,
  tamanhoTextoMini: 10,
  tamanhoPequeno: 12,
  tamanhoMicro: 10,

  // Pesos
  pesoNormal: "400",
  pesoMedio: "500",
  pesoSemiBold: "600",
  pesoSemibold: "600",
  pesoBold: "700",
};

export const espacamento = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const bordas = {
  raio: 12,
  raioMedio: 8,
  raioPequeno: 4,
  raioGrande: 16,
  raioCircular: 9999,
  // Aliases
  medio: 8,
  pequeno: 4,
  grande: 16,
};

export const sombras = {
  pequena: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  media: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  grande: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
};
