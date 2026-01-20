/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PÁGINA: Bipar Crachá
 * Registro de entrada/saída por leitura de crachá
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Vibration,
  Animated,
  Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera } from "expo-camera";

// Componentes
import { Button, Loading, Card } from "../../components";

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

export default function BiparCracha() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Estados
  const [codigoCracha, setCodigoCracha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [modoCamera, setModoCamera] = useState(false);
  const [temPermissaoCamera, setTemPermissaoCamera] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMAÇÃO DE PULSO
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAR PERMISSÃO DA CÂMERA
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setTemPermissaoCamera(status === "granted");
    })();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FOCAR NO INPUT
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Foca no input ao carregar para receber leitura do leitor
    if (!modoCamera) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [modoCamera]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSCAR VISITANTE E REGISTRAR
  // ═══════════════════════════════════════════════════════════════════════════

  const processarCracha = async (codigo) => {
    if (!codigo.trim()) return;

    try {
      setCarregando(true);
      Vibration.vibrate(100); // Feedback háptico

      // Busca visitante pelo código do crachá (CPF)
      const resposta = await visitantesService.buscarPorCracha(codigo.trim());

      // Resposta pode vir diretamente ou em .data
      const visitante = resposta?.data || resposta;

      if (!visitante || !visitante.id) {
        Alert.alert("Atenção", "Crachá não encontrado no sistema.");
        return;
      }

      // Verifica se já está dentro (última entrada sem saída)
      // Se estiver dentro, registra saída. Se estiver fora, registra entrada.
      const tipoRegistro = visitante.dentro ? "saida" : "entrada";

      Alert.alert(
        tipoRegistro === "entrada" ? "Registrar Entrada" : "Registrar Saída",
        `Confirma a ${tipoRegistro} de ${visitante.nome}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                if (tipoRegistro === "entrada") {
                  // Para registrar entrada, precisamos passar os dados completos
                  await visitantesService.registrarEntrada({
                    nome: visitante.nome,
                    cpf: visitante.cpf,
                    empresa:
                      visitante.empresa_nome ||
                      visitante.empresa?.nome ||
                      "N/A",
                    setor:
                      visitante.setor_nome || visitante.setor?.nome || "N/A",
                    responsavel: "Auto-registro via crachá",
                  });
                } else {
                  await visitantesService.registrarSaida(visitante.id);
                }

                Vibration.vibrate([0, 100, 50, 100]); // Feedback de sucesso

                setUltimoRegistro({
                  tipo: tipoRegistro,
                  visitante: visitante.nome,
                  horario: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                });

                Alert.alert(
                  "Sucesso!",
                  `${tipoRegistro === "entrada" ? "Entrada" : "Saída"} registrada para ${visitante.nome}`
                );
              } catch (erro) {
                console.error("Erro ao registrar:", erro);
                Alert.alert(
                  "Erro",
                  erro.response?.data?.error || "Não foi possível registrar."
                );
              }
            },
          },
        ]
      );
    } catch (erro) {
      console.error("Erro ao processar crachá:", erro);
      Vibration.vibrate([0, 500]); // Feedback de erro

      if (erro.response?.status === 404) {
        Alert.alert("Atenção", "Crachá não encontrado no sistema.");
      } else {
        Alert.alert("Erro", "Não foi possível processar o crachá.");
      }
    } finally {
      setCarregando(false);
      setCodigoCracha("");
      inputRef.current?.focus();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSubmit = () => {
    if (codigoCracha.trim()) {
      processarCracha(codigoCracha);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (!carregando) {
      setModoCamera(false);
      processarCracha(data);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - MODO CÂMERA
  // ═══════════════════════════════════════════════════════════════════════════

  if (modoCamera) {
    if (temPermissaoCamera === null) {
      return <Loading mensagem="Verificando permissão da câmera..." />;
    }

    if (temPermissaoCamera === false) {
      return (
        <View style={styles.container}>
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

            <Text style={styles.headerTitulo}>Bipar Crachá</Text>

            <View style={styles.headerEspaco} />
          </View>
          <View style={styles.semPermissao}>
            <Feather
              name="camera-off"
              size={64}
              color={cores.textoSecundario}
            />
            <Text style={styles.semPermissaoTitulo}>Câmera não autorizada</Text>
            <Text style={styles.semPermissaoDescricao}>
              Permita o acesso à câmera nas configurações do dispositivo
            </Text>
            <Button
              titulo="Voltar"
              onPress={() => setModoCamera(false)}
              variante="outline"
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={cores.primaria} />

        {/* Header Padronizado */}
        <View
          style={[styles.header, { paddingTop: insets.top + espacamento.md }]}
        >
          <TouchableOpacity
            style={styles.headerVoltar}
            onPress={() => setModoCamera(false)}
          >
            <Feather name="arrow-left" size={24} color={cores.branco} />
          </TouchableOpacity>

          <Text style={styles.headerTitulo}>Escanear QR Code</Text>

          <View style={styles.headerEspaco} />
        </View>

        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            onBarCodeScanned={carregando ? undefined : handleBarCodeScanned}
            barCodeScannerSettings={{
              barCodeTypes: ["qr", "code128", "code39", "ean13", "ean8"],
            }}
          />

          {/* Overlay */}
          <View style={styles.cameraOverlay}>
            <View style={styles.scanArea}>
              <View style={[styles.scanCorner, styles.scanCornerTL]} />
              <View style={[styles.scanCorner, styles.scanCornerTR]} />
              <View style={[styles.scanCorner, styles.scanCornerBL]} />
              <View style={[styles.scanCorner, styles.scanCornerBR]} />
            </View>
            <Text style={styles.scanTexto}>
              Posicione o código do crachá na área de leitura
            </Text>
          </View>

          {/* Botão Cancelar */}
          <TouchableOpacity
            style={styles.botaoCancelarCamera}
            onPress={() => setModoCamera(false)}
          >
            <Feather name="x" size={24} color={cores.branco} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERIZAÇÃO - MODO NORMAL
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

        <Text style={styles.headerTitulo}>Bipar Crachá</Text>

        <View style={styles.headerEspaco} />
      </View>

      {/* Conteúdo */}
      <View style={styles.conteudo}>
        {/* Área de Leitura */}
        <View style={styles.leituraContainer}>
          {/* Animação do Ícone */}
          <Animated.View
            style={[
              styles.iconeContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Feather name="credit-card" size={64} color={cores.destaque} />
          </Animated.View>

          <Text style={styles.instrucao}>
            Aproxime o crachá do leitor ou escaneie o código
          </Text>

          {/* Input oculto para receber leitura do leitor USB/Bluetooth */}
          <TextInput
            ref={inputRef}
            style={styles.inputOculto}
            value={codigoCracha}
            onChangeText={setCodigoCracha}
            onSubmitEditing={handleSubmit}
            autoFocus
            showSoftInputOnFocus={false}
          />

          {/* Input visível para digitação manual */}
          <View style={styles.inputVisivel}>
            <Feather name="hash" size={20} color={cores.textoSecundario} />
            <TextInput
              style={styles.inputTexto}
              placeholder="Digite o código do crachá..."
              placeholderTextColor={cores.textoTerciario}
              value={codigoCracha}
              onChangeText={setCodigoCracha}
              onSubmitEditing={handleSubmit}
            />
            {codigoCracha.length > 0 && (
              <TouchableOpacity onPress={() => setCodigoCracha("")}>
                <Feather name="x" size={20} color={cores.textoSecundario} />
              </TouchableOpacity>
            )}
          </View>

          {/* Botões */}
          <View style={styles.botoes}>
            <Button
              titulo="Confirmar"
              onPress={handleSubmit}
              carregando={carregando}
              variante="destaque"
              icone="check"
              desabilitado={!codigoCracha.trim()}
              estilo={{ flex: 1 }}
            />
            <Button
              titulo="Escanear"
              onPress={() => setModoCamera(true)}
              variante="outline"
              icone="camera"
              estilo={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Último Registro */}
        {ultimoRegistro && (
          <Card style={styles.ultimoRegistroCard}>
            <View style={styles.ultimoRegistroHeader}>
              <Feather
                name={ultimoRegistro.tipo === "entrada" ? "log-in" : "log-out"}
                size={20}
                color={
                  ultimoRegistro.tipo === "entrada" ? cores.sucesso : cores.erro
                }
              />
              <Text style={styles.ultimoRegistroTitulo}>Último Registro</Text>
            </View>
            <Text style={styles.ultimoRegistroNome}>
              {ultimoRegistro.visitante}
            </Text>
            <Text style={styles.ultimoRegistroInfo}>
              {ultimoRegistro.tipo === "entrada" ? "Entrada" : "Saída"} às{" "}
              {ultimoRegistro.horario}
            </Text>
          </Card>
        )}

        {/* Dicas */}
        <View style={styles.dicas}>
          <Text style={styles.dicasTitulo}>Dicas</Text>
          <View style={styles.dicaItem}>
            <Feather name="info" size={16} color={cores.info} />
            <Text style={styles.dicaTexto}>
              O sistema detecta automaticamente se é entrada ou saída
            </Text>
          </View>
          <View style={styles.dicaItem}>
            <Feather name="info" size={16} color={cores.info} />
            <Text style={styles.dicaTexto}>
              Use um leitor de código de barras para agilizar
            </Text>
          </View>
        </View>
      </View>
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

  conteudo: {
    flex: 1,
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espacamento.lg,
  },

  // Área de Leitura
  leituraContainer: {
    backgroundColor: cores.fundoCard,
    borderRadius: bordas.raioGrande,
    padding: espacamento.xl,
    alignItems: "center",
    ...sombras.media,
  },

  iconeContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${cores.destaque}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: espacamento.lg,
  },

  instrucao: {
    fontSize: tipografia.tamanhoTextoMedio,
    color: cores.texto,
    textAlign: "center",
    marginBottom: espacamento.lg,
  },

  inputOculto: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },

  inputVisivel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.fundoPagina,
    borderRadius: bordas.raioMedio,
    paddingHorizontal: espacamento.md,
    height: 48,
    width: "100%",
    marginBottom: espacamento.md,
  },

  inputTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTexto,
    color: cores.texto,
    marginLeft: espacamento.sm,
  },

  botoes: {
    flexDirection: "row",
    gap: espacamento.md,
    width: "100%",
  },

  // Último Registro
  ultimoRegistroCard: {
    marginTop: espacamento.lg,
  },

  ultimoRegistroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacamento.sm,
    marginBottom: espacamento.sm,
  },

  ultimoRegistroTitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
    fontWeight: tipografia.pesoSemiBold,
  },

  ultimoRegistroNome: {
    fontSize: tipografia.tamanhoTextoMedio,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginBottom: 2,
  },

  ultimoRegistroInfo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Dicas
  dicas: {
    marginTop: espacamento.lg,
  },

  dicasTitulo: {
    fontSize: tipografia.tamanhoTextoPequeno,
    fontWeight: tipografia.pesoSemiBold,
    color: cores.textoSecundario,
    marginBottom: espacamento.sm,
  },

  dicaItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espacamento.sm,
    marginBottom: espacamento.xs,
  },

  dicaTexto: {
    flex: 1,
    fontSize: tipografia.tamanhoTextoPequeno,
    color: cores.textoSecundario,
  },

  // Câmera
  cameraContainer: {
    flex: 1,
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  scanArea: {
    width: 250,
    height: 250,
    borderRadius: bordas.raioMedio,
    position: "relative",
  },

  scanCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: cores.destaque,
  },

  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },

  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },

  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },

  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },

  scanTexto: {
    color: cores.branco,
    fontSize: tipografia.tamanhoTexto,
    textAlign: "center",
    marginTop: espacamento.xl,
    paddingHorizontal: espacamento.xl,
  },

  botaoCancelarCamera: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: cores.erro,
    alignItems: "center",
    justifyContent: "center",
    ...sombras.media,
  },

  // Sem Permissão
  semPermissao: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundoPagina,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espacamento.xl,
  },

  semPermissaoTitulo: {
    fontSize: tipografia.tamanhoSubtitulo,
    fontWeight: tipografia.pesoBold,
    color: cores.texto,
    marginTop: espacamento.md,
    marginBottom: espacamento.sm,
  },

  semPermissaoDescricao: {
    fontSize: tipografia.tamanhoTexto,
    color: cores.textoSecundario,
    textAlign: "center",
    marginBottom: espacamento.lg,
  },
});
