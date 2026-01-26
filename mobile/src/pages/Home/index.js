/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Home
 * Tela principal com módulos do sistema
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Componentes
import { ModuloCard, Loading } from "../../components";

// Contexto e Hooks
import { useAuth } from "../../contexts";
import { usePermissoes } from "../../hooks";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// Serviços
import api from "../../services/api";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { usuario, logout } = useAuth();
  const { temAlgumaPermissao, carregando: carregandoPermissoes } =
    usePermissoes();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS PARA FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  const [modalFeedbackVisivel, setModalFeedbackVisivel] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [feedbackEnviado, setFeedbackEnviado] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAUDAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const obterSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  const primeiroNome = usuario?.nome?.split(" ")[0]?.toUpperCase() || "USUÁRIO";

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISSÕES DOS MÓDULOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Verifica se tem acesso ao módulo Sistema Visitante
  const temAcessoVisitante = temAlgumaPermissao([
    "cadastro_visualizar",
    "cadastro_criar",
    "cadastro_editar",
    "historico_visualizar",
    "agendamento_visualizar",
    "ticket_visualizar",
  ]);

  // Verifica se tem acesso ao módulo Vigilante
  const temAcessoVigilante = temAlgumaPermissao([
    "ronda_iniciar",
    "ronda_visualizar_historico",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVEGAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleNavegar = (modulo) => {
    switch (modulo) {
      case "visitante":
        navigation.navigate("SistemaVisitante");
        break;
      case "vigilante":
        navigation.navigate("MenuVigilante");
        break;
      default:
        break;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÃO LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleLogout = () => {
    Alert.alert("Sair do Sistema", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNÇÃO ENVIAR FEEDBACK
  // ═══════════════════════════════════════════════════════════════════════════

  const handleEnviarFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert("Atenção", "Digite sua ideia ou sugestão.");
      return;
    }

    setEnviandoFeedback(true);
    try {
      await api.post("/feedback/enviar", {
        mensagem: feedback,
        usuario_nome: usuario?.nome,
        usuario_email: usuario?.email,
      });

      setFeedbackEnviado(true);
      setFeedback("");

      // Fecha o modal após 2 segundos
      setTimeout(() => {
        setFeedbackEnviado(false);
        setModalFeedbackVisivel(false);
      }, 2000);
    } catch (erro) {
      console.error("Erro ao enviar feedback:", erro);
      Alert.alert(
        "Erro",
        "Não foi possível enviar o feedback. Tente novamente.",
      );
    } finally {
      setEnviandoFeedback(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregandoPermissoes) {
    return <Loading mensagem="Carregando..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity style={styles.headerLogout} onPress={handleLogout}>
          <Feather name="log-out" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Home</Text>

        <TouchableOpacity
          style={styles.headerChat}
          onPress={() =>
            Alert.alert(
              "Em Breve",
              "O chat de suporte estará disponível em breve!",
            )
          }
        >
          <Feather name="message-circle" size={24} color={cores.branco} />
          <View style={styles.headerChatBadge} />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Saudação */}
        <View style={styles.saudacaoContainer}>
          <Text style={styles.saudacao}>
            {obterSaudacao()}, <Text style={styles.nome}>{primeiroNome}</Text>
          </Text>
          <Text style={styles.bemVindo}>Bem-vindo ao Sistema Liberaê</Text>
        </View>

        {/* Grid de Módulos - Centralizado */}
        <View style={styles.modulosContainer}>
          <View style={styles.modulosGrid}>
            {/* Sistema Visitante */}
            <ModuloCard
              icone={<Feather name="users" size={28} color={cores.sucesso} />}
              titulo="SISTEMA VISITANTE"
              descricao="Gestão de Visitantes"
              corIcone={cores.sucesso}
              onPress={() => handleNavegar("visitante")}
            />

            {/* Vigilante */}
            <ModuloCard
              icone={
                <MaterialCommunityIcons
                  name="shield-account"
                  size={28}
                  color={cores.destaque}
                />
              }
              titulo="VIGILANTE"
              descricao="Ronda para Vigilante"
              corIcone={cores.destaque}
              onPress={() => handleNavegar("vigilante")}
            />

            {/* CFTV - Em Breve */}
            <ModuloCard
              icone={<Feather name="video" size={28} color={cores.info} />}
              titulo="CFTV"
              descricao="Câmeras"
              corIcone={cores.info}
              emBreve
            />

            {/* Control ID - Em Breve */}
            <ModuloCard
              icone={
                <Feather name="credit-card" size={28} color={cores.alerta} />
              }
              titulo="CONTROL ID"
              descricao="Controle de Acesso"
              corIcone={cores.alerta}
              emBreve
            />
          </View>
        </View>
      </ScrollView>

      {/* Botão Feedback - Fixo no Rodapé */}
      <View style={styles.feedbackWrapper}>
        <TouchableOpacity
          style={styles.feedbackContainer}
          onPress={() => setModalFeedbackVisivel(true)}
        >
          <Feather name="lightbulb" size={18} color={cores.alerta} />
          <Text style={styles.feedbackTexto}>Envie sua Ideia</Text>
          <Feather name="arrow-right" size={18} color={cores.texto} />
        </TouchableOpacity>
      </View>

      {/* Modal de Feedback */}
      <Modal
        visible={modalFeedbackVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalFeedbackVisivel(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcone}>
                <Feather name="send" size={24} color={cores.primaria} />
              </View>
              <Text style={styles.modalTitulo}>Envie sua Ideia</Text>
              <TouchableOpacity
                style={styles.modalFechar}
                onPress={() => setModalFeedbackVisivel(false)}
              >
                <Feather name="x" size={24} color={cores.textoSecundario} />
              </TouchableOpacity>
            </View>

            {/* Conteúdo do Modal */}
            {feedbackEnviado ? (
              <View style={styles.feedbackSucesso}>
                <View style={styles.feedbackSucessoIcone}>
                  <Feather
                    name="check-circle"
                    size={48}
                    color={cores.sucesso}
                  />
                </View>
                <Text style={styles.feedbackSucessoTitulo}>
                  Enviado com Sucesso!
                </Text>
                <Text style={styles.feedbackSucessoDescricao}>
                  Obrigado por compartilhar sua ideia conosco.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalDescricao}>
                  Ajude-nos a melhorar! Compartilhe suas sugestões e ideias para
                  novas funcionalidades.
                </Text>

                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Descreva sua ideia ou sugestão de melhoria..."
                  placeholderTextColor={cores.textoSecundario}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={feedback}
                  onChangeText={setFeedback}
                  editable={!enviandoFeedback}
                />

                <TouchableOpacity
                  style={[
                    styles.feedbackBotao,
                    (!feedback.trim() || enviandoFeedback) &&
                      styles.feedbackBotaoDesabilitado,
                  ]}
                  onPress={handleEnviarFeedback}
                  disabled={!feedback.trim() || enviandoFeedback}
                >
                  {enviandoFeedback ? (
                    <ActivityIndicator size="small" color={cores.branco} />
                  ) : (
                    <>
                      <Feather name="send" size={18} color={cores.branco} />
                      <Text style={styles.feedbackBotaoTexto}>
                        Enviar Feedback
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.primaria,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
  },

  headerLogout: {
    padding: espacamento.xs,
  },

  headerTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  headerChat: {
    padding: espacamento.xs,
    position: "relative",
  },

  headerChatBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.destaque,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  scrollContent: {
    padding: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },

  // Saudação
  saudacaoContainer: {
    marginBottom: espacamento.xl,
  },

  saudacao: {
    fontSize: 28,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  nome: {
    color: cores.texto,
  },

  bemVindo: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
  },

  // Container para centralizar o grid
  modulosContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 350,
  },

  // Grid de Módulos
  modulosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: espacamento.md,
    maxWidth: 360,
  },

  // Feedback Wrapper (fixo no rodapé)
  feedbackWrapper: {
    backgroundColor: cores.fundoPagina,
    paddingHorizontal: espacamento.lg,
    paddingBottom: espacamento.lg,
    paddingTop: espacamento.sm,
  },

  // Feedback Container
  feedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.md,
    gap: espacamento.sm,
    ...sombras.pequena,
  },

  feedbackTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.texto,
    fontWeight: tipografia.pesoMedio,
  },

  // Modal de Feedback
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: cores.fundoCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espacamento.lg,
    maxHeight: "80%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: espacamento.lg,
  },

  modalHeaderIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${cores.primaria}15`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: espacamento.sm,
  },

  modalTitulo: {
    flex: 1,
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  modalFechar: {
    padding: espacamento.xs,
  },

  modalDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    marginBottom: espacamento.md,
    lineHeight: 22,
  },

  feedbackInput: {
    backgroundColor: cores.fundoPagina,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    minHeight: 120,
    borderWidth: 1,
    borderColor: cores.borda,
    marginBottom: espacamento.md,
  },

  feedbackBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.primaria,
    borderRadius: bordas.raioMedio,
    padding: espacamento.md,
    gap: espacamento.sm,
  },

  feedbackBotaoDesabilitado: {
    opacity: 0.5,
  },

  feedbackBotaoTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.branco,
  },

  feedbackSucesso: {
    alignItems: "center",
    paddingVertical: espacamento.xl,
  },

  feedbackSucessoIcone: {
    marginBottom: espacamento.md,
  },

  feedbackSucessoTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.sucesso,
    marginBottom: espacamento.sm,
  },

  feedbackSucessoDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
  },
});
