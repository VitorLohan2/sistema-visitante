// Modal de registrar visita
import React from "react";
import { View, Text, TextInput, TouchableOpacity, Modal } from "react-native";
import { Picker } from "@react-native-picker/picker";
import Feather from "react-native-vector-icons/Feather";
import { styles } from "../Profile/styles";

export default function RegistroVisitaModal({
  visible,
  selectedIncident,
  responsavel,
  observacao,
  responsaveisList,
  onClose,
  onResponsavelChange,
  onObservacaoChange,
  onConfirm,
}) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Registrar Visita</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {selectedIncident && (
            <>
              <Text style={styles.modalText}>
                Registrar visita para:{" "}
                <Text style={{ fontWeight: "bold" }}>
                  {selectedIncident.nome}
                </Text>
              </Text>

              <Text style={styles.modalLabel}>Quem liberou?</Text>

              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={responsavel}
                  onValueChange={onResponsavelChange}
                  style={styles.pickerStyle}
                >
                  <Picker.Item
                    label="Selecione um responsável"
                    value=""
                    color="#999"
                  />
                  {responsaveisList.map((resp, index) => (
                    <Picker.Item key={index} label={resp} value={resp} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.modalLabel}>Observação:</Text>
              <TextInput
                style={[styles.responsavelInput, styles.observacaoInput]}
                placeholder="Adicione uma observação para esta visita..."
                value={observacao}
                onChangeText={onObservacaoChange}
                multiline={true}
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={onClose}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    !responsavel.trim() && styles.modalButtonDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={!responsavel.trim()}
                >
                  <Text style={styles.modalButtonConfirmText}>
                    Confirmar Visita
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
