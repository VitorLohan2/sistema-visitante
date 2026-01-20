/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: Card
 * Card reutilizável para agrupar conteúdo
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
 * Card customizado
 *
 * @param {ReactNode} children - Conteúdo do card
 * @param {string} titulo - Título opcional
 * @param {function} onPress - Torna o card clicável
 * @param {object} estilo - Estilos adicionais
 */
export function Card({
  children,
  titulo,
  subtitulo,
  onPress,
  estilo,
  estiloConteudo,
  ...props
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, estilo]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      {...props}
    >
      {(titulo || subtitulo) && (
        <View style={styles.cabecalho}>
          {titulo && <Text style={styles.titulo}>{titulo}</Text>}
          {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>
      )}
      <View style={[styles.conteudo, estiloConteudo]}>{children}</View>
    </Container>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    ...sombras.pequena,
  },

  cabecalho: {
    paddingHorizontal: espacamento.md,
    paddingTop: espacamento.md,
    paddingBottom: espacamento.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },

  titulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  subtitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
  },

  conteudo: {
    padding: espacamento.md,
  },
});

export default Card;
