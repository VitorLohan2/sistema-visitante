// src/pages/EditarUsuario/index.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import Feather from "react-native-vector-icons/Feather";
import { TextInputMask } from "react-native-masked-text";

import api from "../../services/api";
import { styles } from "./styles";

// Assets
import logoImg from "../../assets/gd.png";

export default function EditarUsuario() {
  const navigation = useNavigation();
  const route = useRoute();
  const { usuarioId } = route.params;

  // ═══════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);

  // Campos do formulário
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [setorId, setSetorId] = useState("");

  // ═══════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar usuário
      const userResponse = await api.get(`ongs/${usuarioId}`);
      const userData = userResponse.data;

      if (userData.type === "ADM") {
        Alert.alert("Acesso Negado", "Usuários ADM não podem ser editados", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setUsuario(userData);
      setName(userData.name || "");
      setEmail(userData.email || "");
      setWhatsapp(userData.whatsapp || "");
      setCpf(userData.cpf || "");
      setBirthdate(userData.birthdate || "");
      setCity(userData.city || "");
      setUf(userData.uf || "");
      setEmpresaId(userData.empresa_id?.toString() || "");
      setSetorId(userData.setor_id?.toString() || "");

      // Carregar empresas e setores
      const [empresasRes, setoresRes] = await Promise.all([
        api.get("/empresas"),
        api.get("/setores"),
      ]);

      setEmpresas(empresasRes.data || []);
      setSetores(setoresRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados do usuário");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════
  const handleSalvar = async () => {
    // Validações
    if (!name.trim()) {
      Alert.alert("Atenção", "O nome é obrigatório");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Atenção", "O email é obrigatório");
      return;
    }

    if (!whatsapp.trim()) {
      Alert.alert("Atenção", "O WhatsApp é obrigatório");
      return;
    }

    if (!cpf.trim()) {
      Alert.alert("Atenção", "O CPF é obrigatório");
      return;
    }

    if (!empresaId) {
      Alert.alert("Atenção", "Selecione uma empresa");
      return;
    }

    if (!setorId) {
      Alert.alert("Atenção", "Selecione um setor");
      return;
    }

    try {
      setSalvando(true);

      const data = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        cpf: cpf.replace(/\D/g, ""),
        birthdate: birthdate || null,
        city: city.trim() || null,
        uf: uf.trim().toUpperCase() || null,
        empresa_id: parseInt(empresaId),
        setor_id: parseInt(setorId),
      };

      await api.put(`ongs/${usuarioId}`, data);

      Alert.alert("Sucesso!", "Usuário atualizado com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      const errorMessage =
        error.response?.data?.error || "Não foi possível atualizar o usuário";
      Alert.alert("Erro", errorMessage);
    } finally {
      setSalvando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* CABEÇALHO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={logoImg} style={styles.logo} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Editar Usuário</Text>
          <Text style={styles.headerSubtitle}>
            ID: {usuarioId} (não editável)
          </Text>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FORMULÁRIO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Nome */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Nome Completo <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome completo"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="exemplo@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* WhatsApp */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            WhatsApp <Text style={styles.required}>*</Text>
          </Text>
          <TextInputMask
            type="cel-phone"
            options={{
              maskType: "BRL",
              withDDD: true,
              dddMask: "(99) ",
            }}
            style={styles.input}
            placeholder="(00) 00000-0000"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
        </View>

        {/* CPF */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            CPF <Text style={styles.required}>*</Text>
          </Text>
          <TextInputMask
            type="cpf"
            style={styles.input}
            placeholder="000.000.000-00"
            value={cpf}
            onChangeText={setCpf}
            keyboardType="numeric"
          />
        </View>

        {/* Data de Nascimento */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInputMask
            type="datetime"
            options={{
              format: "DD/MM/YYYY",
            }}
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={birthdate}
            onChangeText={setBirthdate}
            keyboardType="numeric"
          />
        </View>

        {/* Empresa */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Empresa <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={empresaId}
              onValueChange={(value) => setEmpresaId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Selecione uma empresa" value="" />
              {empresas.map((empresa) => (
                <Picker.Item
                  key={empresa.id}
                  label={empresa.nome}
                  value={empresa.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Setor */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Setor <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={setorId}
              onValueChange={(value) => setSetorId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Selecione um setor" value="" />
              {setores.map((setor) => (
                <Picker.Item
                  key={setor.id}
                  label={setor.nome}
                  value={setor.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Cidade */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cidade</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite a cidade"
            value={city}
            onChangeText={setCity}
          />
        </View>

        {/* UF */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estado (UF)</Text>
          <TextInput
            style={styles.input}
            placeholder="RJ"
            value={uf}
            onChangeText={(text) => setUf(text.toUpperCase())}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, salvando && styles.saveButtonDisabled]}
          onPress={handleSalvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.margin} />
      </ScrollView>
    </SafeAreaView>
  );
}
