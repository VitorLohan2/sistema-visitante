import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import api from "../services/api";
import { useSocket } from "../contexts/SocketContext";

export default function CadastrarAgendamentos() {
  const navigation = useNavigation();
  const socket = useSocket();

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(false);
  const [loadingSetores, setLoadingSetores] = useState(true);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [userData, setUserData] = useState({
    id: "",
    name: "",
  });

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    setor_id: "",
    horario_agendado: "",
    observacao: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);

  // Estados para o DateTimePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS INICIAIS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    loadUserData();
    loadSetores();
    requestPermissions();
  }, []);

  const loadUserData = async () => {
    try {
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      const ongName = await AsyncStorage.getItem("@Auth:ongName");

      if (ongId && ongName) {
        setUserData({
          id: ongId,
          name: ongName,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  };

  const loadSetores = async () => {
    try {
      setLoadingSetores(true);
      const response = await api.get("/setores-visitantes");
      setSetoresVisitantes(response.data);
    } catch (error) {
      console.error("Erro ao carregar setores:", error);
      Alert.alert("Erro", "Não foi possível carregar os setores");
    } finally {
      setLoadingSetores(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão necessária",
          "Precisamos de permissão para acessar suas fotos"
        );
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleInputChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatarCPF = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const handleCPFChange = (value) => {
    const formattedValue = formatarCPF(value);
    handleInputChange("cpf", formattedValue);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      Alert.alert("Erro", "Não foi possível selecionar a imagem");
    }
  };

  const handleRemoveImage = () => {
    Alert.alert("Remover Foto", "Deseja remover a foto selecionada?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => setSelectedImage(null),
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════
  // DATE/TIME PICKER HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleOpenDatePicker = () => {
    const dataAtual = formData.horario_agendado
      ? new Date(formData.horario_agendado)
      : new Date(Date.now() + 60 * 60 * 1000);

    setTempDate(dataAtual);
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      setTempDate(selectedDate);

      if (Platform.OS === "android") {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedTime) {
      const finalDateTime = new Date(tempDate);
      finalDateTime.setHours(selectedTime.getHours());
      finalDateTime.setMinutes(selectedTime.getMinutes());

      const formatted = formatToBackend(finalDateTime);
      handleInputChange("horario_agendado", formatted);
    }
  };

  const handleConfirmDateTime = () => {
    const formatted = formatToBackend(tempDate);
    handleInputChange("horario_agendado", formatted);
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // FORMATAÇÃO DE DATA/HORA
  // ═══════════════════════════════════════════════════════════════
  const formatToBackend = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = "00";

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatToBrazilian = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const getMinDateTime = () => {
    return new Date(Date.now() + 60 * 60 * 1000);
  };

  // ═══════════════════════════════════════════════════════════════
  // VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════════
  const validarFormulario = () => {
    const { nome, cpf, setor_id, horario_agendado } = formData;

    if (!nome.trim()) {
      Alert.alert("Atenção", "Nome é obrigatório");
      return false;
    }

    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      Alert.alert("Atenção", "CPF deve ter 11 dígitos");
      return false;
    }

    if (!setor_id) {
      Alert.alert("Atenção", "Setor é obrigatório");
      return false;
    }

    if (!horario_agendado) {
      Alert.alert("Atenção", "Horário agendado é obrigatório");
      return false;
    }

    const agora = new Date();
    const horarioSelecionado = new Date(horario_agendado);

    if (horarioSelecionado <= agora) {
      Alert.alert("Atenção", "O horário agendado deve ser no futuro");
      return false;
    }

    return true;
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ UPLOAD COM XHR (MÉTODO DO VISITANTE)
  // ═══════════════════════════════════════════════════════════════
  const uploadWithXHR = (url, formData, token) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      console.log("📡 XHR criado");
      console.log("🌐 URL:", url);

      // 🔎 Estado da conexão
      xhr.onreadystatechange = () => {
        console.log(`📡 readyState: ${xhr.readyState} | status: ${xhr.status}`);
      };

      // 🚀 Início
      xhr.onloadstart = () => {
        console.log("🚀 XHR upload iniciado");
      };

      // 📤 Progresso
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(
            `📤 Upload: ${percent}% (${event.loaded}/${event.total})`
          );
        } else {
          console.log(
            `📤 Upload em andamento (${event.loaded} bytes enviados)`
          );
        }
      };

      // 📥 Resposta do servidor
      xhr.onload = () => {
        console.log("📥 XHR onload disparado");
        console.log("📄 Status:", xhr.status);
        console.log("📄 ResponseText:", xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true });
          }
        } else {
          let errorMessage = `Erro ${xhr.status}`;

          try {
            const parsed = JSON.parse(xhr.responseText);
            errorMessage = parsed.message || parsed.error || errorMessage;
          } catch {
            if (xhr.responseText) {
              errorMessage = xhr.responseText;
            }
          }

          reject(new Error(errorMessage));
        }
      };

      // 🔥 Erro de rede / socket
      xhr.onerror = (e) => {
        console.error("🔥 XHR onerror disparado");
        console.error("Evento:", e);
        console.error("Status:", xhr.status);
        console.error("ResponseText:", xhr.responseText);
        reject(new Error("Erro de conexão (socket encerrado)"));
      };

      // ⏱️ Timeout
      xhr.ontimeout = () => {
        console.error("⏱️ XHR timeout");
        reject(new Error("Timeout de conexão"));
      };

      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 30000;

      console.log("📦 Enviando FormData...");
      xhr.send(formData);
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ SUBMIT (ADAPTADO DO VISITANTE)
  // ═══════════════════════════════════════════════════════════════
  const handleSubmit = async () => {
    if (!validarFormulario()) {
      return;
    }

    console.log("🚀 === INÍCIO DO ENVIO ===");
    console.log("👤 userData:", userData);
    console.log("🖼️ selectedImage:", selectedImage);

    setLoading(true);

    try {
      const setorSelecionado = setoresVisitantes.find(
        (s) => s.id === parseInt(formData.setor_id)
      );

      console.log("📋 Setor selecionado:", setorSelecionado);

      // ✅ Obter token
      const token = await AsyncStorage.getItem("@Auth:token");
      if (!token) {
        setLoading(false);
        return Alert.alert("Erro", "Usuário não autenticado");
      }

      // ✅ Criar FormData (IGUAL VISITANTE)
      const data = new FormData();
      data.append("nome", formData.nome.trim());
      data.append("cpf", formData.cpf.replace(/\D/g, ""));
      data.append("setor_id", parseInt(formData.setor_id).toString());
      data.append("setor", setorSelecionado?.nome || "");
      data.append("horario_agendado", formData.horario_agendado);
      data.append("observacao", formData.observacao.trim() || "");
      data.append("criado_por", userData.name);

      // 🖼️ Adicionar imagem se houver (IGUAL VISITANTE)
      if (selectedImage?.uri) {
        console.log("📸 Processando imagem...");

        let uri = selectedImage.uri;

        // ✅ Corrigir URI no Android (IGUAL VISITANTE)
        if (Platform.OS === "android" && !uri.startsWith("file://")) {
          uri = "file://" + uri;
        }
        uri = uri.replace("file://file://", "file://");

        const uriParts = uri.split("/");
        const fileName = uriParts[uriParts.length - 1];

        // ✅ Detectar tipo MIME (IGUAL VISITANTE)
        let mimeType = "image/jpeg";
        if (selectedImage.mimeType) {
          mimeType = selectedImage.mimeType;
        } else if (fileName.includes(".")) {
          const ext = fileName.split(".").pop().toLowerCase();
          const mimeTypes = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            webp: "image/webp",
          };
          mimeType = mimeTypes[ext] || "image/jpeg";
        }

        const imageFile = {
          uri: uri,
          type: mimeType,
          name: fileName || `foto_${Date.now()}.jpg`,
        };

        console.log("📸 Arquivo preparado:", imageFile);
        data.append("foto_colaborador", imageFile);
        console.log("✅ Imagem adicionada ao FormData");
      } else {
        console.log("ℹ️ Nenhuma imagem selecionada");
      }

      console.log("🌐 Enviando para /agendamentos...");

      // ✅ USAR XHR (IGUAL VISITANTE)
      const url = `${api.defaults.baseURL}/agendamentos`;
      await uploadWithXHR(url, data, token);

      console.log("✅ Agendamento cadastrado com sucesso!");

      // ✅ Aguarda propagação do socket
      await new Promise((resolve) => setTimeout(resolve, 500));

      setLoading(false);

      Alert.alert("Sucesso", "Agendamento criado com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("❌ === ERRO COMPLETO ===");
      console.error("Mensagem:", error.message);

      setLoading(false);

      let errorMessage = "Erro ao criar agendamento";

      if (
        error.message.includes("403") ||
        error.message.includes("Forbidden")
      ) {
        errorMessage =
          "Bloqueado pelo firewall. Entre em contato com o TI para liberar acesso.";
      } else if (
        error.message.includes("conexão") ||
        error.message.includes("Network")
      ) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else if (error.message.includes("400")) {
        errorMessage = "Dados inválidos. Verifique os campos.";
      } else if (error.message.includes("401")) {
        errorMessage = "Não autorizado. Faça login novamente.";
        // Limpar dados de autenticação
        await AsyncStorage.multiRemove([
          "@Auth:token",
          "@Auth:ongId",
          "@Auth:ongName",
        ]);
        navigation.navigate("Logon");
      } else if (error.message.includes("413")) {
        errorMessage = "Imagem muito grande (máx 3MB).";
      } else if (
        error.message.includes("Tempo") ||
        error.message.includes("timeout")
      ) {
        errorMessage = "Tempo excedido. Tente novamente.";
      } else if (error.message.includes("500")) {
        errorMessage = "Erro no servidor. Tente novamente mais tarde.";
      } else {
        errorMessage = error.message;
      }

      Alert.alert("Erro", errorMessage);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loadingSetores) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Título */}
        <View style={styles.titleContainer}>
          <Feather name="calendar" size={28} color="#10B981" />
          <Text style={styles.title}>Novo Agendamento</Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          {/* Nome */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="user" size={16} color="#10B981" />
              <Text style={styles.label}>Nome Completo *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Digite o nome completo do visitante"
              value={formData.nome}
              onChangeText={(value) => handleInputChange("nome", value)}
              maxLength={100}
              editable={!loading}
            />
          </View>

          {/* CPF */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="credit-card" size={16} color="#10B981" />
              <Text style={styles.label}>CPF *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChangeText={handleCPFChange}
              keyboardType="numeric"
              maxLength={14}
              editable={!loading}
            />
          </View>

          {/* Setor */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="home" size={16} color="#10B981" />
              <Text style={styles.label}>Setor *</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.setor_id}
                onValueChange={(value) => handleInputChange("setor_id", value)}
                style={styles.picker}
                enabled={!loading}
              >
                <Picker.Item label="Selecione o setor" value="" />
                {setoresVisitantes.map((setor) => (
                  <Picker.Item
                    key={setor.id}
                    label={setor.nome}
                    value={setor.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Horário Agendado */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="clock" size={16} color="#10B981" />
              <Text style={styles.label}>Horário Agendado *</Text>
            </View>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={handleOpenDatePicker}
              disabled={loading}
            >
              <Feather name="calendar" size={20} color="#10B981" />
              <Text
                style={[
                  styles.dateTimeButtonText,
                  !formData.horario_agendado && styles.dateTimePlaceholder,
                ]}
              >
                {formData.horario_agendado
                  ? formatToBrazilian(formData.horario_agendado)
                  : "Selecione data e hora"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Mínimo: {formatToBrazilian(formatToBackend(getMinDateTime()))}
            </Text>
          </View>

          {/* DateTimePicker - DATA */}
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={getMinDateTime()}
                locale="pt-BR"
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Confirmar Data</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* DateTimePicker - HORA */}
          {showTimePicker && (
            <View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
                locale="pt-BR"
              />
              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmDateTime}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirmar Horário
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Observação */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="file-text" size={16} color="#10B981" />
              <Text style={styles.label}>Observação</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Informações adicionais sobre o agendamento (opcional)"
              value={formData.observacao}
              onChangeText={(value) => handleInputChange("observacao", value)}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.hint}>
              {formData.observacao.length}/500 caracteres
            </Text>
          </View>

          {/* Foto do Colaborador */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Feather name="image" size={16} color="#10B981" />
              <Text style={styles.label}>Foto do Colaborador (opcional)</Text>
            </View>

            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={loading}
                >
                  <Feather name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Feather name="upload" size={20} color="#10B981" />
                <Text style={styles.uploadText}>Selecionar Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Botões de Ação */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  backText: {
    color: "#000",
    fontSize: 18,
    marginLeft: 5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    marginLeft: 12,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginLeft: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  dateTimePlaceholder: {
    color: "#9CA3AF",
  },
  confirmButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#10B981",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  uploadText: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#EF4444",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
