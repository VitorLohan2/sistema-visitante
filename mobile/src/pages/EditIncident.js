// Página de Editar Cadastro de Visitantes em React Native
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Image,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons"; // Importar Feather icons
import api from "../services/api";

export default function EditIncidentMobile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [empresasList, setEmpresasList] = useState([]);
  const [setoresList, setSetoresList] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [errors, setErrors] = useState({
    placa_veiculo: "",
    cor_veiculo: "",
  });

  // Opções de cores (igual ao frontend)
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

  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    nascimentoISO: "",
    cpf: "",
    empresa: "",
    setor: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo: "",
    observacao: "",
    bloqueado: false,
    avatar_imagem: null,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      const type = await AsyncStorage.getItem("@Auth:ongType");
      const ongId = await AsyncStorage.getItem("@Auth:ongId");
      setIsAdmin(type?.trim().toUpperCase() === "ADM");

      try {
        // Carregar empresas e setores
        const [empresasRes, setoresRes] = await Promise.all([
          api.get("/empresas-visitantes", {
            headers: { Authorization: ongId },
          }),
          api.get("/setores-visitantes", {
            headers: { Authorization: ongId },
          }),
        ]);

        setEmpresasList(empresasRes.data);
        setSetoresList(setoresRes.data);

        // Carregar dados do incidente
        const response = await api.get(`/incidents/${id}`, {
          headers: { Authorization: ongId },
        });

        const dataBackend = response.data.nascimento;
        let nascimentoDisplay = "";
        if (dataBackend) {
          const [year, month, day] = dataBackend.split("-");
          nascimentoDisplay = `${day}/${month}/${year}`;
        }

        // Formatar placa (mantendo a formatação)
        const placaFormatada = formatPlaca(response.data.placa_veiculo || "");

        // Carregar fotos
        const fotosArray = response.data.fotos || [];
        if (response.data.imagem1) {
          fotosArray.unshift(response.data.imagem1);
        }

        setForm({
          ...response.data,
          nascimento: nascimentoDisplay,
          nascimentoISO: dataBackend || "",
          cpf: formatCPF(response.data.cpf || ""),
          telefone: formatTelefone(response.data.telefone || ""),
          placa_veiculo: placaFormatada,
          cor_veiculo: response.data.cor_veiculo || "",
          bloqueado: Boolean(response.data.bloqueado),
          avatar_imagem:
            response.data.avatar_imagem ||
            (fotosArray.length > 0 ? fotosArray[0] : null),
        });

        setFotos(fotosArray);

        // Validar placa inicialmente
        validatePlaca(placaFormatada, response.data.cor_veiculo || "");
      } catch (err) {
        console.error("❌ Erro ao carregar:", err);
        Alert.alert("Erro", "Erro ao carregar dados.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // Funções de formatação
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : value;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  // Função de formatação de placa (igual ao frontend)
  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    // Formato Mercosul: AAA1A11 ou Formato antigo: AAA1111
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }

    return cleaned;
  };

  // Validação de placa em tempo real (igual ao frontend)
  const validatePlaca = (placaValue, corValue = "") => {
    const cleaned = placaValue.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    let newErrors = { placa_veiculo: "", cor_veiculo: "" };

    if (cleaned.length > 0 && cleaned.length < 7) {
      newErrors.placa_veiculo = "Placa deve ter 7 caracteres";
    }

    // Validação cruzada placa/cor (igual ao frontend)
    const hasPlaca = cleaned.trim().length > 0;
    const hasCor = corValue.trim().length > 0;

    if (hasPlaca && !hasCor) {
      newErrors.cor_veiculo =
        "Cor do veículo é obrigatória quando a placa é informada";
    }

    if (hasCor && !hasPlaca) {
      newErrors.placa_veiculo =
        "Placa do veículo é obrigatória quando a cor é informada";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const parseDateString = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split("-");
    return new Date(year, month - 1, day);
  };

  // Handler de mudanças nos campos
  const handleChange = (name, value) => {
    let newValue = value;

    if (name === "nome") {
      newValue = value.toUpperCase();
    } else if (name === "placa_veiculo") {
      newValue = formatPlaca(value);
      // Validar em tempo real
      validatePlaca(newValue, form.cor_veiculo);
    } else if (name === "cor_veiculo") {
      // Validar em tempo real quando a cor muda
      validatePlaca(form.placa_veiculo, value);
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // Handler para selecionar avatar
  const handleSelectAvatar = (foto) => {
    setForm((prev) => ({ ...prev, avatar_imagem: foto }));
    setShowAvatarModal(false);
  };

  // Handler de bloqueio
  const handleBlockToggle = async () => {
    if (!isAdmin) return;
    const newStatus = !form.bloqueado;
    const ongId = await AsyncStorage.getItem("@Auth:ongId");

    try {
      await api.put(
        `/incidents/${id}/block`,
        { bloqueado: newStatus },
        {
          headers: { Authorization: ongId },
        }
      );

      setForm((prev) => ({ ...prev, bloqueado: newStatus }));
      Alert.alert(
        "Sucesso",
        `Cadastro ${newStatus ? "bloqueado" : "desbloqueado"}!`
      );
    } catch (err) {
      console.error("❌ Erro ao bloquear:", err);
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  };

  // Handler de data
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = selectedDate.getDate();
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const formatada = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

      setForm((prev) => ({
        ...prev,
        nascimento: formatada,
        nascimentoISO: iso,
      }));
    }
  };

  // Handler de submit
  const handleSubmit = async () => {
    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = form.placa_veiculo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    // Validações
    if (cpfClean.length !== 11) {
      return Alert.alert("Erro", "CPF inválido. Deve conter 11 dígitos.");
    }

    if (telefoneClean.length !== 11) {
      return Alert.alert(
        "Erro",
        "Telefone inválido. Deve conter 11 dígitos com DDD."
      );
    }

    if (!form.empresa || !form.setor) {
      return Alert.alert("Erro", "Empresa e setor são obrigatórios.");
    }

    // Validação de data (se houver)
    if (form.nascimentoISO) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = parseDateString(form.nascimentoISO);

      if (birthDate > today) {
        return Alert.alert("Erro", "Data de nascimento não pode ser futura.");
      }
    }

    // Validação cruzada placa/cor (igual ao frontend)
    const hasPlaca = placaClean.trim().length > 0;
    const hasCor = form.cor_veiculo.trim().length > 0;

    if (hasPlaca && !hasCor) {
      setErrors((prev) => ({
        ...prev,
        cor_veiculo: "Cor do veículo é obrigatória quando a placa é informada",
      }));
      return Alert.alert("Erro", "Por favor, selecione a cor do veículo.");
    }

    if (hasCor && !hasPlaca) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo:
          "Placa do veículo é obrigatória quando a cor é informada",
      }));
      return Alert.alert("Erro", "Por favor, preencha a placa do veículo.");
    }

    if (hasPlaca && placaClean.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
      return Alert.alert("Erro", "Placa do veículo deve ter 7 caracteres.");
    }

    const ongId = await AsyncStorage.getItem("@Auth:ongId");

    const payload = {
      nome: form.nome,
      nascimento: form.nascimentoISO,
      cpf: cpfClean,
      empresa: form.empresa,
      setor: form.setor,
      telefone: telefoneClean,
      placa_veiculo: placaClean,
      cor_veiculo: form.cor_veiculo,
      observacao: form.observacao,
      avatar_imagem: form.avatar_imagem,
    };

    console.log("📤 PAYLOAD ENVIADO:", payload);

    try {
      const response = await api.put(`/incidents/${id}`, payload, {
        headers: { Authorization: ongId },
      });

      console.log("✅ RESPOSTA DO BACKEND:", response.data);

      Alert.alert("Sucesso", "Dados atualizados com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("❌ Erro na atualização:", err.response?.data || err);
      Alert.alert("Erro", "Erro ao atualizar os dados.");
    }
  };

  // Componente de item do avatar
  const AvatarItem = ({ foto, isSelected, onSelect }) => (
    <TouchableOpacity
      style={[styles.avatarItem, isSelected && styles.avatarItemSelected]}
      onPress={() => onSelect(foto)}
    >
      <Image source={{ uri: foto }} style={styles.avatarImage} />
    </TouchableOpacity>
  );

  // Modal para selecionar avatar
  const AvatarModal = () => (
    <Modal
      visible={showAvatarModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAvatarModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecionar Avatar</Text>

          {fotos.length === 0 ? (
            <Text style={styles.noPhotosText}>Nenhuma foto disponível</Text>
          ) : (
            <FlatList
              data={fotos}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <AvatarItem
                  foto={item}
                  isSelected={form.avatar_imagem === item}
                  onSelect={handleSelectAvatar}
                />
              )}
              numColumns={3}
              contentContainerStyle={styles.avatarList}
            />
          )}

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowAvatarModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      enableOnAndroid={true}
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={100}
      extraHeight={100}
      enableResetScrollToCoords={true}
    >
      <AvatarModal />

      {/* HEADER ADICIONADO - Igual ao ViewVisitor.js */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { flex: 1 }]}
        >
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Editar Cadastro</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={form.nome}
        onChangeText={(value) => handleChange("nome", value)}
        editable={isAdmin}
      />

      <Text style={styles.label}>Data de Nascimento</Text>
      <TouchableOpacity
        onPress={() => isAdmin && setShowDatePicker(true)}
        style={styles.input}
        activeOpacity={0.7}
      >
        <Text style={{ color: form.nascimento ? "#000" : "#888" }}>
          {form.nascimento || "Data de nascimento"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={parseDateString(form.nascimentoISO)}
          mode="date"
          display="default"
          onChange={handleDateChange}
          locale="pt-BR"
        />
      )}

      <Text style={styles.label}>CPF</Text>
      <TextInput
        style={styles.input}
        placeholder="CPF"
        value={form.cpf}
        onChangeText={(value) => handleChange("cpf", formatCPF(value))}
        keyboardType="numeric"
        editable={isAdmin}
      />

      <Text style={styles.label}>Empresa</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.empresa}
          onValueChange={(value) => handleChange("empresa", value)}
          enabled={isAdmin}
        >
          <Picker.Item label="Selecione" value="" />
          {empresasList.map((e, i) => (
            <Picker.Item key={i} label={e.nome} value={e.nome} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Setor</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.setor}
          onValueChange={(value) => handleChange("setor", value)}
          enabled={isAdmin}
        >
          <Picker.Item label="Selecione" value="" />
          {setoresList.map((s, i) => (
            <Picker.Item key={i} label={s.nome} value={s.nome} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Placa do Veículo</Text>
      <TextInput
        style={[styles.input, errors.placa_veiculo && styles.inputError]}
        placeholder="Placa do Veículo (ex: ABC1D23)"
        value={form.placa_veiculo}
        onChangeText={(value) => handleChange("placa_veiculo", value)}
        maxLength={7}
        editable={isAdmin}
      />
      {errors.placa_veiculo ? (
        <Text style={styles.errorText}>{errors.placa_veiculo}</Text>
      ) : null}

      <Text style={styles.label}>Cor do Veículo</Text>
      <View
        style={[
          styles.pickerContainer,
          errors.cor_veiculo && styles.inputError,
        ]}
      >
        <Picker
          selectedValue={form.cor_veiculo}
          onValueChange={(value) => handleChange("cor_veiculo", value)}
          enabled={isAdmin}
        >
          <Picker.Item label="Selecione a cor" value="" />
          {opcoesCores.map((cor, i) => (
            <Picker.Item key={i} label={cor} value={cor} />
          ))}
        </Picker>
      </View>
      {errors.cor_veiculo ? (
        <Text style={styles.errorText}>{errors.cor_veiculo}</Text>
      ) : null}

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        value={form.telefone}
        onChangeText={(value) =>
          handleChange("telefone", formatTelefone(value))
        }
        keyboardType="phone-pad"
        editable={isAdmin}
      />

      {/* Avatar Preview e Seletor */}
      {fotos.length > 0 && (
        <>
          <Text style={styles.label}>Avatar Selecionado</Text>
          {form.avatar_imagem ? (
            <TouchableOpacity
              style={styles.avatarPreviewContainer}
              onPress={() => isAdmin && setShowAvatarModal(true)}
              disabled={!isAdmin}
            >
              <Image
                source={{ uri: form.avatar_imagem }}
                style={styles.avatarPreview}
              />
              <Text style={styles.avatarChangeText}>
                Toque para alterar o avatar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.selectAvatarButton}
              onPress={() => isAdmin && setShowAvatarModal(true)}
              disabled={!isAdmin}
            >
              <Text style={styles.selectAvatarButtonText}>
                Selecionar Avatar
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Bloqueio */}
      <View style={styles.switchContainer}>
        <Text style={styles.label}>
          {form.bloqueado ? "✅ Bloqueado" : "⛔ Bloquear"}
        </Text>
        <Switch
          value={form.bloqueado}
          onValueChange={handleBlockToggle}
          disabled={!isAdmin}
        />
      </View>

      {/* Observações */}
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        placeholder="Observações"
        value={form.observacao}
        onChangeText={(value) => handleChange("observacao", value)}
        editable={isAdmin}
      />

      {/* Botão Atualizar */}
      <TouchableOpacity
        style={[styles.button, !isAdmin && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!isAdmin}
      >
        <Text style={styles.buttonText}>Atualizar</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // HEADER STYLES - Igual ao ViewVisitor.js
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 30,
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
  // FIM HEADER STYLES
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#13131a",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f0f0f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#e02041",
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "bold",
  },
  errorText: {
    color: "#e02041",
    fontSize: 12,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#10B981",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 60,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f0f0f5",
    marginBottom: 8,
  },
  // Estilos para o avatar
  avatarPreviewContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#10B981",
  },
  avatarChangeText: {
    marginTop: 8,
    color: "#10B981",
    fontSize: 14,
  },
  selectAvatarButton: {
    backgroundColor: "#f0f0f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    marginVertical: 12,
  },
  selectAvatarButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  // Estilos do modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  noPhotosText: {
    textAlign: "center",
    color: "#888",
    marginVertical: 20,
  },
  avatarList: {
    alignItems: "center",
  },
  avatarItem: {
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    overflow: "hidden",
  },
  avatarItemSelected: {
    borderColor: "#10B981",
    borderWidth: 3,
  },
  avatarImage: {
    width: 80,
    height: 80,
  },
  modalCloseButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
