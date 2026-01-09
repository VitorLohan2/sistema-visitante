/**
 * Utilitários de formatação - evita repetição de código
 */

/**
 * Formata CPF para o padrão brasileiro (XXX.XXX.XXX-XX)
 * @param {string} valor - CPF com ou sem formatação
 * @returns {string} CPF formatado
 */
export const formatarCPF = (valor) => {
  if (!valor) return "";
  const limpo = valor.replace(/\D/g, "").slice(0, 11);
  const match = limpo.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : limpo;
};

/**
 * Formata telefone para o padrão brasileiro
 * @param {string} valor - Telefone com ou sem formatação
 * @returns {string} Telefone formatado (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export const formatarTelefone = (valor) => {
  if (!valor) return "";
  const limpo = valor.replace(/\D/g, "").slice(0, 11);
  if (limpo.length === 11) {
    return limpo.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (limpo.length === 10) {
    return limpo.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return limpo;
};

/**
 * Formata placa de veículo (antiga AAA-1234 ou Mercosul AAA1A23)
 * @param {string} valor - Placa com ou sem formatação
 * @returns {string} Placa formatada
 */
export const formatarPlaca = (valor) => {
  if (!valor) return "";
  const limpo = valor
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 7);

  // Formato antigo: AAA-1234
  if (/^[A-Z]{3}\d{4}$/.test(limpo)) {
    return limpo.replace(/([A-Z]{3})(\d{4})/, "$1-$2");
  }

  // Formato Mercosul: AAA1A23
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpo)) {
    return limpo;
  }

  return limpo;
};

/**
 * Formata data para exibição (DD/MM/YYYY HH:mm)
 * @param {string|Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatarData = (data) => {
  if (!data) return "";
  const dataObj = new Date(data);
  return dataObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formata data apenas (DD/MM/YYYY)
 * @param {string|Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatarDataSimples = (data) => {
  if (!data) return "";
  const dataObj = new Date(data);
  return dataObj.toLocaleDateString("pt-BR");
};

/**
 * Remove formatação de CPF
 * @param {string} cpf - CPF formatado
 * @returns {string} CPF apenas números
 */
export const limparCPF = (cpf) => {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
};

/**
 * Remove formatação de telefone
 * @param {string} telefone - Telefone formatado
 * @returns {string} Telefone apenas números
 */
export const limparTelefone = (telefone) => {
  if (!telefone) return "";
  return telefone.replace(/\D/g, "");
};

/**
 * Valida se CPF tem 11 dígitos
 * @param {string} cpf - CPF a validar
 * @returns {boolean} Se é válido
 */
export const validarCPF = (cpf) => {
  if (!cpf) return false;
  const limpo = cpf.replace(/\D/g, "");
  return limpo.length === 11;
};

/**
 * Valida se telefone tem 10 ou 11 dígitos
 * @param {string} telefone - Telefone a validar
 * @returns {boolean} Se é válido
 */
export const validarTelefone = (telefone) => {
  if (!telefone) return false;
  const limpo = telefone.replace(/\D/g, "");
  return limpo.length >= 10 && limpo.length <= 11;
};
