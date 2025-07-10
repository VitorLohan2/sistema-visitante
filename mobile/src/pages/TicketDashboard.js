// Página do DashBoard dos Tickets em React Native
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import api from '../services/api';
const notificacaoSom = require('../assets/notificacao.mp3');

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

function formatDate(dateString) {
  return dayjs.utc(dateString).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
}

export default function TicketDashboard() {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({ setor: '' });

  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);
  const pollingRef = useRef(null); // <- adicionado para controle do polling

  const navigation = useNavigation();

  async function playNotificationSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(notificacaoSom);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isPlaying) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('🔊 Erro ao tocar som:', error);
    }
  }

  async function fetchTickets() {
  try {
    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return;

    // Busca dados da ONG (para definir setor e nome)
    const ongResponse = await api.get(`ongs/${ongId}`);
    const setor = ongResponse.data.setor || '';
    const nome = ongResponse.data.name || '';
    setUserData({ setor, nome });

    const response = await api.get('/tickets', {
      headers: { Authorization: ongId }
    });

    if (!Array.isArray(response.data)) {
      console.warn('⚠️ Resposta inesperada de /tickets:', response.data);
      return;
    }

    const novosTickets = response.data;

    const houveMudanca = JSON.stringify(novosTickets) !== JSON.stringify(tickets);

    if (houveMudanca) {
      setTickets(novosTickets);

      // Só toca som se for do setor Segurança e houve novos não vistos
      if (setor === 'Segurança') {
        const unseenResponse = await api.get('/tickets/unseen', {
          headers: { Authorization: ongId },
        });

        const newCount = Number(unseenResponse.data.count || 0);
        if (!isFirstLoad.current && newCount > unseenRef.current) {
        }

        unseenRef.current = newCount;
        isFirstLoad.current = false;
      }
    }

  } catch (err) {
    console.error('❌ Erro ao carregar tickets:', err.message);
    Alert.alert('Erro', 'Não foi possível carregar os tickets. Tente novamente.');
  } finally {
    setLoading(false); // <- aqui sim
  }
}


  useFocusEffect(
    React.useCallback(() => {
      fetchTickets(); // Carrega imediatamente

      // Inicia o polling a cada 5 segundos
      pollingRef.current = setInterval(() => {
        fetchTickets();
      }, 5000); // 5 segundos

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      };
    }, [])
  );

  const filteredTickets = tickets.filter(ticket => {
    const termo = searchTerm.toLowerCase();
    return (
      ticket.nome?.toLowerCase().includes(termo) ||
      ticket.mensagem?.toLowerCase().includes(termo) ||
      ticket.setor_usuario?.toLowerCase().includes(termo) ||
      ticket.funcionario?.toLowerCase().includes(termo) ||
      ticket.descricao?.toLowerCase().includes(termo)
    );
  });

  async function handleMarkAsSeen(id) {
    try {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      await api.put(`/tickets/${id}/seen`, {}, {
        headers: { Authorization: ongId },
      });

      setTickets(prev =>
        prev.map(t =>
          t.id === id ? { ...t, visto: true } : t
        )
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o ticket.');
    }
  }

  async function handleChangeStatus(id, currentStatus) {
    if (currentStatus === 'Resolvido' || currentStatus === 'Finalizado') {
      Alert.alert('Aviso', 'Tickets resolvidos não podem ser alterados.');
      return;
    }

    let nextStatus;
    if (currentStatus === 'Aberto' || currentStatus === 'Não iniciado') {
      nextStatus = 'Em andamento';
    } else if (currentStatus === 'Em andamento') {
      nextStatus = 'Resolvido';
    } else {
      nextStatus = 'Aberto';
    }

    try {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');

      setTickets(prev => prev.map(ticket =>
        ticket.id === id ? { ...ticket, status: nextStatus } : ticket
      ));

      await api.put(`/tickets/${id}`, { status: nextStatus }, {
        headers: { Authorization: ongId },
      });

    } catch (err) {
      setTickets(prev => prev.map(ticket =>
        ticket.id === id ? { ...ticket, status: currentStatus } : ticket
      ));

      Alert.alert('Erro', 'Não foi possível atualizar o status.');
      console.error('Erro detalhado:', err.response?.data || err.message);
    }
  }

  function handleNavigateToCreateTicket() {
    navigation.navigate('Tickets');
  }

  function handleNavigateToProfile() {
    navigation.navigate('Profile');
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Aberto':
      case 'Não iniciado':
        return '🔴';
      case 'Em andamento':
        return '🟡';
      case 'Resolvido':
      case 'Finalizado':
        return '🟢';
      default:
        return '❔';
    }
  };

  function renderTicket({ item }) {
    return (
      <View style={[styles.ticketItem, item.visto && styles.ticketSeen]}>
        <View style={styles.ticketMeta}>
          <Text style={[styles.dateText, { fontWeight: 'bold' }]}>
            {item.data_criacao ? formatDate(item.data_criacao) : 'Data indisponível'}
          </Text>
          <View style={[
            styles.statusDot,
            (item.status === 'Aberto' || item.status === 'Não iniciado') && styles.statusDotRed,
            item.status === 'Em andamento' && styles.statusDotYellow,
            (item.status === 'Resolvido' || item.status === 'Finalizado') && styles.statusDotGreen
          ]} />
        </View>
        <Text style={styles.ticketText}>Criado por: {item.nome_usuario}</Text>
        <Text style={styles.ticketText}>Setor: {item.setor_usuario}</Text>
        <Text style={styles.ticketText}>Funcionário: {item.funcionario}</Text>
        <Text style={styles.ticketText}>Mensagem: {item.descricao}</Text>
        <Text style={[styles.ticketText, { fontWeight: 'bold', marginTop: 8 }]}>
          Status: {getStatusIcon(item.status)} {item.status}
        </Text>

        <View style={styles.actionsContainer}>
          <Text style={{ marginRight: 20, color: item.status === 'Aberto' ? '#dc2626' : '#16a34a' }}>
            {item.status === 'Aberto' ? 'Não Lido' : 'Lido'}
          </Text>
          <TouchableOpacity
            onPress={() => handleChangeStatus(item.id, item.status)}
            style={[styles.actionButton,
            item.status === 'Resolvido' && { opacity: 0.5 }
            ]}
            disabled={item.status === 'Resolvido'}
          >
            <Feather name="refresh-cw" size={20} color="#2563eb" />
            <Text style={[styles.actionText, { color: '#2563eb' }]}>
              {item.status === 'Aberto' ? 'Iniciar' :
                item.status === 'Em andamento' ? 'Resolver' : 'Reabrir'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { flex: 1 }]}
          onPress={handleNavigateToProfile}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#e02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text style={styles.logoText}>Tickets</Text>
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleNavigateToCreateTicket}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#999" />
        <TextInput
          placeholder="Buscar por nome ou mensagem"
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={item => String(item.id)}
        renderItem={renderTicket}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text>Nenhum ticket encontrado.</Text>
          </View>
        )}
      />
      <View style={styles.margin}></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  ticketMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  header: {
    marginTop: 50,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  backText: {
    color: '#000',
    fontSize: 18,
    marginLeft: 5,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 30,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
  },
  ticketItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  ticketSeen: {
    backgroundColor: '#f0f0f0',
  },
  ticketText: {
    marginTop: 6,
    fontSize: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotRed: {
    backgroundColor: '#e02041',
  },
  statusDotYellow: {
    backgroundColor: '#ffc107',
  },
  statusDotGreen: {
    backgroundColor: '#4CAF50',
  },
  actionsContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#10B981',
  },
  dateText: {
    fontSize: 12,
    color: '#000',
    marginRight: 6,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center'
  },
  createButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  margin: {
    marginBottom: 40
  }
});
