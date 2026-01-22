/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Cadastro de Visitante (IGUAL AO FRONTEND)
 * Formulário completo com 3 etapas:
 *   1. Dados Pessoais
 *   2. Veículo
 *   3. Fotos
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// Componentes
import { Button, Input, Loading, Card, Select } from "../../components";

// Services
import { visitantesService, dadosApoioService } from "../../services";
import { getCacheAsync, setCache } from "../../services/cacheService";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 1, title: "Pessoais", icon: "user" },
  { id: 2, title: "Veículo", icon: "truck" },
  { id: 3, title: "Fotos", icon: "image" },
];

const MAX_FOTOS = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function Visitante() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS
  // ═══════════════════════════════════════════════════════════════════════════

  // Etapa atual
  const [currentStep, setCurrentStep] = useState(1);

  // Dados do formulário (igual ao frontend)
  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    cpf: "",
    empresa_id: "",
    setor_id: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
    funcao_visitante_id: "",
    observacao: "",
    fotos: [],
  });

  // Dados de apoio (carregados do cache/API)
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [coresVeiculos, setCoresVeiculos] = useState([]);
  const [tiposVeiculos, setTiposVeiculos] = useState([]);
  const [funcoesVisitantes, setFuncoesVisitantes] = useState([]);

  // Estados de controle
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // Date picker
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [dataNascimento, setDataNascimento] = useState(null);

  // Erros
  const [erros, setErros] = useState({});

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS DE APOIO
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      // Tenta pegar do cache primeiro (assíncrono para verificar AsyncStorage também)
      let empresas = await getCacheAsync("empresasVisitantes");
      let setores = await getCacheAsync("setoresVisitantes");
      let cores = await getCacheAsync("coresVeiculos");
      let tipos = await getCacheAsync("tiposVeiculos");
      let funcoes = await getCacheAsync("funcoesVisitantes");

      // Se não tem cache, carrega da API
      if (!empresas || !setores || !cores || !tipos || !funcoes) {
        console.log("📡 Carregando dados da API...");
        const dados = await dadosApoioService.carregarTodosDados();
        empresas = dados.empresas || [];
        setores = dados.setores || [];
        cores = dados.cores || [];
        tipos = dados.tipos || [];
        funcoes = dados.funcoes || [];

        // Salva no cache
        await setCache("empresasVisitantes", empresas);
        await setCache("setoresVisitantes", setores);
        await setCache("coresVeiculos", cores);
        await setCache("tiposVeiculos", tipos);
        await setCache("funcoesVisitantes", funcoes);
      } else {
        console.log("📦 Dados carregados do cache");
      }

      console.log("📊 Empresas carregadas:", empresas?.length || 0);
      console.log("📊 Setores carregados:", setores?.length || 0);
      console.log("📊 Cores carregadas:", cores?.length || 0);
      console.log("📊 Tipos carregados:", tipos?.length || 0);
      console.log("📊 Funções carregadas:", funcoes?.length || 0);

      setEmpresasVisitantes(empresas || []);
      setSetoresVisitantes(setores || []);
      setCoresVeiculos(cores || []);
      setTiposVeiculos(tipos || []);
      setFuncoesVisitantes(funcoes || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert(
        "Erro",
        "Não foi possível carregar os dados. Tente novamente.",
      );
    } finally {
      setCarregando(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES (igual ao frontend)
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarCPF = (texto) => {
    const numeros = texto.replace(/\D/g, "").slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  };

  const formatarTelefone = (texto) => {
    const numeros = texto.replace(/\D/g, "").slice(0, 11);
    if (numeros.length === 11) {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return numeros;
  };

  const formatarPlaca = (texto) => {
    const limpo = texto
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);

    if (limpo.length <= 3) {
      return limpo;
    }
    return `${limpo.slice(0, 3)}${limpo.slice(3)}`;
  };

  const formatarData = (data) => {
    if (!data) return "";
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataParaAPI = (data) => {
    if (!data) return "";
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleChange = (campo, valor) => {
    let novoValor = valor;

    if (campo === "nome") {
      novoValor = valor.toUpperCase();
    } else if (campo === "placa_veiculo") {
      novoValor = formatarPlaca(valor);
    }

    setForm((prev) => ({ ...prev, [campo]: novoValor }));

    // Limpa erro do campo
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: "" }));
    }
  };

  const handleCpfChange = (texto) => {
    const formatted = formatarCPF(texto);
    setForm((prev) => ({ ...prev, cpf: formatted }));
    if (erros.cpf) {
      setErros((prev) => ({ ...prev, cpf: "" }));
    }
  };

  const handleTelefoneChange = (texto) => {
    const formatted = formatarTelefone(texto);
    setForm((prev) => ({ ...prev, telefone: formatted }));
    if (erros.telefone) {
      setErros((prev) => ({ ...prev, telefone: "" }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setMostrarDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDataNascimento(selectedDate);
      setForm((prev) => ({
        ...prev,
        nascimento: formatarDataParaAPI(selectedDate),
      }));
      if (erros.nascimento) {
        setErros((prev) => ({ ...prev, nascimento: "" }));
      }
    }
  };

  const handleSelectChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor || "" }));
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: "" }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FOTOS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAdicionarFoto = async () => {
    if (form.fotos.length >= MAX_FOTOS) {
      Alert.alert(
        "Limite atingido",
        `Máximo de ${MAX_FOTOS} fotos permitidas.`,
      );
      return;
    }

    Alert.alert("Adicionar Foto", "Selecione uma opção", [
      {
        text: "Tirar Foto",
        onPress: () => tirarFoto(),
      },
      {
        text: "Escolher da Galeria",
        onPress: () => escolherDaGaleria(),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        "Permissão negada",
        "Permita o acesso à câmera para continuar.",
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      adicionarFoto(resultado.assets[0].uri);
    }
  };

  const escolherDaGaleria = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        "Permissão negada",
        "Permita o acesso à galeria para continuar.",
      );
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      adicionarFoto(resultado.assets[0].uri);
    }
  };

  const adicionarFoto = (uri) => {
    setForm((prev) => {
      if (prev.fotos.length >= MAX_FOTOS) {
        return prev;
      }
      return { ...prev, fotos: [...prev.fotos, uri] };
    });
  };

  const removerFoto = (index) => {
    setForm((prev) => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index),
    }));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO POR ETAPA (igual ao frontend)
  // ═══════════════════════════════════════════════════════════════════════════

  const validarEtapa = (etapa) => {
    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const novosErros = {};

    switch (etapa) {
      case 1:
        if (!form.nome.trim()) {
          novosErros.nome = "Nome é obrigatório";
        }
        if (!form.nascimento) {
          novosErros.nascimento = "Data de nascimento é obrigatória";
        }
        if (cpfClean.length !== 11) {
          novosErros.cpf = "CPF deve ter 11 dígitos";
        }
        if (!form.empresa_id) {
          novosErros.empresa_id = "Empresa é obrigatória";
        }
        if (!form.setor_id) {
          novosErros.setor_id = "Setor é obrigatório";
        }
        if (telefoneClean.length !== 11) {
          novosErros.telefone = "Telefone deve ter 11 dígitos com DDD";
        }
        break;

      case 2:
        const placaClean = form.placa_veiculo
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
        const hasPlaca = placaClean.trim().length > 0;
        const hasCor = form.cor_veiculo_visitante_id !== "";
        const hasTipo = form.tipo_veiculo_visitante_id !== "";

        if (hasPlaca && !hasCor) {
          novosErros.cor_veiculo_visitante_id =
            "Cor é obrigatória quando a placa é informada";
        }
        if (hasPlaca && !hasTipo) {
          novosErros.tipo_veiculo_visitante_id =
            "Tipo é obrigatório quando a placa é informada";
        }
        if ((hasCor || hasTipo) && !hasPlaca) {
          novosErros.placa_veiculo =
            "Placa é obrigatória quando cor/tipo é informado";
        }
        if (hasPlaca && placaClean.length < 7) {
          novosErros.placa_veiculo = "Placa deve ter 7 caracteres";
        }
        break;

      case 3:
        if (form.fotos.length === 0) {
          novosErros.fotos = "Envie pelo menos uma foto";
        }
        break;
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVEGAÇÃO ENTRE ETAPAS
  // ═══════════════════════════════════════════════════════════════════════════

  const proximaEtapa = () => {
    if (validarEtapa(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const etapaAnterior = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const irParaEtapa = (etapa) => {
    if (etapa < currentStep) {
      setCurrentStep(etapa);
    } else if (etapa === currentStep + 1 && validarEtapa(currentStep)) {
      setCurrentStep(etapa);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCadastrar = async () => {
    // Validar todas as etapas
    if (!validarEtapa(1) || !validarEtapa(2) || !validarEtapa(3)) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setEnviando(true);
      setUploadProgress(0);
      setUploadStatus("Verificando CPF...");

      const cpfClean = form.cpf.replace(/\D/g, "");

      // Verifica se CPF já existe
      const { exists } = await visitantesService.buscarPorCpf(cpfClean);
      if (exists) {
        setEnviando(false);
        Alert.alert("Erro", "CPF já cadastrado. Verifique antes de continuar.");
        return;
      }

      setUploadStatus("Preparando dados...");
      setUploadProgress(10);

      // Prepara FormData
      const formData = new FormData();
      formData.append("nome", form.nome);
      formData.append("nascimento", form.nascimento);
      formData.append("cpf", cpfClean);
      formData.append("empresa", form.empresa_id);
      formData.append("setor", form.setor_id);
      formData.append("telefone", form.telefone.replace(/\D/g, ""));

      // Campos opcionais de veículo - só adiciona se tiver valor
      const placaLimpa = form.placa_veiculo
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
      if (placaLimpa) {
        formData.append("placa_veiculo", placaLimpa);
      }
      if (form.cor_veiculo_visitante_id) {
        formData.append(
          "cor_veiculo_visitante_id",
          form.cor_veiculo_visitante_id,
        );
      }
      if (form.tipo_veiculo_visitante_id) {
        formData.append(
          "tipo_veiculo_visitante_id",
          form.tipo_veiculo_visitante_id,
        );
      }
      if (form.funcao_visitante_id) {
        formData.append("funcao_visitante_id", form.funcao_visitante_id);
      }
      formData.append("observacao", form.observacao || "");

      // Adiciona fotos - formato correto para React Native/Expo
      for (let i = 0; i < form.fotos.length; i++) {
        const uri = form.fotos[i];

        // Extrai nome do arquivo da URI
        const uriParts = uri.split("/");
        const fileName = uriParts[uriParts.length - 1];

        // Determina o tipo MIME
        const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = extension === "png" ? "image/png" : "image/jpeg";

        console.log(`📷 Foto ${i + 1}:`, { uri, fileName, mimeType });

        formData.append("fotos", {
          uri: uri,
          name: fileName,
          type: mimeType,
        });
      }

      console.log("📤 Enviando FormData com", form.fotos.length, "fotos");

      setUploadStatus("Enviando dados e fotos...");
      setUploadProgress(30);

      await visitantesService.criar(formData);

      setUploadStatus("Finalizando cadastro...");
      setUploadProgress(100);

      setTimeout(() => {
        setEnviando(false);
        Alert.alert("Sucesso!", "Visitante cadastrado com sucesso.", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      }, 500);
    } catch (erro) {
      console.error("Erro ao cadastrar visitante:", erro);
      console.error("Detalhes do erro:", {
        message: erro.message,
        code: erro.code,
        response: erro.response?.data,
        status: erro.response?.status,
      });
      setEnviando(false);

      // Mensagem de erro mais específica
      let mensagemErro = "Não foi possível cadastrar o visitante.";
      if (erro.message === "Network Error") {
        mensagemErro =
          "Erro de conexão. Verifique sua internet e tente novamente.";
      } else if (erro.response?.data?.error) {
        mensagemErro = erro.response.data.error;
      } else if (erro.response?.data?.message) {
        mensagemErro = erro.response.data.message;
      }

      Alert.alert("Erro", mensagemErro);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO DO STEPPER
  // ═══════════════════════════════════════════════════════════════════════════

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      <View style={styles.stepperLine} />
      <View
        style={[
          styles.stepperProgress,
          { width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` },
        ]}
      />

      {STEPS.map((step) => (
        <TouchableOpacity
          key={step.id}
          style={[
            styles.step,
            currentStep === step.id && styles.stepActive,
            currentStep > step.id && styles.stepCompleted,
          ]}
          onPress={() => irParaEtapa(step.id)}
        >
          <View
            style={[
              styles.stepCircle,
              currentStep === step.id && styles.stepCircleActive,
              currentStep > step.id && styles.stepCircleCompleted,
            ]}
          >
            {currentStep > step.id ? (
              <Feather name="check" size={14} color={cores.branco} />
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  (currentStep === step.id || currentStep > step.id) &&
                    styles.stepNumberActive,
                ]}
              >
                {step.id}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === step.id && styles.stepLabelActive,
              currentStep > step.id && styles.stepLabelCompleted,
            ]}
          >
            {step.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO DA ETAPA 1: DADOS PESSOAIS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderEtapa1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleContainer}>
          <Feather name="user" size={20} color={cores.destaque} />
          <Text style={styles.stepTitle}>Dados Pessoais</Text>
        </View>
        <Text style={styles.stepDescription}>
          Informe os dados pessoais do visitante
        </Text>
      </View>

      <Input
        label="Nome Completo"
        valor={form.nome}
        onChangeText={(texto) => handleChange("nome", texto)}
        placeholder="Digite o nome completo"
        iconeEsquerda="user"
        erro={erros.nome}
        autoCapitalize="characters"
        obrigatorio
      />

      {/* Data de Nascimento */}
      <View style={styles.campoContainer}>
        <Text style={styles.label}>
          Data de Nascimento <Text style={styles.obrigatorio}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.campoData, erros.nascimento && styles.campoErro]}
          onPress={() => setMostrarDatePicker(true)}
        >
          <Feather name="calendar" size={20} color={cores.textoSecundario} />
          <Text
            style={[
              styles.campoDataTexto,
              !dataNascimento && styles.placeholder,
            ]}
          >
            {dataNascimento ? formatarData(dataNascimento) : "Selecione a data"}
          </Text>
        </TouchableOpacity>
        {erros.nascimento && (
          <Text style={styles.erroTexto}>{erros.nascimento}</Text>
        )}
      </View>

      {mostrarDatePicker && (
        <DateTimePicker
          value={dataNascimento || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      <Input
        label="CPF"
        valor={form.cpf}
        onChangeText={handleCpfChange}
        placeholder="000.000.000-00"
        iconeEsquerda="credit-card"
        erro={erros.cpf}
        tipo="numero"
        maxLength={14}
        obrigatorio
      />

      <Select
        label="Empresa"
        placeholder="Selecione a empresa"
        value={form.empresa_id}
        onValueChange={(valor) => handleSelectChange("empresa_id", valor)}
        options={empresasVisitantes}
        icone="briefcase"
        erro={erros.empresa_id}
        obrigatorio
      />

      <Select
        label="Setor"
        placeholder="Selecione o setor"
        value={form.setor_id}
        onValueChange={(valor) => handleSelectChange("setor_id", valor)}
        options={setoresVisitantes}
        icone="grid"
        erro={erros.setor_id}
        obrigatorio
      />

      <Input
        label="Telefone"
        valor={form.telefone}
        onChangeText={handleTelefoneChange}
        placeholder="(00) 00000-0000"
        iconeEsquerda="phone"
        erro={erros.telefone}
        tipo="numero"
        maxLength={15}
        obrigatorio
      />
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO DA ETAPA 2: VEÍCULO
  // ═══════════════════════════════════════════════════════════════════════════

  const renderEtapa2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleContainer}>
          <Feather name="truck" size={20} color={cores.destaque} />
          <Text style={styles.stepTitle}>Informações do Veículo</Text>
        </View>
        <Text style={styles.stepDescription}>
          Preencha apenas se o visitante possuir veículo
        </Text>
      </View>

      {/* Alerta informativo */}
      <View style={styles.alertaContainer}>
        <Feather name="info" size={20} color={cores.info} />
        <Text style={styles.alertaTexto}>
          Se não houver veículo, deixe os campos em branco e avance para a
          próxima etapa.
        </Text>
      </View>

      <Select
        label="Função do Visitante"
        placeholder="Selecione a função"
        value={form.funcao_visitante_id}
        onValueChange={(valor) =>
          handleSelectChange("funcao_visitante_id", valor)
        }
        options={funcoesVisitantes}
        icone="award"
      />

      <Input
        label="Placa do Veículo"
        valor={form.placa_veiculo}
        onChangeText={(texto) => handleChange("placa_veiculo", texto)}
        placeholder="ABC1D23"
        iconeEsquerda="hash"
        erro={erros.placa_veiculo}
        autoCapitalize="characters"
        maxLength={7}
      />

      <Select
        label="Cor do Veículo"
        placeholder="Selecione a cor"
        value={form.cor_veiculo_visitante_id}
        onValueChange={(valor) =>
          handleSelectChange("cor_veiculo_visitante_id", valor)
        }
        options={coresVeiculos}
        icone="droplet"
        erro={erros.cor_veiculo_visitante_id}
      />

      <Select
        label="Tipo do Veículo"
        placeholder="Selecione o tipo"
        value={form.tipo_veiculo_visitante_id}
        onValueChange={(valor) =>
          handleSelectChange("tipo_veiculo_visitante_id", valor)
        }
        options={tiposVeiculos}
        icone="truck"
        erro={erros.tipo_veiculo_visitante_id}
      />

      <Input
        label="Observação"
        valor={form.observacao}
        onChangeText={(texto) => handleChange("observacao", texto)}
        placeholder="Informações adicionais..."
        iconeEsquerda="file-text"
        multiline
        numberOfLines={3}
      />
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO DA ETAPA 3: FOTOS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderEtapa3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleContainer}>
          <Feather name="image" size={20} color={cores.destaque} />
          <Text style={styles.stepTitle}>Fotos do Visitante</Text>
        </View>
        <Text style={styles.stepDescription}>
          Adicione até {MAX_FOTOS} fotos do visitante
        </Text>
      </View>

      {erros.fotos && (
        <View style={styles.erroContainer}>
          <Feather name="alert-circle" size={16} color={cores.erro} />
          <Text style={styles.erroTextoFoto}>{erros.fotos}</Text>
        </View>
      )}

      <View style={styles.fotosContainer}>
        {form.fotos.map((uri, index) => (
          <View key={index} style={styles.fotoWrapper}>
            <Image source={{ uri }} style={styles.foto} />
            <TouchableOpacity
              style={styles.fotoRemover}
              onPress={() => removerFoto(index)}
            >
              <Feather name="x" size={16} color={cores.branco} />
            </TouchableOpacity>
          </View>
        ))}

        {form.fotos.length < MAX_FOTOS && (
          <TouchableOpacity
            style={styles.fotoAdicionar}
            onPress={handleAdicionarFoto}
          >
            <Feather name="plus" size={32} color={cores.textoSecundario} />
            <Text style={styles.fotoAdicionarTexto}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.fotosContador}>
        {form.fotos.length}/{MAX_FOTOS} fotos adicionadas
      </Text>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <Loading texto="Carregando dados..." />
      </View>
    );
  }

  if (enviando) {
    return (
      <View style={styles.loadingContainer}>
        <Loading texto={uploadStatus} />
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${uploadProgress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
      >
        <TouchableOpacity
          style={styles.headerVoltar}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={cores.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Cadastrar Visitante</Text>

        <View style={styles.headerEspaco} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper */}
          {renderStepper()}

          {/* Conteúdo da etapa */}
          {currentStep === 1 && renderEtapa1()}
          {currentStep === 2 && renderEtapa2()}
          {currentStep === 3 && renderEtapa3()}

          {/* Botões de navegação */}
          <View style={styles.botoesContainer}>
            {currentStep > 1 ? (
              <View style={styles.botaoWrapper}>
                <Button
                  titulo="Voltar"
                  onPress={etapaAnterior}
                  variante="outline"
                  icone="arrow-left"
                  tamanho="grande"
                />
              </View>
            ) : (
              <View style={styles.botaoWrapper} />
            )}

            <View
              style={[
                styles.botaoWrapper,
                currentStep === 1 && styles.botaoUnico,
              ]}
            >
              {currentStep < STEPS.length ? (
                <Button
                  titulo="Próximo"
                  onPress={proximaEtapa}
                  variante="destaque"
                  icone="arrow-right"
                  tamanho="grande"
                />
              ) : (
                <Button
                  titulo="Cadastrar Visitante"
                  onPress={handleCadastrar}
                  variante="destaque"
                  icone="check"
                  tamanho="grande"
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.primaria,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    justifyContent: "center",
    alignItems: "center",
  },

  progressContainer: {
    width: "80%",
    marginTop: espacamento.lg,
    alignItems: "center",
  },

  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: cores.borda,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: cores.destaque,
  },

  progressText: {
    marginTop: espacamento.sm,
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: espacamento.md,
    paddingBottom: espacamento.md,
  },

  headerVoltar: {
    padding: espacamento.xs,
  },

  headerTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.branco,
  },

  headerEspaco: {
    width: 40,
  },

  keyboardAvoiding: {
    flex: 1,
  },

  scroll: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  scrollContent: {
    padding: espacamento.lg,
    paddingBottom: espacamento.xxl,
  },

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: espacamento.xl,
    position: "relative",
    paddingHorizontal: 0,
  },

  stepperLine: {
    position: "absolute",
    top: 16,
    left: "10%",
    right: "10%",
    height: 2,
    backgroundColor: cores.borda,
  },

  stepperProgress: {
    position: "absolute",
    top: 16,
    left: "5%",
    height: 2,
    backgroundColor: cores.destaque,
    maxWidth: "90%",
  },

  step: {
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },

  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.fundoCard,
    borderWidth: 2,
    borderColor: cores.borda,
    alignItems: "center",
    justifyContent: "center",
  },

  stepCircleActive: {
    borderColor: cores.destaque,
    backgroundColor: cores.destaque,
  },

  stepCircleCompleted: {
    borderColor: cores.sucesso,
    backgroundColor: cores.sucesso,
  },

  stepNumber: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoBold,
    color: cores.textoSecundario,
  },

  stepNumberActive: {
    color: cores.branco,
  },

  stepLabel: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
    textAlign: "center",
  },

  stepLabelActive: {
    color: cores.destaque,
    fontWeight: tipografia.pesoMedium,
  },

  stepLabelCompleted: {
    color: cores.sucesso,
  },

  // Conteúdo da etapa
  stepContent: {
    marginBottom: espacamento.lg,
  },

  stepHeader: {
    marginBottom: espacamento.lg,
  },

  stepTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
    marginBottom: espacamento.xs,
  },

  stepTitle: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
  },

  stepDescription: {
    fontSize: tipografia.tamanhoTextoNormal,
    color: cores.textoSecundario,
  },

  // Alerta
  alertaContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${cores.info}15`,
    padding: espacamento.md,
    borderRadius: bordas.medio,
    marginBottom: espacamento.lg,
    gap: espacamento.sm,
  },

  alertaTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.info,
  },

  // Campo de data
  campoContainer: {
    marginBottom: espacamento.md,
  },

  label: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoMedium,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  obrigatorio: {
    color: cores.erro,
  },

  campoData: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: bordas.medio,
    paddingHorizontal: espacamento.md,
    height: 50,
    gap: espacamento.sm,
  },

  campoErro: {
    borderColor: cores.erro,
  },

  campoDataTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoNormal,
    color: cores.texto,
  },

  placeholder: {
    color: cores.textoSecundario,
  },

  erroTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.erro,
    marginTop: espacamento.xs,
  },

  // Fotos
  fotosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacamento.md,
    marginTop: espacamento.md,
  },

  fotoWrapper: {
    position: "relative",
  },

  foto: {
    width: 100,
    height: 100,
    borderRadius: bordas.medio,
  },

  fotoRemover: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cores.erro,
    alignItems: "center",
    justifyContent: "center",
  },

  fotoAdicionar: {
    width: 100,
    height: 100,
    borderRadius: bordas.medio,
    borderWidth: 2,
    borderColor: cores.borda,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },

  fotoAdicionarTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
  },

  fotosContador: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
    textAlign: "center",
  },

  erroContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.xs,
    marginBottom: espacamento.sm,
  },

  erroTextoFoto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.erro,
  },

  // Botões
  botoesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: espacamento.md,
    marginTop: espacamento.xl,
    paddingBottom: espacamento.lg,
  },

  botaoWrapper: {
    flex: 1,
  },

  botaoUnico: {
    flex: 1,
  },
});
