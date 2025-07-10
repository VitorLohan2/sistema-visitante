// Página de cadastro de visitante em React Native
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  Image,
  Modal,
  Pressable
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';

export default function NewVisitorMobile() {
  const [form, setForm] = useState({
    nome: '',
    nascimento: '',
    nascimentoISO: '',
    cpf: '',
    empresa: '',
    setor: '',
    telefone: '',
    observacao: '',
    fotos: []
  });

  const empresas = ['Dime', 'Dimep'];
  const setores = ['Reunião', 'Entrega', 'Visita'];
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const navigation = useNavigation();

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cleaned;
  };

  const formatarDataDDMMYYYY = (date) => {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    return cleaned.length === 11
      ? cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : cleaned;
  };

  const handleChange = (name, value) => {
    const newValue = name === 'nome' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: newValue }));
  };

  const takePhoto = async () => {
    if (form.fotos.length >= 3) {
      return Alert.alert('Limite atingido', 'Máximo de 3 imagens.');
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permissão negada', 'Habilite o uso da câmera.');
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      base64: false
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
      
        console.log('URI manipulada:', manipulatedImage.uri);

        setForm(prev => ({
          ...prev,
          fotos: [...prev.fotos, { ...asset, uri: manipulatedImage.uri }]
        }));
      } catch (error) {
        console.error('❌ Erro ao processar imagem:', error);
        Alert.alert('Erro ao processar imagem.');
      }
    }
  };

  const pickImage = async () => {
    if (form.fotos.length >= 3) {
      return Alert.alert('Limite atingido', 'Máximo de 3 imagens.');
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permissão negada', 'Habilite o acesso à galeria.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 3 - form.fotos.length
    });

    if (!result.canceled) {
      try {
        const novasImagens = await Promise.all(
          result.assets.slice(0, 3 - form.fotos.length).map(async (asset) => {
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              asset.uri,
              [],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            console.log('Imagem manipulada:', manipulatedImage.uri);

            return { ...asset, uri: manipulatedImage.uri };
          })
        );

        setForm(prev => ({
          ...prev,
          fotos: [...prev.fotos, ...novasImagens]
        }));
      } catch (error) {
        console.error('❌ Erro ao processar imagem da galeria:', error);
        Alert.alert('Erro ao processar imagens da galeria.');
      }
    }
  };

  const handleRemoveImage = (index) => {
    setForm(prev => ({
      ...prev,
      fotos: prev.fotos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    const cpfClean = form.cpf.replace(/\D/g, '');
    const telefoneClean = form.telefone.replace(/\D/g, '');

    if (cpfClean.length !== 11) return Alert.alert('CPF inválido');
    if (telefoneClean.length !== 11) return Alert.alert('Telefone inválido');
    if (!form.empresa || !form.setor) return Alert.alert('Preencha empresa e setor.');
    if (form.fotos.length === 0) return Alert.alert('Envie ao menos uma imagem.');

    const ongId = await AsyncStorage.getItem('@Auth:ongId');
    if (!ongId) return Alert.alert('Erro', 'Usuário não autenticado');

    const data = new FormData();
    data.append('nome', form.nome);
    data.append('nascimento', form.nascimentoISO);
    data.append('cpf', cpfClean);
    data.append('empresa', form.empresa);
    data.append('setor', form.setor);
    data.append('telefone', telefoneClean);
    data.append('observacao', form.observacao);

    form.fotos.forEach((image, i) => {
      data.append('fotos', {
        uri: image.uri,
        name: `image_${i}.jpg`,
        type: 'image/jpeg'
      });
    });

    try {
      await api.post('/incidents', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: ongId
        }
      });

      Alert.alert('Sucesso', 'Visitante cadastrado com sucesso!');
      navigation.navigate('Profile');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Falha ao cadastrar visitante.');
    }
  };

  return (
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={100}
        extraHeight={100}
        enableResetScrollToCoords={true}
      >
      <View style={styles.blocoCadastro}>
      <Text style={styles.title}>Cadastrar Visitante</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={form.nome}
        onChangeText={(text) => handleChange('nome', text)}
      />

      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: form.nascimento ? '#000' : '#888' }}>
          {form.nascimento || 'Selecionar data de nascimento'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={form.nascimentoISO ? new Date(form.nascimentoISO) : new Date(1999, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              const iso = selectedDate.toISOString().split('T')[0];
              const formatada = formatarDataDDMMYYYY(selectedDate);
              setForm(prev => ({ ...prev, nascimento: formatada, nascimentoISO: iso }));
            }
          }}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="CPF"
        value={form.cpf}
        keyboardType="numeric"
        onChangeText={(text) => handleChange('cpf', formatCPF(text))}
      />

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={form.empresa}
          onValueChange={(val) => handleChange('empresa', val)}
        >
          <Picker.Item label="Selecione a empresa" value="" />
          {empresas.map((opt, i) => (
            <Picker.Item key={i} label={opt} value={opt} />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={form.setor}
          onValueChange={(val) => handleChange('setor', val)}
        >
          <Picker.Item label="Selecione o setor" value="" />
          {setores.map((opt, i) => (
            <Picker.Item key={i} label={opt} value={opt} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Telefone"
        keyboardType="phone-pad"
        value={form.telefone}
        onChangeText={(text) => handleChange('telefone', formatTelefone(text))}
      />

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Observações"
        multiline
        value={form.observacao}
        onChangeText={(text) => handleChange('observacao', text)}
      />

      <View style={styles.imageRow}>
        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
          <MaterialIcons name="photo-camera" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.imageButtonText}>Tirar Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <MaterialIcons name="photo-library" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.imageButtonText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        {form.fotos.map((img, index) => (
          <View key={index} style={styles.previewWrapper}>
            <Pressable onPress={() => setModalImage(img.uri)}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
            </Pressable>
            <TouchableOpacity
              onPress={() => handleRemoveImage(index)}
              style={styles.removeBtn}
            >
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>Cadastrar</Text>
      </TouchableOpacity>

      <Modal visible={!!modalImage} transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setModalImage(null)}>
          <Image source={{ uri: modalImage }} style={styles.fullImage} resizeMode="contain" />
        </Pressable>
      </Modal>
      </View>  
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  blocoCadastro: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginTop: 40,
    marginBottom: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 14,
    height: 56,
    marginBottom: 10,
    fontSize: 16
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden'
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#3883c2',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  previewWrapper: {
    marginRight: 10,
    marginBottom: 10,
    position: 'relative'
  },
  previewImage: {
    width: 80,
    height: 80,
    marginTop: 10,
    borderRadius: 6
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  removeText: {
    color: '#fff',
    fontSize: 18,
    top: -2,
    right: 0
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 60
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullImage: {
    width: '90%',
    height: '90%'
  }
});
