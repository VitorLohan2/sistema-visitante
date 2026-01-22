/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Editar Cadastro de Visitante (COMPLETO - Igual ao Frontend)
 * Formulário completo com todos os campos, selects e função de bloqueio
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
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// Componentes
import { Button, Input, Loading, Select } from "../../components";

// Services
import { visitantesService, dadosApoioService } from "../../services";
import { getCacheAsync, setCache } from "../../services/cacheService";

// Hooks
import { usePermissoes } from "../../hooks";

// Estilos
import {
  cores,
  tipografia,
  espacamento,
  bordas,
  sombras,
} from "../../styles/tema";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EditarCadastroVisitante() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { temPermissao } = usePermissoes();
  const { visitante } = route.params || {};

  // Permissão para bloquear/desbloquear visitantes
  const podeBloquer = temPermissao("cadastro_bloquear");

  // Estados do formulário (igual ao frontend)
  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    cpf: "",
    empresa: "",
    setor: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
    funcao_visitante_id: "",
    observacao: "",
    bloqueado: false,
  });

  // Dados de apoio (carregados do cache/API)
  const [empresasVisitantes, setEmpresasVisitantes] = useState([]);
  const [setoresVisitantes, setSetoresVisitantes] = useState([]);
  const [coresVeiculos, setCoresVeiculos] = useState([]);
  const [tiposVeiculos, setTiposVeiculos] = useState([]);
  const [funcoesVisitantes, setFuncoesVisitantes] = useState([]);

  // Fotos
  const [fotos, setFotos] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoAlterada, setFotoAlterada] = useState(false);

  // Estados de controle
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  // Date picker
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [dataNascimento, setDataNascimento] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      // Carrega dados de apoio
      let empresas = await getCacheAsync("empresasVisitantes");
      let setores = await getCacheAsync("setoresVisitantes");
      let cores = await getCacheAsync("coresVeiculos");
      let tipos = await getCacheAsync("tiposVeiculos");
      let funcoes = await getCacheAsync("funcoesVisitantes");

      if (!empresas || !setores || !cores || !tipos || !funcoes) {
        console.log("📡 Carregando dados de apoio da API...");
        const dados = await dadosApoioService.carregarTodosDados();
        empresas = dados.empresas || [];
        setores = dados.setores || [];
        cores = dados.cores || [];
        tipos = dados.tipos || [];
        funcoes = dados.funcoes || [];

        await setCache("empresasVisitantes", empresas);
        await setCache("setoresVisitantes", setores);
        await setCache("coresVeiculos", cores);
        await setCache("tiposVeiculos", tipos);
        await setCache("funcoesVisitantes", funcoes);
      }

      setEmpresasVisitantes(empresas);
      setSetoresVisitantes(setores);
      setCoresVeiculos(cores);
      setTiposVeiculos(tipos);
      setFuncoesVisitantes(funcoes);

      // Preenche o formulário com dados do visitante
      if (visitante) {
        // Parse da data de nascimento
        let dataNasc = null;
        if (visitante.nascimento) {
          dataNasc = new Date(visitante.nascimento);
          setDataNascimento(dataNasc);
        }

        // Encontra empresa e setor pelo ID ou nome
        const empresaId =
          visitante.empresa_id ||
          empresas.find(
            (e) =>
              e.nome === visitante.empresa || e.nome === visitante.empresa_nome,
          )?.id ||
          "";
        const setorId =
          visitante.setor_id ||
          setores.find(
            (s) =>
              s.nome === visitante.setor || s.nome === visitante.setor_nome,
          )?.id ||
          "";

        setForm({
          nome: visitante.nome || "",
          nascimento: visitante.nascimento || "",
          cpf: formatarCPF(visitante.cpf || ""),
          empresa: empresaId,
          setor: setorId,
          telefone: formatarTelefone(visitante.telefone || ""),
          placa_veiculo: formatarPlaca(visitante.placa_veiculo || ""),
          cor_veiculo_visitante_id: visitante.cor_veiculo_visitante_id || "",
          tipo_veiculo_visitante_id: visitante.tipo_veiculo_visitante_id || "",
          funcao_visitante_id: visitante.funcao_visitante_id || "",
          observacao: visitante.observacao || "",
          bloqueado: Boolean(visitante.bloqueado),
        });

        setFotos(visitante.fotos || []);
        setAvatar(visitante.avatar_imagem || visitante.fotos?.[0] || "");
        setFoto(visitante.foto_url || visitante.avatar_imagem || null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES (igual ao frontend)
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarCPF = (texto) => {
    if (!texto) return "";
    const numeros = texto.replace(/\D/g, "").slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2");
  };

  const formatarTelefone = (texto) => {
    if (!texto) return "";
    const numeros = texto.replace(/\D/g, "").slice(0, 11);
    if (numeros.length === 11) {
      return numeros.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (numeros.length === 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numeros;
  };

  const formatarPlaca = (texto) => {
    if (!texto) return "";
    return texto
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);
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
  };

  const handleDateChange = (event, selectedDate) => {
    setMostrarDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDataNascimento(selectedDate);
      setForm((prev) => ({
        ...prev,
        nascimento: formatarDataParaAPI(selectedDate),
      }));
    }
  };

  const handleSelectChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor || "" }));
    if (erros[campo]) {
      setErros((prev) => ({ ...prev, [campo]: "" }));
    }
  };

  const handleBlockChange = (value) => {
    if (!podeBloquer) return;
    setForm((prev) => ({ ...prev, bloqueado: value }));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FOTO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSelecionarFoto = async () => {
    const opcoes = [
      { titulo: "Tirar Foto", acao: "camera" },
      { titulo: "Escolher da Galeria", acao: "galeria" },
    ];

    if (foto) {
      opcoes.push({ titulo: "Remover Foto", acao: "remover" });
    }

    Alert.alert("Foto do Visitante", "Selecione uma opção", [
      ...opcoes.map((opcao) => ({
        text: opcao.titulo,
        onPress: () => executarOpcaoFoto(opcao.acao),
      })),
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const executarOpcaoFoto = async (acao) => {
    if (acao === "remover") {
      setFoto(null);
      setFotoAlterada(true);
      return;
    }

    const permissao =
      acao === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert("Permissão negada", "Permita o acesso para continuar.");
      return;
    }

    const resultado =
      acao === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

    if (!resultado.canceled && resultado.assets[0]) {
      setFoto(resultado.assets[0].uri);
      setFotoAlterada(true);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO (igual ao frontend)
  // ═══════════════════════════════════════════════════════════════════════════

  const validarFormulario = () => {
    const novosErros = {};
    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = form.placa_veiculo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    if (!form.nome.trim()) {
      novosErros.nome = "Nome é obrigatório";
    }

    if (cpfClean.length !== 11) {
      novosErros.cpf = "CPF inválido. Deve conter 11 dígitos.";
    }

    if (telefoneClean.length !== 11 && telefoneClean.length !== 10) {
      novosErros.telefone = "Telefone inválido";
    }

    if (!form.empresa) {
      novosErros.empresa = "Empresa é obrigatória";
    }

    if (!form.setor) {
      novosErros.setor = "Setor é obrigatório";
    }

    // Validação de veículo (igual ao frontend)
    const hasPlaca = placaClean.trim().length > 0;
    const hasCor =
      form.cor_veiculo_visitante_id !== "" &&
      form.cor_veiculo_visitante_id !== null;
    const hasTipo =
      form.tipo_veiculo_visitante_id !== "" &&
      form.tipo_veiculo_visitante_id !== null;

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

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ATUALIZAR
  // ═══════════════════════════════════════════════════════════════════════════

  const handleAtualizar = async () => {
    if (!validarFormulario()) {
      Alert.alert("Erro", "Por favor, corrija os erros no formulário.");
      return;
    }

    try {
      setSalvando(true);

      const cpfClean = form.cpf.replace(/\D/g, "");
      const telefoneClean = form.telefone.replace(/\D/g, "");
      const placaClean = form.placa_veiculo
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();

      // Encontra os nomes da empresa e setor pelos IDs
      const empresaSelecionada = empresasVisitantes.find(
        (e) => e.id === form.empresa,
      );
      const setorSelecionado = setoresVisitantes.find(
        (s) => s.id === form.setor,
      );

      const payload = {
        nome: form.nome,
        nascimento: form.nascimento,
        cpf: cpfClean,
        empresa: empresaSelecionada?.nome || form.empresa,
        setor: setorSelecionado?.nome || form.setor,
        telefone: telefoneClean,
        placa_veiculo: placaClean,
        cor_veiculo_visitante_id: form.cor_veiculo_visitante_id || null,
        tipo_veiculo_visitante_id: form.tipo_veiculo_visitante_id || null,
        funcao_visitante_id: form.funcao_visitante_id || null,
        observacao: form.observacao,
        avatar_imagem: avatar,
        bloqueado: form.bloqueado,
      };

      // Se a foto foi alterada, usa FormData
      if (fotoAlterada) {
        const formData = new FormData();
        Object.keys(payload).forEach((key) => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
          }
        });

        if (foto && !foto.startsWith("http")) {
          formData.append("foto", {
            uri: foto,
            type: "image/jpeg",
            name: "foto.jpg",
          });
        } else if (!foto) {
          formData.append("remover_foto", "true");
        }

        await visitantesService.atualizar(visitante.id, formData);
      } else {
        await visitantesService.atualizar(visitante.id, payload);
      }

      Alert.alert("Sucesso!", "Visitante atualizado com sucesso.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (erro) {
      console.error("Erro ao atualizar visitante:", erro);
      Alert.alert(
        "Erro",
        erro.response?.data?.message ||
          erro.response?.data?.error ||
          "Não foi possível atualizar o visitante.",
      );
    } finally {
      setSalvando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXCLUIR
  // ═══════════════════════════════════════════════════════════════════════════

  const handleExcluir = () => {
    Alert.alert(
      "Excluir Visitante",
      `Tem certeza que deseja excluir ${visitante?.nome}? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setSalvando(true);
              await visitantesService.deletar(visitante.id);
              Alert.alert("Sucesso", "Visitante excluído com sucesso.");
              navigation.navigate("ListagemVisitante");
            } catch (erro) {
              Alert.alert("Erro", "Não foi possível excluir o visitante.");
            } finally {
              setSalvando(false);
            }
          },
        },
      ],
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  if (carregando) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Editar Visitante</Text>
          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.loadingContainer}>
          <Loading mensagem="Carregando dados..." />
        </View>
      </View>
    );
  }

  if (!visitante) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Editar Visitante</Text>
          <View style={styles.headerEspaco} />
        </View>
        <View style={styles.vazio}>
          <Feather name="user-x" size={64} color={cores.textoSecundario} />
          <Text style={styles.vazioTexto}>Visitante não encontrado</Text>
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
        <Text style={styles.headerTitulo}>Editar Visitante</Text>
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
          {/* Foto */}
          <View style={styles.fotoContainer}>
            <TouchableOpacity
              style={styles.fotoWrapper}
              onPress={handleSelecionarFoto}
            >
              {foto ? (
                <Image source={{ uri: foto }} style={styles.foto} />
              ) : (
                <View style={styles.fotoPlaceholder}>
                  <Feather
                    name="camera"
                    size={32}
                    color={cores.textoSecundario}
                  />
                  <Text style={styles.fotoTexto}>Adicionar Foto</Text>
                </View>
              )}
              <View style={styles.fotoIcone}>
                <Feather name="edit-2" size={14} color={cores.branco} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Dados Pessoais */}
          <Text style={styles.secaoTitulo}>Dados Pessoais</Text>

          <Input
            label="Nome Completo *"
            valor={form.nome}
            onChangeText={(texto) => handleChange("nome", texto)}
            placeholder="Digite o nome completo"
            iconeEsquerda="user"
            erro={erros.nome}
            autoCapitalize="characters"
          />

          {/* Data de Nascimento */}
          <View style={styles.campoContainer}>
            <Text style={styles.label}>Data de Nascimento</Text>
            <TouchableOpacity
              style={[styles.campoData, erros.nascimento && styles.campoErro]}
              onPress={() => setMostrarDatePicker(true)}
            >
              <Feather
                name="calendar"
                size={20}
                color={cores.textoSecundario}
              />
              <Text
                style={[
                  styles.campoDataTexto,
                  !dataNascimento && styles.placeholder,
                ]}
              >
                {dataNascimento
                  ? formatarData(dataNascimento)
                  : "Selecione a data"}
              </Text>
            </TouchableOpacity>
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
            label="CPF *"
            valor={form.cpf}
            onChangeText={handleCpfChange}
            placeholder="000.000.000-00"
            iconeEsquerda="credit-card"
            erro={erros.cpf}
            tipo="numero"
            maxLength={14}
          />

          {/* Contato */}
          <Text style={styles.secaoTitulo}>Contato</Text>

          <Input
            label="Telefone *"
            valor={form.telefone}
            onChangeText={handleTelefoneChange}
            placeholder="(00) 00000-0000"
            iconeEsquerda="phone"
            erro={erros.telefone}
            tipo="numero"
            maxLength={15}
          />

          {/* Empresa e Setor */}
          <Text style={styles.secaoTitulo}>Empresa</Text>

          <Select
            label="Empresa"
            placeholder="Selecione a empresa"
            value={form.empresa}
            onValueChange={(valor) => handleSelectChange("empresa", valor)}
            options={empresasVisitantes}
            icone="briefcase"
            erro={erros.empresa}
            obrigatorio
          />

          <Select
            label="Setor"
            placeholder="Selecione o setor"
            value={form.setor}
            onValueChange={(valor) => handleSelectChange("setor", valor)}
            options={setoresVisitantes}
            icone="grid"
            erro={erros.setor}
            obrigatorio
          />

          <Select
            label="Função do Visitante"
            placeholder="Selecione a função (opcional)"
            value={form.funcao_visitante_id}
            onValueChange={(valor) =>
              handleSelectChange("funcao_visitante_id", valor)
            }
            options={funcoesVisitantes}
            icone="award"
          />

          {/* Veículo */}
          <Text style={styles.secaoTitulo}>Veículo (Opcional)</Text>

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

          {/* Observações */}
          <Text style={styles.secaoTitulo}>Observações</Text>

          <Input
            label="Observação"
            valor={form.observacao}
            onChangeText={(texto) => handleChange("observacao", texto)}
            placeholder="Informações adicionais..."
            iconeEsquerda="file-text"
            multiline
            numberOfLines={4}
          />

          {/* Status de Bloqueio */}
          <Text style={styles.secaoTitulo}>Status do Cadastro</Text>

          <View style={styles.bloqueioContainer}>
            <View style={styles.bloqueioInfo}>
              <Feather
                name={form.bloqueado ? "lock" : "unlock"}
                size={24}
                color={form.bloqueado ? cores.erro : cores.sucesso}
              />
              <View style={styles.bloqueioTextos}>
                <Text style={styles.bloqueioTitulo}>
                  {form.bloqueado ? "Cadastro Bloqueado" : "Cadastro Ativo"}
                </Text>
                <Text style={styles.bloqueioDescricao}>
                  {form.bloqueado
                    ? "O visitante não poderá fazer check-in"
                    : "O visitante pode fazer check-in normalmente"}
                </Text>
              </View>
            </View>
            <Switch
              value={form.bloqueado}
              onValueChange={handleBlockChange}
              trackColor={{ false: cores.cinzaMedio, true: `${cores.erro}50` }}
              thumbColor={form.bloqueado ? cores.erro : cores.sucesso}
              disabled={!podeBloquer}
            />
          </View>

          {!podeBloquer && (
            <Text style={styles.semPermissao}>
              Você não tem permissão para bloquear/desbloquear visitantes
            </Text>
          )}

          {/* Fotos do visitante (se houver) */}
          {fotos.length > 0 && (
            <>
              <Text style={styles.secaoTitulo}>Selecionar Avatar</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.fotosLista}
              >
                {fotos.map((fotoUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.fotoItem,
                      avatar === fotoUrl && styles.fotoItemSelecionada,
                    ]}
                    onPress={() => setAvatar(fotoUrl)}
                  >
                    <Image
                      source={{ uri: fotoUrl }}
                      style={styles.fotoItemImage}
                    />
                    {avatar === fotoUrl && (
                      <View style={styles.fotoItemCheck}>
                        <Feather name="check" size={16} color={cores.branco} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Botões */}
          <View style={styles.botoesContainer}>
            <Button
              titulo="Salvar Alterações"
              onPress={handleAtualizar}
              carregando={salvando}
              variante="primario"
              icone="check"
              tamanho="grande"
            />

            <Button
              titulo="Cancelar"
              onPress={() => navigation.goBack()}
              variante="outline"
              tamanho="grande"
              desabilitado={salvando}
            />

            {temPermissao("cadastro_excluir") && (
              <Button
                titulo="Excluir Visitante"
                onPress={handleExcluir}
                variante="erro"
                icone="trash-2"
                tamanho="grande"
                desabilitado={salvando}
              />
            )}
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

  loadingContainer: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  // Vazio
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  vazioTexto: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.textoSecundario,
    marginTop: espacamento.md,
  },

  // Foto
  fotoContainer: {
    alignItems: "center",
    marginBottom: espacamento.xl,
  },

  fotoWrapper: {
    position: "relative",
  },

  foto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: cores.destaque,
  },

  fotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: cores.fundoCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.borda,
    borderStyle: "dashed",
  },

  fotoTexto: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: espacamento.xs,
  },

  fotoIcone: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: cores.branco,
  },

  // Seção
  secaoTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.lg,
    marginBottom: espacamento.md,
  },

  // Campo de data
  campoContainer: {
    marginBottom: espacamento.md,
  },

  label: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoMedio,
    color: cores.texto,
    marginBottom: espacamento.xs,
  },

  campoData: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoCard,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: bordas.raioMedio,
    paddingHorizontal: espacamento.md,
    height: 50,
    gap: espacamento.sm,
  },

  campoErro: {
    borderColor: cores.erro,
  },

  campoDataTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
  },

  placeholder: {
    color: cores.textoSecundario,
  },

  // Bloqueio
  bloqueioContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: cores.fundoCard,
    padding: espacamento.md,
    borderRadius: bordas.raioMedio,
    ...sombras.pequena,
  },

  bloqueioInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: espacamento.md,
  },

  bloqueioTextos: {
    flex: 1,
  },

  bloqueioTitulo: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.texto,
  },

  bloqueioDescricao: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    marginTop: 2,
  },

  semPermissao: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    fontStyle: "italic",
    marginTop: espacamento.sm,
    textAlign: "center",
  },

  // Fotos lista
  fotosLista: {
    marginBottom: espacamento.md,
  },

  fotoItem: {
    width: 80,
    height: 80,
    borderRadius: bordas.raioMedio,
    marginRight: espacamento.sm,
    borderWidth: 2,
    borderColor: cores.borda,
    overflow: "hidden",
  },

  fotoItemSelecionada: {
    borderColor: cores.destaque,
    borderWidth: 3,
  },

  fotoItemImage: {
    width: "100%",
    height: "100%",
  },

  fotoItemCheck: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: cores.destaque,
    alignItems: "center",
    justifyContent: "center",
  },

  // Botões
  botoesContainer: {
    gap: espacamento.md,
    marginTop: espacamento.xl,
  },
});
