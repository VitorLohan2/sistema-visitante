// src/hooks/useAuth.js
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export function useAuth() {
  const navigation = useNavigation();

  const login = async (id) => {
    try {
      const response = await api.post('/sessions', { id });
      await AsyncStorage.setItem('@Auth:token', response.data.token);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Profile' }],
      });

      return true;
    } catch (error) {
      throw error;
    }
  };

  return { login };
}
