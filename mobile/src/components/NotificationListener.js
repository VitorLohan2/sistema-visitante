// Component NotificationListener em React Native
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import api from '../services/api';
import notificacaoSom from '../assets/notificacao.mp3';

export default function NotificationListener() {
  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);
  const intervalRef = useRef(null);

  async function playNotificationSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(notificacaoSom);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isPlaying) sound.unloadAsync();
      });
    } catch (error) {
      console.log('Erro ao tocar som global:', error);
    }
  }

  async function fetchUnseenNotifications() {
    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return;

    try {
      const response = await api.get('/tickets/unseen', {
        headers: { Authorization: ongId }
      });

      const count = response.data.count;

      // Se não for o primeiro carregamento e houver novos
      if (!isFirstLoad.current && count > unseenRef.current) {
        playNotificationSound();
      }

      unseenRef.current = count;
      isFirstLoad.current = false;
    } catch (error) {
      console.log('Erro ao buscar notificações globais:', error);
    }
  }

  useEffect(() => {
    let mounted = true;

    const startListener = async () => {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      if (!ongId) return;

      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor;

      // Somente segurança ou quem você permitir
      if (setor === 'Segurança') {
        fetchUnseenNotifications(); // primeira checagem

        intervalRef.current = setInterval(() => {
          if (mounted) {
            fetchUnseenNotifications();
          }
        }, 5000);
      }
    };

    startListener();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isFirstLoad.current = true;
    };
  }, []);

  return null;
}
