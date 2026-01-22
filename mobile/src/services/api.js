/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVIÇO: API
 * Configuração do Axios para comunicação com o backend
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO BASE
// ═══════════════════════════════════════════════════════════════════════════════

// Obtém a URL da API do app.json > extra ou usa fallback
const API_URL =
  Constants.expoConfig?.extra?.API_URL || "http://192.168.137.1:3001";

// Log da URL sendo usada
if (__DEV__) {
  console.log("🔗 API URL configurada:", API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 segundos para uploads
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERCEPTOR DE REQUISIÇÃO
// Adiciona token de autenticação automaticamente
// ═══════════════════════════════════════════════════════════════════════════════

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("@Auth:token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Para FormData, deixa o axios definir o Content-Type
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      // Log em desenvolvimento
      if (__DEV__) {
        console.log("📡 Requisição:", {
          method: config.method?.toUpperCase(),
          url: `${config.baseURL}${config.url}`,
          hasAuth: !!token,
        });
      }

      return config;
    } catch (error) {
      console.error("❌ Erro no interceptor de requisição:", error);
      return config;
    }
  },
  (error) => {
    console.error("❌ Erro na requisição:", error);
    return Promise.reject(error);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// INTERCEPTOR DE RESPOSTA
// Trata erros e faz logout automático em 401
// ═══════════════════════════════════════════════════════════════════════════════

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log("✅ Resposta:", {
        url: response.config.url,
        status: response.status,
      });
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const mensagem = error.response?.data?.error || error.message;

    if (__DEV__) {
      console.error("❌ Erro na resposta:", {
        url: error.config?.url,
        status,
        mensagem,
      });
    }

    // Token expirado ou inválido - limpa dados de autenticação
    if (status === 401) {
      await AsyncStorage.multiRemove(["@Auth:token", "@Auth:usuario"]);
    }

    return Promise.reject(error);
  },
);

export default api;
