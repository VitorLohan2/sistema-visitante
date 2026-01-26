/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Loading
 * Indicador de carregamento
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { cores, tipografia, espacamento } from "../../styles/tema";

/**
 * Indicador de carregamento
 *
 * @param {string} mensagem - Mensagem opcional
 * @param {string} texto - Alias para mensagem
 * @param {string} tamanho - "pequeno" | "medio" | "grande"
 * @param {boolean} telaCheia - Ocupa tela inteira
 * @param {string} cor - Cor do indicador
 */
export function Loading({
  mensagem,
  texto,
  tamanho = "grande",
  telaCheia = true,
  cor = cores.destaque,
}) {
  // Usa texto como alias para mensagem
  const textoExibido = mensagem || texto;

  const tamanhos = {
    pequeno: "small",
    medio: "small",
    grande: "large",
  };

  const Conteudo = (
    <View style={styles.conteudo}>
      <ActivityIndicator size={tamanhos[tamanho]} color={cor} />
      {textoExibido && <Text style={styles.mensagem}>{textoExibido}</Text>}
    </View>
  );

  if (telaCheia) {
    return <View style={styles.telaCheia}>{Conteudo}</View>;
  }

  return Conteudo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  telaCheia: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: cores.fundoPagina,
  },

  conteudo: {
    alignItems: "center",
    justifyContent: "center",
    padding: espacamento.lg,
  },

  mensagem: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
    textAlign: "center",
  },
});

export default Loading;
