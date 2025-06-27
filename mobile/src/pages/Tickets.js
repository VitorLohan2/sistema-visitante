// Página para Criar Tickets em React Native
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function TicketPage() {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    funcionario: '',
    motivo: '',
    descricao: '',
    setorResponsavel: ''
  });

  const [errors, setErrors] = useState({
    funcionario: false,
    motivo: false,
    descricao: false,
    setorResponsavel: false
  });

  const [user, setUser] = useState({
    nome: '',
    setor: ''
  });

  const motivos = ['Saída antecipada', 'Saída com objeto', 'Outros'];
  const setoresResponsaveis = ['Segurança'];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const ongId = await AsyncStorage.getItem('@Auth:ongId');
        const res = await api.get(`/ongs/${ongId}`);
        setUser({ nome: res.data.name, setor: res.data.setor });
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
        setUser({ nome: 'Erro', setor: 'Erro' });
      }
    };
    loadUserData();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: false })); // limpa erro ao digitar
  };

  const handleSubmit = async () => {
    const camposObrigatorios = ['funcionario', 'motivo', 'descricao', 'setorResponsavel'];
    const novosErros = {};

    camposObrigatorios.forEach((campo) => {
      novosErros[campo] = !form[campo];
    });

    setErrors(novosErros);

    if (Object.values(novosErros).some((e) => e)) {
      return Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
    }

    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return Alert.alert('Erro', 'Usuário não autenticado');

    try {
      const res = await api.post(
        '/tickets',
        {
          ...form,
          nomeUsuario: user.nome,
          setorUsuario: user.setor
        },
        {
          headers: {
            Authorization: ongId
          }
        }
      );

      Alert.alert('Sucesso', `Ticket criado com ID: ${res.data.id}`);

      setForm({
        funcionario: '',
        motivo: '',
        descricao: '',
        setorResponsavel: ''
      });

      setErrors({
        funcionario: false,
        motivo: false,
        descricao: false,
        setorResponsavel: false
      });

      navigation.navigate('TicketDashboard');
    } catch (err) {
      console.error('Erro ao criar ticket:', err);
      Alert.alert('Erro', 'Falha ao abrir o ticket.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Abrir Novo Ticket</Text>

      <Text style={styles.label}>Usuário</Text>
      <TextInput style={styles.input} value={user.nome} editable={false} />

      <Text style={styles.label}>Setor</Text>
      <TextInput style={styles.input} value={user.setor} editable={false} />

      <Text style={styles.label}>Funcionário Envolvido</Text>
      <TextInput
        style={[styles.input, errors.funcionario && styles.inputError]}
        placeholder="Nome do funcionário"
        value={form.funcionario}
        onChangeText={(text) => handleChange('funcionario', text.toUpperCase())}
      />
      {errors.funcionario && <Text style={styles.errorText}>Campo obrigatório</Text>}

      <Text style={styles.label}>Motivo</Text>
      <View style={[styles.pickerWrapper, errors.motivo && styles.inputError]}>
        <Picker
          selectedValue={form.motivo}
          onValueChange={(val) => handleChange('motivo', val)}
        >
          <Picker.Item label="Selecione o motivo" value="" />
          {motivos.map((motivo, i) => (
            <Picker.Item key={i} label={motivo} value={motivo} />
          ))}
        </Picker>
      </View>
      {errors.motivo && <Text style={styles.errorText}>Campo obrigatório</Text>}

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={[styles.input, styles.textArea, errors.descricao && styles.inputError]}
        placeholder="Descreva o ocorrido"
        multiline
        numberOfLines={5}
        value={form.descricao}
        onChangeText={(text) => handleChange('descricao', text)}
      />
      {errors.descricao && <Text style={styles.errorText}>Campo obrigatório</Text>}

      <Text style={styles.label}>Setor Responsável</Text>
      <View style={[styles.pickerWrapper, errors.setorResponsavel && styles.inputError]}>
        <Picker
          selectedValue={form.setorResponsavel}
          onValueChange={(val) => handleChange('setorResponsavel', val)}
        >
          <Picker.Item label="Selecione o setor" value="" />
          {setoresResponsaveis.map((opt, i) => (
            <Picker.Item key={i} label={opt} value={opt} />
          ))}
        </Picker>
      </View>
      {errors.setorResponsavel && <Text style={styles.errorText}>Campo obrigatório</Text>}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Abrir Ticket</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    marginTop: 40,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 12
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    marginBottom: 6
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6
  },
  inputError: {
    borderColor: 'red'
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 6
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  }
});
