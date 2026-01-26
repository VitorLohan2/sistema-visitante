/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Login
 * Tela de autenticação do usuário
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Button, Input, Loading } from "../../components";

// Contexto
import { useAuth } from "../../contexts";

// Estilos
import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

// Assets
import logoImg from "../../assets/logo.png";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Login() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  // Estados
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Realiza o login
   */
  async function handleLogin() {
    // Validações
    if (!email.trim()) {
      setErro("Informe seu email");
      return;
    }

    if (!senha.trim()) {
      setErro("Informe sua senha");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await login(email, senha);
      // Navegação será feita automaticamente pelo App.js quando autenticado mudar
    } catch (error) {
      console.error("Erro no login:", error);

      // Trata primeiro acesso (senha não definida)
      if (error.response?.data?.code === "PASSWORD_NOT_SET") {
        Alert.alert(
          "Primeiro Acesso",
          "Detectamos que este é seu primeiro acesso. Por favor, crie uma senha.",
          [
            {
              text: "Criar Senha",
              onPress: () =>
                navigation.navigate("CriarSenha", {
                  userId: error.response?.data?.userId,
                }),
            },
          ]
        );
        return;
      }

      const mensagemErro =
        error.response?.data?.error || "Erro ao fazer login. Tente novamente.";
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Navega para recuperar senha
   */
  function handleRecuperarSenha() {
    navigation.navigate("RecuperarSenha");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
    return <Loading mensagem="Entrando..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + espacamento.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={logoImg} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Formulário */}
        <View style={styles.formContainer}>
          <Text style={styles.titulo}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitulo}>
            Entre com suas credenciais para continuar
          </Text>

          {/* Mensagem de Erro */}
          {erro ? (
            <View style={styles.erroContainer}>
              <Feather name="alert-circle" size={18} color={cores.erro} />
              <Text style={styles.erroTexto}>{erro}</Text>
            </View>
          ) : null}

          {/* Campo Email */}
          <Input
            label="Email"
            placeholder="seu@email.com"
            tipo="email"
            valor={email}
            onChangeText={setEmail}
            iconeEsquerda={
              <Feather name="mail" size={20} color={cores.cinzaEscuro} />
            }
          />

          {/* Campo Senha */}
          <Input
            label="Senha"
            placeholder="••••••••"
            tipo="senha"
            valor={senha}
            onChangeText={setSenha}
            iconeEsquerda={
              <Feather name="lock" size={20} color={cores.cinzaEscuro} />
            }
          />

          {/* Link Recuperar Senha */}
          <TouchableOpacity
            style={styles.linkRecuperar}
            onPress={handleRecuperarSenha}
          >
            <Text style={styles.linkRecuperarTexto}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          {/* Botão Login */}
          <Button
            texto="Entrar"
            variante="destaque"
            tamanho="grande"
            onPress={handleLogin}
            estilo={styles.botaoLogin}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: espacamento.lg,
    paddingBottom: espacamento.xl,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: espacamento.xl,
  },

  logo: {
    width: 150,
    height: 80,
  },

  formContainer: {
    flex: 1,
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.lg,
    paddingTop: espacamento.xl,
  },

  titulo: {
    fontSize: tipografia.tamanhoTitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.sm,
  },

  subtitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    textAlign: "center",
    marginBottom: espacamento.lg,
  },

  erroContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.erroFundo,
    padding: espacamento.md,
    borderRadius: bordas.raioMedio,
    marginBottom: espacamento.md,
  },

  erroTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.erro,
    marginLeft: espacamento.sm,
  },

  linkRecuperar: {
    alignSelf: "flex-end",
    marginBottom: espacamento.lg,
  },

  linkRecuperarTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.destaque,
    fontWeight: tipografia.pesoMedio,
  },

  botaoLogin: {
    marginTop: espacamento.md,
  },
});
