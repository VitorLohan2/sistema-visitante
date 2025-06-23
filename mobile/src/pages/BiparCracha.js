import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function BiparCracha() {
  const [cracha, setCracha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [popupTipo, setPopupTipo] = useState('erro');
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [nomeFuncionario, setNomeFuncionario] = useState('');

  const navigation = useNavigation();
  const inputRef = useRef(null); // Referência ao TextInput

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cracha && cracha.length >= 6) {
        handleBipar();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [cracha]);

  useEffect(() => {
    if (showPopup) {
      const timeout = setTimeout(() => setShowPopup(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showPopup]);

  const handleBipar = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('@Auth:ongId');
      const response = await api.post(
        '/registros-ponto',
        { cracha },
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        }
      );

      setMensagem(response.data.mensagem);
      setUltimoRegistro(response.data.registro);
      setNomeFuncionario(response.data.nomeFuncionario || '');
      setCracha('');
      Keyboard.dismiss();
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error || 'Erro ao registrar ponto';

      if (status === 400 && msg.toLowerCase().includes('obrigatório')) {
        setPopupTipo('alerta');
      } else if (status === 404 || msg.toLowerCase().includes('não encontrado')) {
        setPopupTipo('alerta');
      } else {
        setPopupTipo('erro');
      }

      setCracha('');
      inputRef.current?.focus(); // Redefine foco automaticamente
      setMensagem(msg);
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* POPUP */}
      {showPopup && (
        <View style={styles.popupContainer}>
          <View
            style={[
              styles.popupContent,
              popupTipo === 'erro'
                ? styles.popupErro
                : popupTipo === 'alerta'
                ? styles.popupAlerta
                : null,
            ]}
          >
            <Text style={styles.popupText}>{mensagem}</Text>
          </View>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#e02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      {/* FORMULÁRIO */}
      <View style={styles.card}>
        <Text style={styles.title}>Registro de Ponto</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Digite o número do crachá"
          value={cracha}
          onChangeText={setCracha}
          autoFocus
          keyboardType="numeric"
          returnKeyType="done"
        />

        <TouchableOpacity style={styles.buttoncracha} onPress={handleBipar}>
          <Text style={styles.buttonText}>Confirmar</Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator size="large" color="#2083e0" style={{ marginVertical: 10 }} />
        )}

        {!showPopup && mensagem && (
          <View
            style={[
              styles.feedback,
              mensagem.includes('sucesso') ? styles.success : styles.error,
            ]}
          >
            <Text>{mensagem}</Text>
          </View>
        )}

        {ultimoRegistro && (
          <View style={styles.ultimoRegistro}>
            {nomeFuncionario !== '' && (
              <Text style={styles.bold}>Funcionário: {nomeFuncionario}</Text>
            )}
            {ultimoRegistro.tipo === 'entrada' ? (
              <>
                <Text style={styles.bold}>Primeiro Registro: Entrada</Text>
                <Text style={styles.bold}>
                  Horário Atual: {new Date(ultimoRegistro.hora_entrada).toLocaleString()}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bold}>Segundo Registro: Saída</Text>
                <Text style={styles.bold}>
                  Horário Atual: {new Date(ultimoRegistro.hora_saida).toLocaleString()}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 40,
    backgroundColor: '#f0f0f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  backText: {
    fontSize: 18,
    marginLeft: 5,
    color: '#000',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderColor: '#dcdce6',
    borderWidth: 1.5,
    borderRadius: 4,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  feedback: {
    marginTop: 20,
    padding: 10,
    borderRadius: 4,
  },
  success: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  error: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  ultimoRegistro: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bold: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  popupContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  popupContent: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  popupText: {
    fontWeight: 'bold',
    fontSize: 26,
    color: '#fff',
  },
  popupErro: {
    backgroundColor: '#e02020',
  },
  popupAlerta: {
    backgroundColor: '#ffc107',
  },
  buttoncracha: {
    backgroundColor: '#2083e0',
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

