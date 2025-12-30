// Comunicado
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { styles } from "../Profile/styles";

export default function ComunicadoAviso({ visible, comunicado, onClose }) {
  if (!visible || !comunicado) return null;

  return (
    <View style={styles.comunicadoOverlay}>
      <View
        style={[
          styles.comunicadoCard,
          comunicado.prioridade === "urgente" && styles.comunicadoCardUrgent,
        ]}
      >
        <View style={styles.comunicadoHeader}>
          <View style={styles.comunicadoHeaderLeft}>
            <Feather
              name={
                comunicado.prioridade === "urgente" ? "alert-triangle" : "info"
              }
              size={24}
              color={
                comunicado.prioridade === "urgente" ? "#e02041" : "#10B981"
              }
            />
            <Text style={styles.comunicadoTitulo}>{comunicado.titulo}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.comunicadoCloseButton}
          >
            <Feather name="x" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.comunicadoMensagem}>{comunicado.mensagem}</Text>

        <View style={styles.comunicadoFooter}>
          <Text style={styles.comunicadoData}>
            {new Date(comunicado.created_at).toLocaleDateString("pt-BR")}
          </Text>
        </View>
      </View>
    </View>
  );
}
