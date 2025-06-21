import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons'; // 👈 ícones

import logoImg from '../assets/logo.png';
import heroesImg from '../assets/ilustracao-seguranca.png';
import api from '../services/api';

export default function Logon() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  async function handleLogin() {
    if (!id.trim()) {
      Alert.alert('Atenção', 'Por favor, informe sua ID');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/sessions', { id });
      await AsyncStorage.multiSet([
        ['@Auth:ongId', id],
        ['@Auth:ongName', response.data.name],
        ['@Auth:ongType', response.data.type]
      ]);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Profile' }],
      });
    } catch (error) {
      let errorMessage = 'Falha no login, tente novamente';
      if (error.response?.status === 400) errorMessage = 'ID não encontrada';
      else if (error.response?.status === 500) errorMessage = 'Erro no servidor';
      else if (error.message.includes('Network Error')) errorMessage = 'Sem conexão com o servidor';

      Alert.alert('Erro no login', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Image source={logoImg} style={styles.logo} resizeMode="contain" />

        <Text style={styles.title}>Faça seu Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Sua ID"
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => !loading && navigation.navigate('Register')}
          disabled={loading}
        >
          <Feather name="user-plus" size={16} color="#41414d" style={styles.icon} />
          <Text style={styles.registerText}>Não tenho cadastro</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => !loading && navigation.navigate('RecuperarId')}
          disabled={loading}
        >
          <Feather name="help-circle" size={16} color="#41414d" style={styles.icon} />
          <Text style={styles.registerText}>Esqueci meu ID</Text>
        </TouchableOpacity>
      </View>

      <Image source={heroesImg} style={styles.heroImage} resizeMode="contain" />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
  },
  formContainer: {
    width: '100%',
  },
  logo: {
    width: 350,
    height: 100,
    alignSelf: 'center',
    marginTop: 100,
    marginBottom: 100,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#13131a',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    height: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerLink: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    color: '#41414d',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  icon: {
    marginRight: 2,
  },
  heroImage: {
    width: '100%',
    height: 300,
  }
};
