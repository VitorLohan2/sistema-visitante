/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Header
 * Cabeçalho de página com navegação
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { cores, tipografia, espacamento } from "../../styles/tema";

/**
 * Cabeçalho de página
 *
 * @param {string} titulo - Título da página
 * @param {boolean} mostrarVoltar - Exibe botão voltar
 * @param {function} onVoltar - Callback personalizado para voltar
 * @param {ReactNode} acaoDireita - Componente de ação à direita
 * @param {string} variante - "claro" | "escuro"
 */
export function Header({
  titulo,
  mostrarVoltar = true,
  onVoltar,
  acaoDireita,
  variante = "escuro",
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleVoltar = () => {
    if (onVoltar) {
      onVoltar();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const estiloVariante = variante === "escuro" ? styles.escuro : styles.claro;
  const corIcone = variante === "escuro" ? cores.branco : cores.texto;
  const corTexto = variante === "escuro" ? cores.branco : cores.texto;

  return (
    <View
      style={[styles.container, estiloVariante, { paddingTop: insets.top }]}
    >
      <StatusBar
        barStyle={variante === "escuro" ? "light-content" : "dark-content"}
        backgroundColor={variante === "escuro" ? cores.primaria : cores.branco}
      />

      <View style={styles.conteudo}>
        {/* Botão Voltar */}
        <View style={styles.esquerda}>
          {mostrarVoltar && (
            <TouchableOpacity
              style={styles.botaoVoltar}
              onPress={handleVoltar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={24} color={corIcone} />
            </TouchableOpacity>
          )}
        </View>

        {/* Título */}
        <View style={styles.centro}>
          <Text style={[styles.titulo, { color: corTexto }]} numberOfLines={1}>
            {titulo}
          </Text>
        </View>

        {/* Ação Direita */}
        <View style={styles.direita}>{acaoDireita}</View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  escuro: {
    backgroundColor: cores.primaria,
  },

  claro: {
    backgroundColor: cores.branco,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },

  conteudo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.md,
    minHeight: 56,
  },

  esquerda: {
    width: 44,
    alignItems: "flex-start",
  },

  centro: {
    flex: 1,
    alignItems: "center",
  },

  direita: {
    width: 44,
    alignItems: "flex-end",
  },

  botaoVoltar: {
    padding: espacamento.xs,
  },

  titulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
  },
});

export default Header;
