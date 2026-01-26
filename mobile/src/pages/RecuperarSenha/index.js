/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Recuperar Senha
 * Tela para solicitar recuperação de senha
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { Button, Input, Loading } from "../../components";

// Serviços
import authService from "../../services/authService";

// Estilos
import { cores, tipografia, espacamento, bordas } from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function RecuperarSenha() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Estados
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Solicita recuperação de senha
   */
  async function handleRecuperar() {
    // Validação
    if (!email.trim()) {
      setErro("Informe seu email");
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErro("Informe um email válido");
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      await authService.recuperarSenha(email);
      setEnviado(true);
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      const mensagemErro =
        error.response?.data?.error ||
        "Erro ao solicitar recuperação. Tente novamente.";
      setErro(mensagemErro);
    } finally {
      setCarregando(false);
    }
  }

  /**
   * Volta para o login
   */
  function handleVoltar() {
    navigation.goBack();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - SUCESSO
  // ═══════════════════════════════════════════════════════════════════════════

  if (enviado) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={cores.fundoPagina}
        />

        {/* Header Padronizado - Variante Clara */}
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.texto} />
          </TouchableOpacity>

          <Text style={styles.headerTituloClaro}>Recuperar Senha</Text>

          <View style={styles.headerEspaco} />
        </View>

        <View style={styles.sucessoContainer}>
          <View style={styles.sucessoIcone}>
            <Feather name="check-circle" size={64} color={cores.sucesso} />
          </View>

          <Text style={styles.sucessoTitulo}>Email Enviado!</Text>

          <Text style={styles.sucessoTexto}>
            Enviamos um link de recuperação para{"\n"}
            <Text style={styles.sucessoEmail}>{email}</Text>
          </Text>

          <Text style={styles.sucessoInstrucao}>
            Verifique sua caixa de entrada e siga as instruções para redefinir
            sua senha.
          </Text>

          <Button
            texto="Voltar ao Login"
            variante="destaque"
            tamanho="grande"
            onPress={handleVoltar}
            estilo={styles.botaoVoltar}
          />
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - FORMULÁRIO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={cores.fundoPagina} />

      {/* Header Padronizado - Variante Clara */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.texto} />
        </TouchableOpacity>

        <Text style={styles.headerTituloClaro}>Recuperar Senha</Text>

        <View style={styles.headerEspaco} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Ícone */}
          <View style={styles.iconeContainer}>
            <Feather name="lock" size={48} color={cores.destaque} />
          </View>

          <Text style={styles.titulo}>Esqueceu sua senha?</Text>

          <Text style={styles.descricao}>
            Não se preocupe! Informe seu email cadastrado e enviaremos um link
            para redefinir sua senha.
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

          {/* Botão Recuperar */}
          <Button
            texto="Enviar Link de Recuperação"
            variante="destaque"
            tamanho="grande"
            onPress={handleRecuperar}
            carregando={carregando}
            estilo={styles.botaoRecuperar}
          />

          {/* Link Voltar */}
          <Button
            texto="Voltar ao Login"
            variante="ghost"
            onPress={handleVoltar}
            estilo={styles.linkVoltar}
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

  // Header Padronizado - Variante Clara
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
    backgroundColor: cores.fundoPagina,
  },

  headerVoltar: {
    padding: espacamento.xs,
  },

  headerTituloClaro: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  headerEspaco: {
    width: 40,
  },

  scrollContent: {
    flexGrow: 1,
    padding: espacamento.lg,
  },

  formContainer: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.lg,
    paddingTop: espacamento.xl,
  },

  iconeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: cores.destaque + "15",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: espacamento.lg,
  },

  titulo: {
    fontSize: tipografia.tamanhoTitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.sm,
  },

  descricao: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    textAlign: "center",
    lineHeight: 22,
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

  botaoRecuperar: {
    marginTop: espacamento.md,
  },

  linkVoltar: {
    marginTop: espacamento.md,
  },

  // Sucesso
  sucessoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: espacamento.xl,
  },

  sucessoIcone: {
    marginBottom: espacamento.lg,
  },

  sucessoTitulo: {
    fontSize: tipografia.tamanhoTitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.sucesso,
    marginBottom: espacamento.md,
  },

  sucessoTexto: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.sm,
  },

  sucessoEmail: {
    fontWeight: tipografia.pesoBold,
    color: cores.destaque,
  },

  sucessoInstrucao: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    textAlign: "center",
    lineHeight: 22,
    marginTop: espacamento.md,
  },

  botaoVoltar: {
    marginTop: espacamento.xl,
  },
});
