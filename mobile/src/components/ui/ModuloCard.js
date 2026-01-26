/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: ModuloCard
 * Card de módulo para tela Home
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

/**
 * Card de módulo da Home
 *
 * @param {ReactNode} icone - Ícone do módulo
 * @param {string} titulo - Título do módulo
 * @param {string} descricao - Descrição curta
 * @param {function} onPress - Callback ao pressionar
 * @param {boolean} emBreve - Indica se está em desenvolvimento
 * @param {string} corIcone - Cor de fundo do ícone
 */
export function ModuloCard({
  icone,
  titulo,
  descricao,
  onPress,
  emBreve = false,
  corIcone = cores.destaque,
}) {
  return (
    <TouchableOpacity
      style={[styles.container, emBreve && styles.containerEmBreve]}
      onPress={emBreve ? undefined : onPress}
      activeOpacity={emBreve ? 1 : 0.7}
      disabled={emBreve}
    >
      <View
        style={[styles.iconeContainer, { backgroundColor: corIcone + "15" }]}
      >
        {icone}
      </View>

      <Text style={styles.titulo} numberOfLines={2}>
        {titulo}
      </Text>

      <Text
        style={[styles.descricao, emBreve && styles.descricaoEmBreve]}
        numberOfLines={1}
      >
        {emBreve ? "(EM BREVE)" : descricao}
      </Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.md,
    alignItems: "center",
    justifyContent: "center",
    width: "47%",
    aspectRatio: 1,
    ...sombras.pequena,
  },

  containerEmBreve: {
    opacity: 0.6,
  },

  iconeContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacamento.md,
  },

  titulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.xs,
  },

  descricao: {
    fontSize: tipografia.tamanhoPequeno,
    color: cores.textoSecundario,
    textAlign: "center",
  },

  descricaoEmBreve: {
    color: cores.cinza,
    fontStyle: "italic",
  },
});

export default ModuloCard;
