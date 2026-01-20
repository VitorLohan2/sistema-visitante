/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: EmptyState
 * Estado vazio para listas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { cores, tipografia, espacamento } from "../../styles/tema";
import Button from "./Button";

/**
 * Estado vazio
 *
 * @param {string} icone - Nome do ícone Feather
 * @param {string} titulo - Título da mensagem
 * @param {string} descricao - Descrição detalhada
 * @param {string} textoBotao - Texto do botão de ação
 * @param {function} onPressBotao - Callback do botão
 */
export function EmptyState({
  icone = "inbox",
  titulo = "Nenhum item encontrado",
  descricao,
  textoBotao,
  onPressBotao,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconeContainer}>
        <Feather name={icone} size={48} color={cores.cinza} />
      </View>

      <Text style={styles.titulo}>{titulo}</Text>

      {descricao && <Text style={styles.descricao}>{descricao}</Text>}

      {textoBotao && onPressBotao && (
        <Button
          texto={textoBotao}
          variante="destaque"
          onPress={onPressBotao}
          estilo={styles.botao}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: espacamento.xl,
  },

  iconeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: cores.cinzaClaro,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacamento.lg,
  },

  titulo: {
    fontSize: tipografia.tamanhoSubtitulo,
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
  },

  botao: {
    marginTop: espacamento.lg,
  },
});

export default EmptyState;
