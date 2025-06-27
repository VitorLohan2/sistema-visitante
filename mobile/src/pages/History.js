// Página de Historico de Visitantes em React Native
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import api from '../services/api';
import logoImg from '../assets/logo.png';
import pdfIcon from '../assets/file.png';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ongName, setOngName] = useState('');

  const navigation = useNavigation();

  useEffect(() => {
    async function loadData() {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      const storedOngName = await AsyncStorage.getItem('@Auth:ongName');
      
      if (storedOngName) {
        setOngName(storedOngName);
      }

      try {
        const response = await api.get('history', {
          headers: {
            Authorization: ongId,
          },
        });

        const sortedData = response.data.sort((a, b) => {
          const dateA = new Date(a.entry_date || a.created_at);
          const dateB = new Date(b.entry_date || b.created_at);
          return dateB - dateA;
        });
        setHistoryData(sortedData);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        Alert.alert('Erro', 'Não foi possível carregar o histórico de visitas');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFilterDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const clearDateFilter = () => {
    setFilterDate(null);
  };

  const filteredHistoryData = historyData.filter(visitor => {
    const matchesSearch =
      (visitor.name && visitor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (visitor.cpf && visitor.cpf.includes(searchTerm));

    if (!filterDate) return matchesSearch;

    const visitorDate = new Date(visitor.entry_date || visitor.created_at);
    return (
      matchesSearch &&
      visitorDate.getDate() === filterDate.getDate() &&
      visitorDate.getMonth() === filterDate.getMonth() &&
      visitorDate.getFullYear() === filterDate.getFullYear()
    );
  });

  async function exportToPDF(data) {
    try {
      if (data.length === 0) {
        Alert.alert('Aviso', 'Não há dados para exportar.');
        return;
      }

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Permissão para salvar arquivo",
            message: "O aplicativo precisa de permissão para salvar o PDF.",
            buttonNeutral: "Perguntar depois",
            buttonNegative: "Cancelar",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permissão negada', 'Não foi possível salvar o PDF sem permissão.');
          return;
        }
      }

      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial; font-size: 10px; padding: 20px; }
              h1 { text-align: center; font-size: 14px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background-color: #f2f2f2; text-align: left; padding: 8px; border: 1px solid #ddd; }
              td { padding: 8px; border: 1px solid #ddd; }
              .footer { text-align: right; font-size: 9px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <h1>Relatório de Visitas - ${ongName}</h1>
            <table>
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>CPF</th>
                <th>Empresa</th>
                <th>Setor</th>
                <th>Entrada</th>
                <th>Saída</th>
              </tr>
      `;

      data.forEach((visitor, index) => {
        htmlContent += `
          <tr>
            <td>${data.length - index}</td>
            <td>${visitor.name || 'Não informado'}</td>
            <td>${visitor.cpf || 'Não informado'}</td>
            <td>${visitor.company || visitor.empresa || 'Não informado'}</td>
            <td>${visitor.sector || visitor.setor || 'Não informado'}</td>
            <td>${
              visitor.entry_date
                ? new Date(visitor.entry_date).toLocaleString()
                : new Date(visitor.created_at).toLocaleString()
            }</td>
            <td>${
              visitor.exit_date
                ? new Date(visitor.exit_date).toLocaleString()
                : 'Não informado'
            }</td>
          </tr>
        `;
      });

      htmlContent += `
            </table>
            <div class="footer">Gerado em: ${new Date().toLocaleString()}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        base64: false
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'PDF Gerado',
          `Arquivo salvo em: ${uri}`,
          [{ text: 'OK' }]
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Relatório PDF',
        UTI: 'com.adobe.pdf'
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert(
        'Erro', 
        'Não foi possível gerar o PDF. Por favor, tente novamente.',
        [{ text: 'OK' }]
      );
    }
  }

  function renderVisitorItem({ item, index }) {
    return (
      <View style={styles.visitorItem}>
        <Text style={styles.visitorText}>{filteredHistoryData.length - index}</Text>
        <Text style={styles.visitorText}>{item.name || 'Não informado'}</Text>
        <Text style={styles.visitorText}>{item.cpf || 'Não informado'}</Text>
        <Text style={styles.visitorText}>{item.company || item.empresa || 'Não informado'}</Text>
        <Text style={styles.visitorText}>{item.sector || item.setor || 'Não informado'}</Text>
        <Text style={styles.visitorText}>
          {item.entry_date
            ? new Date(item.entry_date).toLocaleString()
            : new Date(item.created_at).toLocaleString()}
        </Text>
        <Text style={styles.visitorText}>
          {item.exit_date
            ? new Date(item.exit_date).toLocaleString()
            : 'Não informado'}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, {flex: 1}]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        
        <View style={{flex: 2, alignItems: 'center'}}>
          <Text style={styles.logoText}>Histórico</Text>
        </View>
        
        <View style={{flex: 1}}></View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Consultar por nome ou CPF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => exportToPDF(filteredHistoryData)}
        >
          <Image source={pdfIcon} style={styles.pdfIcon} />
          <Text style={styles.reportButtonText}>Gerar Relatório</Text>
        </TouchableOpacity>

        <View style={styles.dateFilterContainer}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={showDatepicker}
          >
            <Feather name="calendar" size={20} color="#10B981" />
            <Text style={styles.dateButtonText}>
              {filterDate ? filterDate.toLocaleDateString('pt-BR') : 'Filtrar por data'}
            </Text>
          </TouchableOpacity>
          
          {filterDate && (
            <TouchableOpacity 
              style={styles.clearDateButton}
              onPress={clearDateFilter}
            >
              <Feather name="x" size={16} color="#E02041" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={filterDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
        />
      )}

      <ScrollView horizontal>
        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>#</Text>
            <Text style={styles.headerText}>Nome</Text>
            <Text style={styles.headerText}>CPF</Text>
            <Text style={styles.headerText}>Empresa</Text>
            <Text style={styles.headerText}>Setor</Text>
            <Text style={styles.headerText}>Entrada</Text>
            <Text style={styles.headerText}>Saída</Text>
          </View>

          {filteredHistoryData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma visita encerrada até o momento.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredHistoryData}
              keyExtractor={item => item.id.toString()}
              renderItem={renderVisitorItem}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 30,
  },
  searchIcon: {
    marginRight: 5,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pdfIcon: {
    marginRight: 5,
  },
  reportButtonText: {
    color: '#fff',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    marginLeft: 8,
    color: '#10B981',
  },
  clearDateButton: {
    marginLeft: 8,
    padding: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  headerText: {
    fontWeight: 'bold',
    width: 120,
    textAlign: 'center',
  },
  visitorItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  visitorText: {
    width: 120,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
});