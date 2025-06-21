// Register.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cpf, setCpf] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [setor, setSetor] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [codigoSeguranca, setCodigoSeguranca] = useState('');
  const [codigoValido, setCodigoValido] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState('');
  const [birthdateISO, setBirthdateISO] = useState('');


  const navigation = useNavigation();

  const empresasDisponiveis = ['Dime', 'Prestadora de Serviço', 'Outros'];
  const setoresDisponiveis = ['Administrativo', 'Expedição', 'Recepção', 'Segurança', 'Outros'];
  const estadosECidades = {
    RJ: ['Rio de Janeiro'],
    SP: ['São Paulo', 'Guarulhos', 'Campinas'],
  };

  useEffect(() => {
    const timer = setTimeout(() => verificarCodigo(), 800);
    return () => clearTimeout(timer);
  }, [codigoSeguranca]);

  const verificarCodigo = async () => {
    if (!codigoSeguranca || codigoSeguranca.length < 3) return setCodigoValido(false);
    setVerificandoCodigo(true);
    setErroCodigo('');
    try {
      const response = await api.get(`codigos/validar/${codigoSeguranca}`);
      if (response.data.valido) setCodigoValido(true);
      else {
        setCodigoValido(false);
        setErroCodigo(response.data.mensagem || 'Código inválido');
      }
    } catch (err) {
      setCodigoValido(false);
      setErroCodigo('Erro ao verificar');
    } finally {
      setVerificandoCodigo(false);
    }
  };

  const formatarDataDDMMYYYY = (date) => {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
  };

  const formatCpf = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 3) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length > 6) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    setCpf(formatted);
  };

  const formatWhatsapp = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) formatted = `(${digits.slice(0, 2)})${digits.slice(2)}`;
    if (digits.length > 7) formatted = `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
    setWhatsapp(formatted);
  };

  const handleSubmit = async () => {
    const cleanedCpf = cpf.replace(/\D/g, '');
    const cleanedWhatsapp = whatsapp.replace(/\D/g, '');

    if (
      !name ||
      !birthdate ||
      !cpf ||
      !email ||
      !whatsapp ||
      !empresa ||
      !setor ||
      !city ||
      !uf ||
      !codigoSeguranca
    ) {
      return Alert.alert('Preencha todos os campos obrigatórios');
    }

    if (cleanedCpf.length !== 11) return Alert.alert('CPF deve conter 11 números');
    if (cleanedWhatsapp.length !== 11) return Alert.alert('Telefone deve conter 11 números');
    if (!codigoValido) return Alert.alert('Código de segurança inválido');

    try {
      const response = await api.post('ongs', {
        name,
        birthdate,
        cpf: cleanedCpf,
        empresa,
        setor,
        email,
        whatsapp: cleanedWhatsapp,
        city,
        uf,
        codigo_acesso: codigoSeguranca,
      });

      Alert.alert('Cadastro realizado com sucesso!', `ID: ${response.data.id}`);
      navigation.navigate('Logon');
    } catch (err) {
      Alert.alert('Erro no cadastro', err.response?.data?.message || 'Tente novamente');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro</Text>

      <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={t => setName(t.toUpperCase())} />

      <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => setShowDatePicker(true)}>
        <Text style={[styles.dateText, { color: birthdate ? '#000' : '#888' }]}>
          {birthdate || 'Data de nascimento'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={birthdateISO ? new Date(birthdateISO) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(e, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const iso = selectedDate.toISOString().split('T')[0]; // yyyy-mm-dd
              setBirthdate(formatarDataDDMMYYYY(selectedDate)); // Exibição
              setBirthdateISO(iso); // Se quiser enviar para o backend
            }
          }}

        />
      )}

      <TextInput style={styles.input} placeholder="CPF" value={cpf} onChangeText={formatCpf} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="(DD)99999-9999" value={whatsapp} onChangeText={formatWhatsapp} keyboardType="phone-pad" />

      <View style={styles.pickerWrapper}>
        <Picker selectedValue={empresa} onValueChange={setEmpresa} style={styles.input}>
          <Picker.Item label="Selecione a empresa" value="" />
          {empresasDisponiveis.map((item) => <Picker.Item key={item} label={item} value={item} />)}
        </Picker>
      </View>

      <View style={styles.pickerWrapper}>
        <Picker selectedValue={setor} onValueChange={setSetor} style={styles.input}>
          <Picker.Item label="Selecione o setor" value="" />
          {setoresDisponiveis.map((item) => <Picker.Item key={item} label={item} value={item} />)}
        </Picker>
      </View>

      <View style={styles.pickerWrapper}>
        <Picker selectedValue={uf} onValueChange={(val) => { setUf(val); setCity(''); }} style={styles.input}>
          <Picker.Item label="UF" value="" />
          {Object.keys(estadosECidades).map((sigla) => <Picker.Item key={sigla} label={sigla} value={sigla} />)}
        </Picker>
      </View>

      {uf && (
        <View style={styles.pickerWrapper}>
        <Picker selectedValue={city} onValueChange={setCity} style={styles.input}>
          <Picker.Item label="Cidade" value="" />
          {estadosECidades[uf].map((cidade) => <Picker.Item key={cidade} label={cidade} value={cidade} />)}
        </Picker>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Código de Segurança"
        value={codigoSeguranca}
        onChangeText={(t) => setCodigoSeguranca(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
      />

      {verificandoCodigo && <Text style={styles.info}>Verificando...</Text>}
      {!verificandoCodigo && codigoValido && <Text style={styles.success}>✓ Código válido</Text>}
      {!verificandoCodigo && erroCodigo && <Text style={styles.error}>{erroCodigo}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Cadastrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Logon')}>
      <Text style={styles.voltar}>Voltar ao login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    marginTop: 40,
    marginBottom: 25,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    color: '#666',
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 4,
  },
  success: {
    color: 'green',
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 4,
  },
  error: {
    color: 'red',
    fontSize: 14,
    marginBottom: 6,
    paddingLeft: 4,
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
  },
    voltar: {
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
    fontWeight: '500',
  },
});
