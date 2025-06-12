import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../services/api';

export default function ViewVisitor() {
  const route = useRoute();
  const { id } = route.params;
  const navigation = useNavigation();
  const [visitor, setVisitor] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [ongName, setOngName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const ongId = await AsyncStorage.getItem('@Auth:ongId');
      const storedOngName = await AsyncStorage.getItem('@Auth:ongName');
      
      if (storedOngName) {
        setOngName(storedOngName);
      }

      try {
        const response = await api.get(`/incidents/${id}`, {
          headers: { Authorization: ongId }
        });
        
        // Extrai as fotos dos campos imagem1, imagem2, imagem3
        const fotos = [];
        if (response.data.imagem1) fotos.push(response.data.imagem1);
        if (response.data.imagem2) fotos.push(response.data.imagem2);
        if (response.data.imagem3) fotos.push(response.data.imagem3);
        
        setVisitor({
          ...response.data,
          fotos // Adiciona o array de fotos ao state
        });
        
      } catch (err) {
        Alert.alert('Erro', 'Erro ao buscar o cadastro.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, navigation]);

  const formatCPF = (cpf) => {
    if (!cpf) return '';
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  const formatTelefone = (tel) => {
    if (!tel) return '';
    return tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!visitor) {
    return (
      <View style={styles.container}>
        <Text>Nenhum visitante encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {flex: 1}]}>
          <Feather name="arrow-left" size={24} color="#E02041" />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Visualização de Cadastro</Text>
        <Text style={styles.subtitle}>Informações detalhadas do visitante.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={visitor.nome}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            style={styles.input}
            value={visitor.nascimento}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={formatCPF(visitor.cpf)}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Empresa</Text>
          <TextInput
            style={styles.input}
            value={visitor.empresa}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Setor</Text>
          <TextInput
            style={styles.input}
            value={visitor.setor}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={formatTelefone(visitor.telefone)}
            editable={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Observação</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={visitor.observacao || ''}
            editable={false}
            multiline
          />
        </View>

        <Text style={styles.label}>Fotos do Visitante</Text>
        <View style={styles.photoGallery}>
          {visitor.fotos && visitor.fotos.length > 0 ? (
            visitor.fotos.map((foto, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoThumbnail}
                onPress={() => setSelectedImage(foto)}
              >
                <Image
                  style={styles.thumbnailImage}
                  source={{ uri: `${api.defaults.baseURL}/uploads/${foto}` }}
                  onError={() => console.log('Erro ao carregar imagem')}
                />
                <Text style={styles.photoLabel}>Foto {index + 1}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noPhotos}>
              <Feather name="image" size={24} color="#737380" />
              <Text style={styles.noPhotosText}>Nenhuma foto cadastrada</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal para visualização ampliada */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer} onPress={() => setSelectedImage(null)}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            style={styles.modalImage}
            source={{ uri: `${api.defaults.baseURL}/uploads/${selectedImage}` }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 30,
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
  content: {
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#13131a',
  },
  subtitle: {
    fontSize: 16,
    color: '#737380',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#41414d',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#41414d',
  },
  textArea: {
    height: 100,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  photoGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  photoThumbnail: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f5',
  },
  photoLabel: {
    marginTop: 8,
    color: '#737380',
  },
  noPhotos: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
  },
  noPhotosText: {
    marginTop: 8,
    color: '#737380',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
});