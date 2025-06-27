// Página de Editar Cadastro de Visitantes em React Native
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';

export default function EditIncidentMobile() {
  const navigation = useNavigation();
  const route = useRoute();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { id } = route.params;

  const [form, setForm] = useState({
    nome: '',
    nascimento: '', // formato dd/mm/aaaa (para exibir)
    nascimentoISO: '', // formato yyyy-mm-dd (para enviar ao backend)
    cpf: '',
    empresa: '',
    setor: '',
    telefone: '',
    observacao: '',
    bloqueado: false
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const empresas = ["Dime", "Dimep"];
  const setores = ["Reunião", "Entrega", "Visita"];

  useEffect(() => {
    async function loadData() {
      const type = await AsyncStorage.getItem('@Auth:ongType');
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      console.log('Tipo do usuário:', type);

      setIsAdmin(type?.trim().toUpperCase() === 'ADM');

      try {
        const response = await api.get(`/incidents/${id}`, {
          headers: { Authorization: ongId }
        });

        // Converter a data do backend (yyyy-mm-dd) para o formato de exibição (dd/mm/aaaa)
        const dataBackend = response.data.nascimento;
        let nascimentoDisplay = '';
        if (dataBackend) {
          const [year, month, day] = dataBackend.split('-');
          nascimentoDisplay = `${day}/${month}/${year}`;
        }

        setForm({
          ...response.data,
          nascimento: nascimentoDisplay,
          nascimentoISO: dataBackend || '',
          cpf: formatCPF(response.data.cpf || ''),
          telefone: formatTelefone(response.data.telefone || ''),
          bloqueado: Boolean(response.data.bloqueado)
        });
      } catch (err) {
        Alert.alert('Erro', 'Erro ao carregar dados.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : value;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatarDataDDMMYYYY = (date) => {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const parseDateString = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day);
  };

  const handleChange = (name, value) => {
    const newValue = name === 'nome' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  const handleBlockToggle = async () => {
    if (!isAdmin) return;
    const newStatus = !form.bloqueado;
    const ongId = await AsyncStorage.getItem('@Auth:ongId');

    try {
      await api.put(`/incidents/${id}/block`, { bloqueado: newStatus }, {
        headers: { Authorization: ongId }
      });
      setForm(prev => ({ ...prev, bloqueado: newStatus }));
      Alert.alert('Sucesso', `Cadastro ${newStatus ? 'bloqueado' : 'desbloqueado'}!`);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Cria a data no formato yyyy-mm-dd sem problemas de fuso horário
      const day = selectedDate.getDate();
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();
      
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const formatada = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      
      setForm(prev => ({ ...prev, nascimento: formatada, nascimentoISO: iso }));
    }
  };

  const handleSubmit = async () => {
    const cpfClean = form.cpf.replace(/\D/g, '');
    const telefoneClean = form.telefone.replace(/\D/g, '');

    if (cpfClean.length !== 11 || telefoneClean.length !== 11) {
      return Alert.alert('Erro', 'CPF ou telefone inválido.');
    }

    // Validação adicional para data futura
    if (form.nascimentoISO) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const birthDate = parseDateString(form.nascimentoISO);
      
      if (birthDate > today) {
        return Alert.alert('Erro', 'Data de nascimento não pode ser futura.');
      }
    }

    const ongId = await AsyncStorage.getItem('@Auth:ongId');

    const payload = {
      nome: form.nome,
      nascimento: form.nascimentoISO,
      cpf: cpfClean,
      empresa: form.empresa,
      setor: form.setor,
      telefone: telefoneClean,
      observacao: form.observacao
    };

    try {
      await api.put(`/incidents/${id}`, payload, {
        headers: { Authorization: ongId }
      });
      Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erro', 'Erro ao atualizar os dados.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}><ActivityIndicator size="large" color="#10B981" /></View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar Cadastro</Text>

      <TextInput style={styles.input} placeholder="Nome" value={form.nome} onChangeText={(value) => handleChange('nome', value)} editable={isAdmin} />

      <TouchableOpacity
        onPress={() => isAdmin && setShowDatePicker(true)}
        style={styles.input}
        activeOpacity={0.7}
      >
        <Text style={{ color: form.nascimento ? '#000' : '#888' }}>
          {form.nascimento || 'Data de nascimento'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={parseDateString(form.nascimentoISO)}
          mode="date"
          display="default"
          onChange={handleDateChange}
          locale="pt-BR"
        />
      )}

      <TextInput style={styles.input} placeholder="CPF" value={form.cpf} onChangeText={(value) => handleChange('cpf', formatCPF(value))} keyboardType="numeric" editable={isAdmin} />

      <Text style={styles.label}>Empresa</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={form.empresa} onValueChange={(value) => handleChange('empresa', value)} enabled={isAdmin}>
          <Picker.Item label="Selecione" value="" />
          {empresas.map((e, i) => <Picker.Item key={i} label={e} value={e} />)}
        </Picker>
      </View>
      <Text style={styles.label}>Setor</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={form.setor} onValueChange={(value) => handleChange('setor', value)} enabled={isAdmin}>
          <Picker.Item label="Selecione" value="" />
          {setores.map((s, i) => <Picker.Item key={i} label={s} value={s} />)}
        </Picker>
      </View>

      <TextInput style={styles.input} placeholder="Telefone" value={form.telefone} onChangeText={(value) => handleChange('telefone', formatTelefone(value))} keyboardType="phone-pad" editable={isAdmin} />

      <View style={styles.switchContainer}>
        <Text style={styles.label}>{form.bloqueado ? '✅ Bloqueado' : '⛔ Bloquear'}</Text>
        <Switch value={form.bloqueado} onValueChange={handleBlockToggle} disabled={!isAdmin} />
      </View>

      <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Observações" value={form.observacao} onChangeText={(value) => handleChange('observacao', value)} editable={isAdmin} />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={!isAdmin}>
        <Text style={styles.buttonText}>Atualizar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    marginTop: 50,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: 'bold'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  button: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f0f0f5',
    marginBottom: 12
  }
});