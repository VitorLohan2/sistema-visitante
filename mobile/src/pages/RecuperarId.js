import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function RecuperarIdScreen() {
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataNascimentoBR, setDataNascimentoBR] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [idRecuperado, setIdRecuperado] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dataLocal = new Date(selectedDate);

      const dia = String(dataLocal.getDate()).padStart(2, '0');
      const mes = String(dataLocal.getMonth() + 1).padStart(2, '0');
      const ano = dataLocal.getFullYear();

      setDataNascimento(`${ano}-${mes}-${dia}`);         // para enviar ao backend
      setDataNascimentoBR(`${dia}/${mes}/${ano}`);       // para exibir no campo
    }
  };
  
  const handleSubmit = async () => {
    setErro('');
    setIdRecuperado(null);
    setLoading(true);

    try {
      const response = await api.post('/recuperar-id', {
        email,
        data_nascimento: dataNascimento, // formato yyyy-mm-dd
      });
      setIdRecuperado(response.data.id);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao recuperar ID');
    } finally {
      setLoading(false);
    }
  };

    const copiarId = async () => {
    await Clipboard.setStringAsync(idRecuperado);
    Alert.alert('Copiado!', 'ID copiado para a área de transferência.');
    };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}><Feather name="lock" size={24} color="#e02041" /> Recuperar ID</Text>

        <View style={styles.form}>
          <Text style={styles.title}>Recuperar ID de Usuário</Text>

          <TextInput
            style={styles.input}
            placeholder="Seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => setShowDatePicker(true)}>
            <Text style={[styles.dateText, { color: dataNascimentoBR ? '#000' : '#888' }]}>
              {dataNascimentoBR || 'Data de nascimento'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dataNascimento ? new Date(dataNascimento) : new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Recuperar</Text>
            )}
          </TouchableOpacity>

            {idRecuperado && (
                <View style={styles.idContainer}>
                <Text style={styles.resultadoId}>
                    Seu ID é: <Text style={styles.id}>{idRecuperado}</Text>
                </Text>
                <TouchableOpacity onPress={copiarId} style={styles.copyIcon}>
                    <Feather name="copy" size={22} color="#e02041" />
                </TouchableOpacity>
                </View>
            )}

          {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity onPress={() => navigation.navigate('Logon')}>
            <Text style={styles.voltar}>Voltar ao login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 30,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e02041',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultado: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
    color: '#e02041',
  },
  erro: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  voltar: {
    marginTop: 30,
    textAlign: 'center',
    color: '#000',
    fontWeight: '500',
  },
    idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30
  },
    id: {
    fontWeight: 'bold',
    color: '#e02041'
  },
  copyIcon: {
    marginLeft: 10
  },
});


