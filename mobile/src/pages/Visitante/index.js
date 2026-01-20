/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Cadastro de Visitante
 * Formulário completo para cadastrar novo visitante
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

// Componentes
import { Button, Input, Loading, Card } from "../../components";

// Services
import { visitantesService } from "../../services";

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

export default function Visitante() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [funcao, setFuncao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState(null);

  // Estados de controle
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState({});

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATADORES
  // ═══════════════════════════════════════════════════════════════════════════

  const formatarCPF = (texto) => {
    const numeros = texto.replace(/\D/g, "");
    return numeros
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatarTelefone = (texto) => {
    const numeros = texto.replace(/\D/g, "");
    if (numeros.length <= 10) {
      return numeros
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numeros
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  const validarFormulario = () => {
    const novosErros = {};

    if (!nome.trim()) {
      novosErros.nome = "Nome é obrigatório";
    }

    if (!cpf.trim()) {
      novosErros.cpf = "CPF é obrigatório";
    } else if (cpf.replace(/\D/g, "").length !== 11) {
      novosErros.cpf = "CPF inválido";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      novosErros.email = "E-mail inválido";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FOTO
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSelecionarFoto = async () => {
    const opcoes = [
      { titulo: "Tirar Foto", icone: "camera", acao: "camera" },
      { titulo: "Escolher da Galeria", icone: "image", acao: "galeria" },
    ];

    if (foto) {
      opcoes.push({
        titulo: "Remover Foto",
        icone: "trash-2",
        acao: "remover",
      });
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
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CADASTRAR
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCadastrar = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setCarregando(true);

      const dados = {
        nome: nome.trim(),
        cpf: cpf.replace(/\D/g, ""),
        rg: rg.trim(),
        telefone: telefone.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
        empresa_nome: empresa.trim(),
        funcao: funcao.trim(),
        observacao: observacao.trim(),
      };

      // Se tiver foto, envia como FormData
      if (foto) {
        const formData = new FormData();
        Object.keys(dados).forEach((key) => {
          if (dados[key]) {
            formData.append(key, dados[key]);
          }
        });

        formData.append("foto", {
          uri: foto,
          type: "image/jpeg",
          name: "foto.jpg",
        });

        await visitantesService.criar(formData);
      } else {
        await visitantesService.criar(dados);
      }

      Alert.alert("Sucesso!", "Visitante cadastrado com sucesso.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (erro) {
      console.error("Erro ao cadastrar visitante:", erro);
      Alert.alert(
        "Erro",
        erro.response?.data?.message ||
          "Não foi possível cadastrar o visitante."
      );
    } finally {
      setCarregando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

      {/* Header Padronizado */}
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
            valor={nome}
            onChangeText={setNome}
            placeholder="Digite o nome completo"
            iconeEsquerda="user"
            erro={erros.nome}
            autoCapitalize="words"
          />

          <Input
            label="CPF *"
            valor={cpf}
            onChangeText={(texto) => setCpf(formatarCPF(texto))}
            placeholder="000.000.000-00"
            iconeEsquerda="credit-card"
            erro={erros.cpf}
            tipo="numero"
            maxLength={14}
          />

          <Input
            label="RG"
            valor={rg}
            onChangeText={setRg}
            placeholder="Digite o RG"
            iconeEsquerda="file-text"
          />

          {/* Contato */}
          <Text style={styles.secaoTitulo}>Contato</Text>

          <Input
            label="Telefone"
            valor={telefone}
            onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
            placeholder="(00) 00000-0000"
            iconeEsquerda="phone"
            tipo="numero"
            maxLength={15}
          />

          <Input
            label="E-mail"
            valor={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            iconeEsquerda="mail"
            tipo="email"
            erro={erros.email}
          />

          {/* Empresa */}
          <Text style={styles.secaoTitulo}>Empresa</Text>

          <Input
            label="Empresa"
            valor={empresa}
            onChangeText={setEmpresa}
            placeholder="Nome da empresa"
            iconeEsquerda="briefcase"
          />

          <Input
            label="Função"
            valor={funcao}
            onChangeText={setFuncao}
            placeholder="Cargo ou função"
            iconeEsquerda="award"
          />

          {/* Observações */}
          <Text style={styles.secaoTitulo}>Observações</Text>

          <Input
            label="Observação"
            valor={observacao}
            onChangeText={setObservacao}
            placeholder="Informações adicionais..."
            iconeEsquerda="file-text"
            multiline
            numberOfLines={3}
          />

          {/* Botão Cadastrar */}
          <View style={styles.botoesContainer}>
            <Button
              titulo="Cadastrar Visitante"
              onPress={handleCadastrar}
              carregando={carregando}
              variante="destaque"
              icone="check"
              tamanho="grande"
            />

            <Button
              titulo="Cancelar"
              onPress={() => navigation.goBack()}
              variante="outline"
              tamanho="grande"
              desabilitado={carregando}
            />
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

  // Header Padronizado
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

  // Botões
  botoesContainer: {
    gap: espacamento.md,
    marginTop: espacamento.xl,
  },
});
