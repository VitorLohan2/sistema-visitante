// Página de Perfil em React Native
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import api from '../services/api'; // ajuste o caminho conforme seu projeto

import logoImg from '../assets/gd.png';
import disableImg from '../assets/disable.png'; // mesmo caminho dos assets do mobile
import userIconImg from '../assets/user.png';
import notificacaoSom from '../assets/notificacao.mp3'; // se usar expo-av ou react-native-sound

// Para tocar o som da notificação (expo-av)
import { Audio } from 'expo-av';

export default function Profile() {
  const [incidents, setIncidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [userData, setUserData] = useState({ setor: '', nome: '' });

  const unseenRef = useRef(0);
  const isFirstLoad = useRef(true);
  const intervalRef = useRef(null);
  const previousBlockedMapRef = useRef({});

  const navigation = useNavigation();

  function formatarData(data) {
    if (!data) return 'Data não informada';
    const dataParte = data.split('T')[0];
    const partes = dataParte.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return data;
  }

  function sortIncidentsByName(array) {
    return [...array].sort((a, b) =>
      a.nome.toUpperCase().localeCompare(b.nome.toUpperCase())
    );
  }

  async function playNotificationSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(notificacaoSom);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isPlaying) sound.unloadAsync();
      });
    } catch (error) {
      console.log('Erro ao tocar som:', error);
    }
  }

  async function fetchUnseenNotifications() {
    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return;

    try {
      const unseenResponse = await api.get('/tickets/unseen', {
        headers: { Authorization: ongId },
      });

      const newCount = unseenResponse.data.count;playNotificationSound
      if (!isFirstLoad.current && newCount > unseenRef.current) {
        playNotificationSound();
      }

      unseenRef.current = newCount;
      setUnseenCount(newCount);
      isFirstLoad.current = false;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  }

  async function checkBlockedUsers() {
    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return;

    try {
      const response = await api.get('/profile', {
        headers: { Authorization: ongId },
      });

      const newIncidents = response.data;

      const prevMap = previousBlockedMapRef.current;
      const hasChanges = newIncidents.some(incident => {
        const prevBlocked = prevMap[incident.id];
        return prevBlocked !== undefined && prevBlocked !== incident.bloqueado;
      });

      previousBlockedMapRef.current = Object.fromEntries(
        newIncidents.map(i => [i.id, i.bloqueado])
      );

      if (hasChanges) {
        setIncidents(sortIncidentsByName(newIncidents));
      }
    } catch (error) {
      console.error('Erro ao verificar bloqueios:', error);
    }
  }

  async function fetchData() {
    setLoading(true);

    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) {
      setLoading(false);
      return null;
    }

    try {
      const ongResponse = await api.get(`ongs/${ongId}`);
      const setor = ongResponse.data.setor;
      const nome = ongResponse.data.name;
      setUserData({ setor, nome });

      const profileResponse = await api.get('profile', {
        headers: { Authorization: ongId },
      });

      const sorted = sortIncidentsByName(profileResponse.data);
      setIncidents(sorted);

      previousBlockedMapRef.current = Object.fromEntries(
        sorted.map(i => [i.id, i.bloqueado])
      );

      return setor;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;

      fetchData().then(setor => {
        if (!mounted || setor !== 'Segurança') return;

        fetchUnseenNotifications();
        checkBlockedUsers();

        intervalRef.current = setInterval(() => {
          fetchUnseenNotifications();
          checkBlockedUsers();
        }, 5000);
      });

      return () => {
        mounted = false;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        isFirstLoad.current = true; // reset para não tocar som duplicado
      };
    }, [])
  );

  const filteredIncidents = incidents.filter(incident =>
    incident.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.cpf.includes(searchTerm)
  );

  // navegação e ações (mantidas iguais)
  function handleLogout() {
    AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Logon' }] });
  }

  function handleNavigateToVisitors() {
    navigation.navigate('Visitors');
  }

  function handleNavigateToHistory() {
    navigation.navigate('History');
  }

  function handleNavigateToTickets() {
    navigation.navigate('TicketDashboard');
  }

  function handleNavigateToBipagem() {
    navigation.navigate('BiparCracha');
  }

  async function handleRegisterVisit(id) {
    try {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      const incident = incidents.find(inc => inc.id === id);
      if (!incident || incident.bloqueado) {
        Alert.alert('Acesso Negado', 'Visitante bloqueado ou não encontrado.');
        return;
      }

      const response = await api.post('/visitors', {
        name: incident.nome,
        cpf: incident.cpf,
        company: incident.empresa,
        sector: incident.setor,
      }, {
        headers: { Authorization: ongId }
      });

      if (response.status === 201) {
        Alert.alert('Sucesso', 'Visita registrada!');
        navigation.navigate('Visitors');
      } else {
        throw new Error('Resposta inesperada');
      }
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  }

  function handleDeleteIncident(id) {
    Alert.alert('Confirmação', 'Deseja deletar este cadastro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            const ongId = await AsyncStorage.getItem('@Auth:ongId');
            const response = await api.delete(`incidents/${id}`, {
              headers: { Authorization: ongId }
            });
            if (response.status === 204) {
              setIncidents(incidents.filter(inc => inc.id !== id));
              Alert.alert('Sucesso', 'Cadastro deletado!');
            }
          } catch (err) {
            Alert.alert('Erro', 'Erro ao deletar cadastro');
          }
        }
      }
    ]);
  }

  function handleEditProfile(id) {
    navigation.navigate('EditIncident', { id });
  }

  function handleViewProfile(id) {
    navigation.navigate('ViewVisitor', { id });
  }

  function renderIncident({ item }) {
    return (
      <View style={styles.incidentItem}>
        <View style={styles.incidentInfo}>
          <Image
            source={item.bloqueado ? disableImg : userIconImg}
            style={styles.userIcon}
          />
          <Text style={[styles.incidentName, item.bloqueado && styles.blockedName]}>
            {item.nome}
          </Text>
        </View>
        <Text style={styles.incidentText}>Nascimento: {formatarData(item.nascimento)}</Text>
        <Text style={styles.incidentText}>CPF: {item.cpf}</Text>
        <Text style={styles.incidentText}>Empresa: {item.empresa}</Text>
        <Text style={styles.incidentText}>Setor: {item.setor}</Text>
        <Text style={styles.incidentText}>Telefone: {item.telefone}</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleRegisterVisit(item.id)} style={styles.actionButton}>
            <Feather name="user-plus" size={20} color="#34CB79" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleViewProfile(item.id)} style={styles.actionButton}>
            <Feather name="search" size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEditProfile(item.id)} style={styles.actionButton}>
            <Feather name="edit" size={20} color="#20a3e0" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteIncident(item.id)} style={styles.actionButton}>
            <Feather name="trash-2" size={20} color="#e02041" />
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
        <View style={styles.logoRow}>
          <Image source={logoImg} style={styles.logo} />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Feather name="power" size={24} color="#e02041" />
          </TouchableOpacity>
        </View>
        <Text style={styles.welcomeText}>Bem-vindo(a), {userData.nome || 'Usuário'}</Text>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            placeholder="Consultar por nome ou CPF"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('NewIncident')}>
            <Text style={styles.navButtonText}>Cadastrar Visitante</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity onPress={handleNavigateToVisitors} style={styles.menuButton}>
          <Feather name="users" size={26} color="#000" />
          <Text>Ver Visitantes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNavigateToHistory} style={styles.menuButton}>
          <Feather name="clock" size={26} color="#000" />
          <Text>Histórico</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNavigateToTickets} style={styles.menuButton}>
          <Feather name="message-square" size={26} color="#000" />
          <Text>Tickets</Text>
          {userData.setor === 'Segurança' && unseenCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{unseenCount > 9 ? '9+' : unseenCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNavigateToBipagem} style={styles.menuButton}>
          <MaterialCommunityIcons name="barcode-scan" size={26} color="#000" />
          <Text>Bipagem</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredIncidents}
        keyExtractor={item => String(item.id)}
        renderItem={renderIncident}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text>Nenhum cadastro encontrado.</Text>
          </View>
        )}
      />
      <View style={styles.margin}></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#fff' },
  header: {},
  logo: { width: 54, height: 60 },
  welcomeText: { fontSize: 16, marginTop: 20, marginBottom: 25 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderColor: '#ddd', borderWidth: 1,
    paddingHorizontal: 8, borderRadius: 8,
    marginBottom: 25,
  },
  searchInput: { flex: 1, height: 40, marginLeft: 8 },
  navButtons: { alignItems: 'center' },
  navButton: {
    width: '100%', backgroundColor: '#10B981',
    padding: 15, borderRadius: 8
  },
  navButtonText: { textAlign: 'center', color: '#fff', fontWeight: 'bold' },
  logoutButton: { padding: 8 },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 30
  },
  menuButton: { alignItems: 'center' },
  notificationBadge: {
    backgroundColor: '#e02041',
    borderRadius: 12,
    paddingHorizontal: 6,
    position: 'absolute',
    top: -6,
    right: -10,
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  incidentItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  incidentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userIcon: { width: 16, height: 16, marginRight: 8 },
  incidentName: { fontSize: 16, fontWeight: 'bold', flexShrink: 1, maxWidth: '85%' },
  blockedName: { color: 'red' },
  incidentText: { fontSize: 14, marginBottom: 4 },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: { padding: 8 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoRow: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  margin: { marginBottom: 40 }
});