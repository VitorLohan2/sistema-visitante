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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';

export default function EditIncidentMobile() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
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
      console.log('Tipo do usuário:', type); // Deve imprimir 'ADM'


      console.log('Tipo de usuário:', type);
      setIsAdmin(type?.trim().toUpperCase() === 'ADM');

      try {
        const response = await api.get(`/incidents/${id}`, {
          headers: { Authorization: ongId }
        });

        setForm({
          ...response.data,
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

  const handleSubmit = async () => {
    const cpfClean = form.cpf.replace(/\D/g, '');
    const telefoneClean = form.telefone.replace(/\D/g, '');

    if (cpfClean.length !== 11 || telefoneClean.length !== 11) {
      return Alert.alert('Erro', 'CPF ou telefone inválido.');
    }

    const ongId = await AsyncStorage.getItem('@Auth:ongId');

    const payload = {
      nome: form.nome,
      nascimento: form.nascimento,
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

      <TextInput style={styles.input} placeholder="Nascimento" value={form.nascimento} onChangeText={(value) => handleChange('nascimento', value)} editable={isAdmin} />

      <TextInput style={styles.input} placeholder="CPF" value={form.cpf} onChangeText={(value) => handleChange('cpf', formatCPF(value))} keyboardType="numeric" editable={isAdmin} />

      <Text style={styles.label}>Empresa</Text>
      <Picker selectedValue={form.empresa} onValueChange={(value) => handleChange('empresa', value)} enabled={isAdmin}>
        <Picker.Item label="Selecione" value="" />
        {empresas.map((e, i) => <Picker.Item key={i} label={e} value={e} />)}
      </Picker>

      <Text style={styles.label}>Setor</Text>
      <Picker selectedValue={form.setor} onValueChange={(value) => handleChange('setor', value)} enabled={isAdmin}>
        <Picker.Item label="Selecione" value="" />
        {setores.map((s, i) => <Picker.Item key={i} label={s} value={s} />)}
      </Picker>

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
    backgroundColor: '#fff'
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
    marginTop: 20
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
  }
});
