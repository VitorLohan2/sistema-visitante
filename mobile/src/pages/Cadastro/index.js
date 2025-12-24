import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import logoImg from "../../assets/gd.png";

export default function Cadastro() {
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [cpf, setCpf] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [setor, setSetor] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [codigoSeguranca, setCodigoSeguranca] = useState("");
  const [codigoValido, setCodigoValido] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const [empresasDisponiveis, setEmpresasDisponiveis] = useState([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);

  const estadosECidades = {
    AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira"],
    AL: ["Maceió", "Arapiraca", "Rio Largo"],
    AM: ["Manaus", "Parintins", "Itacoatiara"],
    AP: ["Macapá", "Santana", "Laranjal do Jari"],
    BA: ["Salvador", "Feira de Santana", "Vitória da Conquista"],
    CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
    DF: ["Brasília"],
    ES: ["Vitória", "Vila Velha", "Cariacica"],
    GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis"],
    MA: ["São Luís", "Imperatriz", "Timon"],
    MG: ["Belo Horizonte", "Uberlândia", "Contagem"],
    MS: ["Campo Grande", "Dourados", "Três Lagoas"],
    MT: ["Cuiabá", "Várzea Grande", "Rondonópolis"],
    PA: ["Belém", "Ananindeua", "Santarém"],
    PB: ["João Pessoa", "Campina Grande", "Santa Rita"],
    PE: ["Recife", "Jaboatão dos Guararapes", "Olinda"],
    PI: ["Teresina", "Parnaíba", "Picos"],
    PR: ["Curitiba", "Londrina", "Maringá"],
    RJ: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias"],
    RN: ["Natal", "Mossoró", "Parnamirim"],
    RO: ["Porto Velho", "Ji-Paraná", "Ariquemes"],
    RR: ["Boa Vista", "Rorainópolis", "Caracaraí"],
    RS: ["Porto Alegre", "Caxias do Sul", "Pelotas"],
    SC: ["Florianópolis", "Joinville", "Blumenau"],
    SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto"],
    SP: ["São Paulo", "Guarulhos", "Campinas"],
    TO: ["Palmas", "Araguaína", "Gurupi"],
  };

  // Buscar empresas e setores da API
  useEffect(() => {
    async function fetchEmpresasESetores() {
      try {
        const [empresasRes, setoresRes] = await Promise.all([
          api.get("/empresas"),
          api.get("/setores"),
        ]);
        setEmpresasDisponiveis(empresasRes.data);
        setSetoresDisponiveis(setoresRes.data);
      } catch (err) {
        console.error("Erro ao carregar empresas ou setores:", err);
        Alert.alert("Erro", "Erro ao carregar empresas ou setores");
      }
    }
    fetchEmpresasESetores();
  }, []);

  // Verificar código de segurança
  async function verificarCodigo(codigo) {
    if (!codigo || codigo.length < 3) {
      setCodigoValido(false);
      setErroCodigo("");
      return;
    }

    setVerificandoCodigo(true);
    setErroCodigo("");

    try {
      const response = await api.get(`codigos/validar/${codigo}`);
      if (response.data.valido) {
        setCodigoValido(true);
        setErroCodigo("");
      } else {
        setCodigoValido(false);
        setErroCodigo(response.data.mensagem || "Código inválido");
      }
    } catch (err) {
      setCodigoValido(false);
      setErroCodigo("Erro ao verificar código");
      console.error("Erro na verificação:", err);
    } finally {
      setVerificandoCodigo(false);
    }
  }

  // Debounce na verificação do código
  useEffect(() => {
    const timer = setTimeout(() => {
      if (codigoSeguranca) {
        verificarCodigo(codigoSeguranca);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [codigoSeguranca]);

  // Formatar CPF
  const formatarCPF = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    }
    return cleaned.slice(0, 11);
  };

  // Formatar Data (DD/MM/AAAA)
  const formatarData = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned
      .replace(/^(\d{2})(\d)/, "$1/$2")
      .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
      .slice(0, 10);
    return formatted;
  };

  // Formatar Telefone
  const formatarTelefone = (text) => {
    const cleaned = text.replace(/\D/g, "");
    const formatted = cleaned
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
    return formatted;
  };

  const handleSubmit = async () => {
    // Validações
    if (!name.trim()) {
      Alert.alert("Erro", "Nome é obrigatório");
      return;
    }

    if (!birthdate) {
      Alert.alert("Erro", "Data de nascimento é obrigatória");
      return;
    }

    const cleanedCpf = cpf.replace(/\D/g, "");
    if (cleanedCpf.length !== 11) {
      Alert.alert("Erro", "O CPF deve conter 11 dígitos");
      return;
    }

    if (!empresa) {
      Alert.alert("Erro", "Selecione uma empresa");
      return;
    }

    if (!setor) {
      Alert.alert("Erro", "Selecione um setor");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Erro", "E-mail é obrigatório");
      return;
    }

    const cleanedWhatsapp = whatsapp.replace(/\D/g, "");
    if (cleanedWhatsapp.length !== 11) {
      Alert.alert("Erro", "O telefone deve conter 11 dígitos (DD + número)");
      return;
    }

    if (!uf) {
      Alert.alert("Erro", "Selecione um estado");
      return;
    }

    if (!city) {
      Alert.alert("Erro", "Selecione uma cidade");
      return;
    }

    if (!codigoValido) {
      Alert.alert("Erro", "Por favor, insira um código de segurança válido");
      return;
    }

    // Converter data de DD/MM/AAAA para AAAA-MM-DD
    const dateParts = birthdate.split("/");
    const birthdateFormatted =
      dateParts.length === 3
        ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
        : birthdate;

    const data = {
      name: name.toUpperCase(),
      email: email.trim(),
      whatsapp: cleanedWhatsapp,
      city,
      uf,
      birthdate: birthdateFormatted,
      cpf: cleanedCpf,
      empresa_id: empresa,
      setor_id: setor,
      codigo_acesso: codigoSeguranca,
    };

    try {
      setLoading(true);
      const response = await api.post("ongs", data);

      Alert.alert(
        "Sucesso",
        `Cadastro realizado com sucesso! Seu ID de acesso: ${response.data.id}`,
        [
          {
            text: "OK",
            onPress: () => {
              // Limpar campos
              setName("");
              setBirthdate("");
              setCpf("");
              setEmpresa("");
              setSetor("");
              setEmail("");
              setWhatsapp("");
              setCity("");
              setUf("");
              setCodigoSeguranca("");
              setCodigoValido(false);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Erro no cadastro:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Erro no cadastro, tente novamente"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
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
            <Text style={styles.pageTitle}>Cadastro de Funcionário</Text>
            <Text style={styles.pageDescription}>
              Solicite o código de cadastro ao setor de alta performance
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o nome completo"
                value={name}
                onChangeText={(text) => setName(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data de Nascimento *</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={birthdate}
                onChangeText={(text) => setBirthdate(formatarData(text))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CPF *</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                value={cpf}
                onChangeText={(text) => setCpf(formatarCPF(text))}
                keyboardType="numeric"
                maxLength={14}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Empresa *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={empresa}
                  onValueChange={(value) => setEmpresa(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione sua empresa" value="" />
                  {empresasDisponiveis.map((emp) => (
                    <Picker.Item key={emp.id} label={emp.nome} value={emp.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Setor *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={setor}
                  onValueChange={(value) => setSetor(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione seu setor" value="" />
                  {setoresDisponiveis.map((setorOpcao) => (
                    <Picker.Item
                      key={setorOpcao.id}
                      label={setorOpcao.nome}
                      value={setorOpcao.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail *</Text>
              <TextInput
                style={styles.input}
                placeholder="seuemail@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp *</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChangeText={(text) => setWhatsapp(formatarTelefone(text))}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 0.3 }]}>
                <Text style={styles.label}>UF *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={uf}
                    onValueChange={(value) => {
                      setUf(value);
                      setCity("");
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="UF" value="" />
                    {Object.keys(estadosECidades).map((sigla) => (
                      <Picker.Item key={sigla} label={sigla} value={sigla} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 0.68 }]}>
                <Text style={styles.label}>Cidade *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={city}
                    onValueChange={(value) => setCity(value)}
                    style={styles.picker}
                    enabled={!!uf}
                  >
                    <Picker.Item label="Selecione a cidade" value="" />
                    {uf &&
                      estadosECidades[uf]?.map((cidade) => (
                        <Picker.Item
                          key={cidade}
                          label={cidade}
                          value={cidade}
                        />
                      ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Segurança *</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o código (ABC123)"
                value={codigoSeguranca}
                onChangeText={(text) =>
                  setCodigoSeguranca(
                    text.toUpperCase().replace(/[^A-Z0-9]/g, "")
                  )
                }
                autoCapitalize="characters"
                maxLength={20}
              />
              {verificandoCodigo && (
                <Text style={styles.statusText}>Verificando...</Text>
              )}
              {codigoValido && !verificandoCodigo && (
                <Text style={styles.statusTextValid}>✓ Código válido</Text>
              )}
              {erroCodigo && !verificandoCodigo && (
                <Text style={styles.statusTextInvalid}>{erroCodigo}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Cadastrando..." : "Cadastrar Funcionário"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: { width: 54, height: 60 },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: "#f0fdf4" },
  pageTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  pageDescription: { fontSize: 14, color: "#64748b", marginTop: 4 },
  form: { padding: 16, paddingTop: 24 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#1e293b",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  statusTextValid: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 4,
  },
  statusTextInvalid: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#94a3b8" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
};
