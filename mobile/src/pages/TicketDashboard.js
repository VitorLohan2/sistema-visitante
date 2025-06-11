// src/pages/TicketDashboard/index.js
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

export default function TicketDashboard() {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({ setor: '' });

  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);
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
    setLoading(true);
    try {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      if (!ongId) {
        setLoading(false);
        return;
      }
      
      // Busca dados da ONG
      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor || '';
      const nome = ongResponse.data.name || '';
      setUserData({ setor, nome });

      // Busca tickets do backend
      const response = await api.get('/tickets', {
        headers: { Authorization: ongId },
      });
      console.log('Tickets recebidos:', response.data);
      
      if (Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        console.warn('⚠️ Resposta inesperada de /tickets:', response.data);
        setTickets([]);
      }

      // Somente para setor Segurança
      if (setor === 'Segurança') {
        const unseenResponse = await api.get('/tickets/unseen', {
          headers: { Authorization: ongId },
        });

        const newCount = Number(unseenResponse.data.count || 0);

        if (!isFirstLoad.current && newCount > unseenRef.current) {
          playNotificationSound();
        }

        unseenRef.current = newCount;
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error('❌ Erro ao carregar tickets:', err.message);
      Alert.alert('Erro', 'Não foi possível carregar os tickets. Tente novamente.');
    }

    setLoading(false);
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchTickets();
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

// Seu backend espera estes valores no status:
// 'Aberto', 'Em andamento', 'Resolvido'

// Seu frontend está usando:
// 'Não iniciado', 'Em andamento', 'Finalizado'

// Então ajuste para o backend, por exemplo:
async function handleChangeStatus(id, currentStatus) {
  // Bloqueia alteração se já estiver resolvido
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
    
    // Atualização otimista - muda o estado local primeiro
    setTickets(prev => prev.map(ticket => 
      ticket.id === id ? { ...ticket, status: nextStatus } : ticket
    ));

    // Chamada à API
    await api.put(`/tickets/${id}`, { status: nextStatus }, {
      headers: { Authorization: ongId },
    });

    // Recarrega os tickets para garantir sincronização
    //await fetchTickets();

  } catch (err) {
    // Reverte em caso de erro
    setTickets(prev => prev.map(ticket => 
      ticket.id === id ? { ...ticket, status: currentStatus } : ticket
    ));
    
    Alert.alert('Erro', 'Não foi possível atualizar o status.');
    console.error('Erro detalhado:', err.response?.data || err.message);
  }
}

  function handleNavigateToCreateTicket() {
    history.push('Tickets');
  };

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
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketUser}>{item.nome}</Text>
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
      {/* Adicionando a mensagem de status de leitura */}
      <Text style={{marginRight: 20, color: item.status === 'Aberto' ? '#dc2626' : '#16a34a'}}>
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
       
        {/* Botão voltar */}
        <TouchableOpacity
          style={[styles.backButton, {flex: 1}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#e02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <View style={{flex: 2, alignItems: 'center'}}>
        <Text style={styles.logoText}>Tickets</Text>
        </View>    
       
      {/* Botão de criar ticket */}
        <View style={{flex: 1, alignItems: 'flex-end'}}>     
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 50,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    //justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    //justifyContent: 'space-between',
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
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketUser: {
    fontWeight: 'bold',
    fontSize: 16,
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
    backgroundColor: '#e02041', // Vermelho para Aberto/Não iniciado
  },
  statusDotYellow: {
    backgroundColor: '#ffc107', // Amarelo para Em andamento
  },
  statusDotGreen: {
    backgroundColor: '#4CAF50', // Verde para Resolvido/Finalizado
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
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  createButton: {
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center'
  }
});
