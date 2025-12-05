// NewIncident.js (Mobile)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import api from "../services/api";

import { CameraView, useCameraPermissions } from "expo-camera";

export default function NewVisitorMobile() {
  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    nascimentoISO: "",
    cpf: "",
    empresa_id: "",
    setor_id: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo: "",
    observacao: "",
    fotos: [],
  });

  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [errors, setErrors] = useState({
    placa_veiculo: "",
    cor_veiculo: "",
  });

  // Camera state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraRef = useRef(null);

  const navigation = useNavigation();

  // cores (mesma lista do frontend)
  const opcoesCores = [
    "PRETO",
    "BRANCO",
    "PRATA",
    "CINZA",
    "VERMELHO",
    "AZUL",
    "VERDE",
    "AMARELO",
    "LARANJA",
  ];

  // ======================
  // Inicialização
  // ======================
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }

      const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaPermission(media.status === "granted");
    })();

    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [empresasResponse, setoresResponse] = await Promise.all([
        api.get("/empresas-visitantes"),
        api.get("/setores-visitantes"),
      ]);

      setEmpresasVisitantes(empresasResponse.data || []);
      setSetoresVisitantes(setoresResponse.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      Alert.alert("Aviso", "Não foi possível carregar empresas/setores.");
    }
  }

  // ======================
  // Formatação e validações
  // ======================
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cleaned;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return cleaned;
  };

  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }
    return cleaned;
  };

  const validatePlaca = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length > 0 && cleaned.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
    } else {
      setErrors((prev) => ({ ...prev, placa_veiculo: "" }));
    }
  };

  const formatarDataDDMMYYYY = (date) => {
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // ======================
  // Handlers gerais
  // ======================
  const handleChange = (name, value) => {
    let newValue = value;
    if (name === "nome") newValue = value.toUpperCase();
    if (name === "placa_veiculo") {
      newValue = formatPlaca(value);
      validatePlaca(newValue);
    }
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // ======================
  // Imagem - câmera
  // ======================
  const openCameraModal = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Permissão negada",
          "Habilite permissão de câmera nas configurações."
        );
        return;
      }
    }
    setCameraVisible(true);
  };

  const takePhoto = async () => {
    if (form.fotos.length >= 3) {
      return Alert.alert("Limite atingido", "Máximo de 3 imagens.");
    }
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      const file = {
        uri: photo.uri,
        name: `photo_${Date.now()}.jpg`,
        type: "image/jpeg",
      };

      setForm((prev) => ({ ...prev, fotos: [...prev.fotos, file] }));
      setCameraVisible(false);
    } catch (err) {
      console.error("Erro ao tirar foto:", err);
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };

  // ======================
  // Imagem - galeria
  // ======================
  const pickImage = async () => {
    if (form.fotos.length >= 3) {
      return Alert.alert("Limite atingido", "Máximo de 3 imagens.");
    }

    if (!mediaPermission) {
      const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaPermission(media.status === "granted");
      if (media.status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "Habilite o acesso à galeria nas configurações."
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 3 - form.fotos.length,
      });

      if (!result.canceled) {
        const assets = result.assets || [];
        const selected = assets.slice(0, 3 - form.fotos.length);

        const files = selected.map((asset) => ({
          uri: asset.uri,
          name: `image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`,
          type: "image/jpeg",
        }));

        setForm((prev) => ({ ...prev, fotos: [...prev.fotos, ...files] }));
      }
    } catch (err) {
      console.error("Erro ao selecionar imagens:", err);
      Alert.alert("Erro", "Falha ao selecionar imagens da galeria.");
    }
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index),
    }));
  };

  // ======================
  // Progresso
  // ======================
  const simulateProgress = () => {
    setProgress(0);
    let value = 0;
    const interval = setInterval(() => {
      value += 12;
      setProgress(Math.min(value, 100));
      if (value >= 100) clearInterval(interval);
    }, 120);
  };

  // ======================
  // FUNÇÃO DE DEBUG - Teste de campo
  // ======================
  async function testMulterField() {
    const token = await AsyncStorage.getItem("@Auth:token");
    if (!token) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    console.log("🔍 Testando campo 'fotos' para multer...");

    const testData = new FormData();
    testData.append("nome", "TESTE CAMPO FOTOS");
    testData.append("cpf", "12345678901");
    testData.append("empresa", "1");
    testData.append("setor", "1");
    testData.append("telefone", "11999999999");
    testData.append("placa_veiculo", "");
    testData.append("cor_veiculo", "");
    testData.append("observacao", "Teste de campo");

    // Adiciona uma imagem de teste com campo 'fotos'
    const testImage = {
      uri: "file:///dummy/test.jpg",
      name: "test.jpg",
      type: "image/jpeg",
    };

    testData.append("fotos", testImage);

    console.log("📦 FormData de teste:");
    for (let pair of testData.entries()) {
      console.log(
        `${pair[0]}:`,
        pair[1].name ? `[Arquivo: ${pair[1].name}]` : pair[1]
      );
    }

    try {
      console.log("📤 Enviando teste...");
      const response = await fetch(`${api.defaults.baseURL}/incidents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: testData,
      });

      const responseText = await response.text();
      console.log("📄 Resposta:", responseText.substring(0, 200));

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      Alert.alert(
        `Teste: ${response.status}`,
        result.error
          ? `ERRO: ${result.error}`
          : "Campo CORRETO! O multer aceitou."
      );
    } catch (err) {
      console.error("Erro teste:", err);
      Alert.alert("Erro Teste", err.message);
    }
  }

  // ======================
  // Submit principal - VERSÃO CORRIGIDA
  // ======================
  const handleSubmit = async () => {
    setShowConfirmModal(false);

    // Validações
    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = (form.placa_veiculo || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    setErrors({ placa_veiculo: "", cor_veiculo: "" });

    if (
      !form.nome ||
      !cpfClean ||
      !form.empresa_id ||
      !form.setor_id ||
      !telefoneClean
    ) {
      return Alert.alert("Erro", "Preencha todos os campos obrigatórios");
    }

    if (cpfClean.length !== 11) {
      return Alert.alert("CPF inválido", "Deve conter 11 dígitos");
    }

    if (telefoneClean.length !== 11) {
      return Alert.alert("Telefone inválido", "Deve conter 11 dígitos com DDD");
    }

    if (!form.fotos || form.fotos.length === 0) {
      return Alert.alert("Erro", "Envie ao menos uma imagem");
    }

    const hasPlaca = placaClean.trim().length > 0;
    const hasCor = (form.cor_veiculo || "").trim().length > 0;

    if (hasPlaca && !hasCor) {
      setErrors((prev) => ({
        ...prev,
        cor_veiculo: "Cor do veículo é obrigatória quando a placa é informada",
      }));
      return Alert.alert("Erro", "Selecione a cor do veículo");
    }

    if (hasCor && !hasPlaca) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo:
          "Placa do veículo é obrigatória quando a cor é informada",
      }));
      return Alert.alert("Erro", "Preencha a placa do veículo");
    }

    if (hasPlaca && placaClean.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
      return Alert.alert("Erro", "Placa deve ter 7 caracteres");
    }

    // Pega token
    const token = await AsyncStorage.getItem("@Auth:token");
    if (!token) {
      return Alert.alert("Erro", "Usuário não autenticado");
    }

    // Monta FormData
    const data = new FormData();
    data.append("nome", form.nome);
    data.append("nascimento", form.nascimentoISO || "");
    data.append("cpf", cpfClean);
    data.append("empresa", String(form.empresa_id));
    data.append("setor", String(form.setor_id));
    data.append("telefone", telefoneClean);
    data.append("placa_veiculo", placaClean);
    data.append("cor_veiculo", form.cor_veiculo || "");
    data.append("observacao", form.observacao || "");

    console.log("📸 Preparando imagens para upload (campo 'fotos')...");

    form.fotos.forEach((img, idx) => {
      let uri = img.uri;

      // Corrige URI para Android
      if (Platform.OS === "android" && !uri.startsWith("file://")) {
        uri = "file://" + uri;
      }

      uri = uri.replace("file://file://", "file://");

      const imageFile = {
        uri: uri,
        name: img.name || `foto_${Date.now()}_${idx}.jpg`,
        type: "image/jpeg",
      };

      // 🔴 NOME CORRETO: 'fotos' (igual ao esperado pelo multer)
      data.append("fotos", imageFile);

      console.log(`Imagem ${idx + 1}: [campo: 'fotos'] ${imageFile.name}`);
    });

    // DEBUG: Mostra o FormData completo
    console.log("=== FORM DATA COMPLETO ===");
    const entries = [...data.entries()];
    entries.forEach(([key, value], index) => {
      if (value && typeof value === "object" && value.uri) {
        console.log(`${index}. ${key}: [ARQUIVO] ${value.name}`);
      } else {
        console.log(`${index}. ${key}: ${value}`);
      }
    });
    console.log("Total de campos:", entries.length);

    try {
      setLoading(true);
      simulateProgress();

      // Verifica CPF duplicado (opcional)
      try {
        const { data: cpfData } = await api.get(`/cpf-existe/${cpfClean}`);
        if (cpfData && cpfData.exists) {
          setLoading(false);
          return Alert.alert("CPF Duplicado", "CPF já cadastrado no sistema");
        }
      } catch (cpfErr) {
        console.warn("Verificação CPF ignorada:", cpfErr.message);
      }

      // 🔴 ENVIA COM FETCH (mais confiável para FormData)
      console.log("📤 Enviando para /incidents via fetch...");
      console.log("🔑 Token:", token.substring(0, 10) + "...");
      console.log("🔗 URL:", `${api.defaults.baseURL}/incidents`);

      const response = await fetch(`${api.defaults.baseURL}/incidents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // NÃO adicione Content-Type - o fetch define automaticamente
        },
        body: data,
        timeout: 120000,
      });

      console.log("📄 Status HTTP:", response.status, response.statusText);

      const responseText = await response.text();
      console.log(
        "📄 Resposta:",
        responseText.substring(0, 300) +
          (responseText.length > 300 ? "..." : "")
      );

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        // Erro detalhado
        const errorMsg =
          responseData.message ||
          responseData.error ||
          `Erro ${response.status}: ${response.statusText}`;

        console.error("❌ Erro do servidor:", errorMsg);
        throw new Error(errorMsg);
      }

      console.log("✅ Cadastro realizado com sucesso!", responseData);

      setProgress(100);

      setTimeout(() => {
        setLoading(false);
        Alert.alert("Sucesso", "Visitante cadastrado com sucesso!");
        navigation.navigate("Profile");
      }, 400);
    } catch (err) {
      console.error("❌ Erro no cadastro:", {
        message: err.message,
        stack: err.stack,
      });

      setLoading(false);

      let errorMessage = "Falha ao cadastrar visitante";

      if (
        err.message.includes("fotos") ||
        err.message.includes("is not allowed")
      ) {
        errorMessage =
          "Erro no envio das imagens. O campo 'fotos' não foi reconhecido.";
      } else if (err.message.includes("400")) {
        errorMessage = "Dados inválidos enviados ao servidor.";
      } else if (err.message.includes("Network")) {
        errorMessage = "Erro de conexão. Verifique sua internet.";
      } else if (err.message.includes("413")) {
        errorMessage = "Imagens muito grandes. Tente imagens menores.";
      } else if (err.message.includes("timeout")) {
        errorMessage = "Tempo de espera excedido. Tente novamente.";
      }

      Alert.alert("Erro", errorMessage);
    }
  };

  // ======================
  // Render
  // ======================
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666" }}>
          {`Enviando cadastro... ${Math.round(progress)}%`}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid={true}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.blocoCadastro}>
        <Text style={styles.title}>Cadastrar Visitante</Text>

        {/* BOTÕES DE TESTE */}
        <View style={styles.testButtons}>
          <TouchableOpacity
            onPress={testMulterField}
            style={[styles.testButton, { backgroundColor: "#3498db" }]}
          >
            <Text style={styles.testButtonText}>Testar campo 'fotos'</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nome *"
          value={form.nome}
          onChangeText={(text) => handleChange("nome", text)}
        />

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: form.nascimento ? "#000" : "#888" }}>
            {form.nascimento || "Data de nascimento (opcional)"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={
              form.nascimentoISO
                ? new Date(form.nascimentoISO)
                : new Date(1990, 0, 1)
            }
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const iso = selectedDate.toISOString().split("T")[0];
                const formatada = formatarDataDDMMYYYY(selectedDate);
                setForm((prev) => ({
                  ...prev,
                  nascimento: formatada,
                  nascimentoISO: iso,
                }));
              }
            }}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="CPF *"
          value={form.cpf}
          keyboardType="numeric"
          onChangeText={(text) =>
            setForm((prev) => ({ ...prev, cpf: formatCPF(text) }))
          }
          maxLength={14}
        />

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={form.empresa_id}
            onValueChange={(val) => handleChange("empresa_id", val)}
          >
            <Picker.Item label="Selecione a empresa *" value="" />
            {empresasVisitantes.map((e) => (
              <Picker.Item key={e.id} label={e.nome} value={e.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={form.setor_id}
            onValueChange={(val) => handleChange("setor_id", val)}
          >
            <Picker.Item label="Selecione o setor *" value="" />
            {setoresVisitantes.map((s) => (
              <Picker.Item key={s.id} label={s.nome} value={s.id} />
            ))}
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Placa do Veículo (ex: ABC1D23)"
          value={form.placa_veiculo}
          onChangeText={(text) =>
            handleChange("placa_veiculo", formatPlaca(text))
          }
          maxLength={7}
        />
        {errors.placa_veiculo ? (
          <Text style={{ color: "red", marginBottom: 10 }}>
            {errors.placa_veiculo}
          </Text>
        ) : null}

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={form.cor_veiculo}
            onValueChange={(val) => handleChange("cor_veiculo", val)}
          >
            <Picker.Item label="Selecione a cor do veículo" value="" />
            {opcoesCores.map((cor) => (
              <Picker.Item key={cor} label={cor} value={cor} />
            ))}
          </Picker>
        </View>
        {errors.cor_veiculo ? (
          <Text style={{ color: "red", marginBottom: 10 }}>
            {errors.cor_veiculo}
          </Text>
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Telefone *"
          keyboardType="phone-pad"
          value={form.telefone}
          onChangeText={(text) =>
            handleChange("telefone", formatTelefone(text))
          }
          maxLength={15}
        />

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Observações"
          multiline
          value={form.observacao}
          onChangeText={(text) => handleChange("observacao", text)}
        />

        {/* Seção de imagens */}
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>
            Imagens (mínimo 1, máximo 3) *{" "}
            <Text style={{ color: "#666", fontSize: 12 }}>
              (campo: 'fotos')
            </Text>
          </Text>
          <View style={styles.imageRow}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={openCameraModal}
            >
              <MaterialIcons
                name="photo-camera"
                size={20}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.imageButtonText}>Câmera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <MaterialIcons
                name="photo-library"
                size={20}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.imageButtonText}>Galeria</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.previewContainer}>
            {form.fotos.map((img, index) => (
              <View key={index} style={styles.previewWrapper}>
                <Pressable onPress={() => setModalImage(img.uri)}>
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.previewImage}
                  />
                </Pressable>
                <TouchableOpacity
                  onPress={() => handleRemoveImage(index)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {form.fotos.length === 0 && (
            <Text style={styles.warningText}>
              Adicione pelo menos uma imagem
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => setShowConfirmModal(true)}
        >
          <Text style={styles.submitText}>Cadastrar Visitante</Text>
        </TouchableOpacity>

        {/* Modal para visualizar imagem */}
        <Modal visible={!!modalImage} transparent>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setModalImage(null)}
          >
            <Image
              source={{ uri: modalImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>

        {/* Camera modal */}
        <Modal visible={cameraVisible} animationType="slide">
          <View style={{ flex: 1 }}>
            <CameraView style={{ flex: 1 }} ref={cameraRef} />
            <View style={styles.cameraControls}>
              <TouchableOpacity
                onPress={() => setCameraVisible(false)}
                style={[styles.imageButton, { backgroundColor: "#666" }]}
              >
                <Text style={styles.imageButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={styles.imageButton}>
                <Text style={styles.imageButtonText}>Tirar Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Confirm modal */}
        <Modal visible={showConfirmModal} transparent animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowConfirmModal(false)}
          >
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>
                Deseja realmente realizar o cadastro?
              </Text>
              <Text style={styles.confirmText}>
                Verifique se todos os dados estão corretos antes de confirmar.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[styles.confirmButton, { backgroundColor: "#10B981" }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Sim, Cadastrar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowConfirmModal(false)}
                  style={[styles.confirmButton, { backgroundColor: "#ccc" }]}
                >
                  <Text style={{ color: "#000" }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  blocoCadastro: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    marginTop: 40,
    marginBottom: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  testButtons: {
    flexDirection: "row",
    marginBottom: 15,
  },
  testButton: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f0f0f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    height: 56,
    marginBottom: 10,
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f0f0f5",
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  imageSection: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  imageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  imageButton: {
    flex: 1,
    backgroundColor: "#3883c2",
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  previewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  previewWrapper: {
    marginRight: 10,
    marginBottom: 10,
    position: "relative",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#e02041",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  warningText: {
    color: "#e74c3c",
    fontSize: 14,
    marginTop: 5,
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#10B981",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 60,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "90%",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    backgroundColor: "#000",
  },
  confirmModal: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
  },
  confirmTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  confirmButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
