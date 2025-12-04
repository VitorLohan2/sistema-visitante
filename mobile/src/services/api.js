import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: process.env.API_URL || "http://localhost:3333", // Substitua pelo seu IP real baseURL: process.env.API_URL || 'http://localhost:3333' / baseURL: 'https://sistema-visitante.onrender.com'
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptores com logs detalhados
api.interceptors.request.use(
  async (config) => {
    try {
      // Tenta pegar o token (seguindo padrão frontend)
      const token = await AsyncStorage.getItem("@Auth:token");

      // Se não tiver token, tenta pegar o ongId (padrão antigo)
      const ongId = token || (await AsyncStorage.getItem("@Auth:ongId"));

      console.log("📡 Requisição para:", {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL}${config.url}`,
        hasAuth: !!ongId,
        authType: token ? "Bearer token" : "ongId",
        isFormData: config.data instanceof FormData,
      });

      if (ongId) {
        // IMPORTANTE: Frontend web usa "Bearer" prefix
        // Verifique qual o backend espera
        if (token) {
          // Se tem token salvo (como frontend web)
          config.headers.Authorization = `Bearer ${ongId}`;
        } else {
          // Se tem apenas ongId (padrão antigo)
          config.headers.Authorization = ongId;
        }

        // Para FormData, NÃO defina Content-Type manualmente
        if (!(config.data instanceof FormData)) {
          config.headers["Content-Type"] = "application/json";
        }
      }

      return config;
    } catch (error) {
      console.log("❌ Erro no interceptor:", error);
      return config;
    }
  },
  (error) => {
    console.error("Erro no interceptor de requisição:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log("✅ Resposta recebida:", {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      responseData: error.response?.data,
    };

    console.error("❌ Erro na resposta:", errorDetails);

    if (error.response?.status === 401) {
      AsyncStorage.multiRemove(["@Auth:ongId", "@Auth:ongName", "@Auth:token"]);
    }

    return Promise.reject(error);
  }
);

export default api;
