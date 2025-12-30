// Card do visitante
import React from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { styles } from "../Profile/styles";
import userIconImg from "../../assets/user.png";

export default function CardVisitantes({
  item,
  onRegisterVisit,
  onViewProfile,
  onEditProfile,
  onDelete,
  formatarData,
}) {
  const avatarSource = item.avatar_imagem
    ? { uri: item.avatar_imagem }
    : userIconImg;

  return (
    <View
      style={[
        styles.incidentItem,
        item.bloqueado && styles.incidentItemBlocked,
      ]}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardAvatar}>
          <Image source={avatarSource} style={styles.avatarImage} />
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.incidentNameRow}>
            <Text
              style={[
                styles.incidentName,
                item.bloqueado && styles.blockedName,
              ]}
            >
              {item.nome}
            </Text>
            {item.bloqueado && (
              <View style={styles.blockedBadge}>
                <Text style={styles.blockedBadgeText}>BLOQUEADO</Text>
              </View>
            )}
          </View>

          <View style={styles.cardDetailRow}>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>Nascimento</Text>
              <Text style={styles.incidentTextValue}>
                {formatarData(item.nascimento)}
              </Text>
            </View>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>CPF</Text>
              <Text style={styles.incidentTextValue}>{item.cpf}</Text>
            </View>
          </View>

          <View style={styles.cardDetailRow}>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>Empresa</Text>
              <Text style={styles.incidentTextValue}>{item.empresa}</Text>
            </View>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>Setor</Text>
              <Text style={styles.incidentTextValue}>{item.setor}</Text>
            </View>
          </View>

          <View style={styles.cardDetailRow}>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>Placa</Text>
              <Text style={styles.incidentTextValue}>
                {item.placa_veiculo || "-"}
              </Text>
            </View>
            <View style={styles.cardDetailColumn}>
              <Text style={styles.detailLabel}>Cor</Text>
              <Text style={styles.incidentTextValue}>
                {item.cor_veiculo || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.cardDetailRow}>
            <View style={styles.cardDetailColumnFull}>
              <Text style={styles.detailLabel}>Telefone</Text>
              <Text style={styles.incidentTextValue}>{item.telefone}</Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.actionsContainer,
          item.bloqueado && styles.incidentItemBlocked,
        ]}
      >
        <TouchableOpacity
          onPress={() => onRegisterVisit(item.id)}
          style={[styles.actionButton, styles.actionVisit]}
          disabled={item.bloqueado}
        >
          <Feather
            name="user-plus"
            size={20}
            color={item.bloqueado ? "#ccc" : "#34CB79"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onViewProfile(item.id)}
          style={styles.actionButton}
        >
          <Feather name="search" size={20} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onEditProfile(item.id)}
          style={styles.actionButton}
        >
          <Feather name="edit" size={20} color="#20a3e0" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert("Crachá", "Funcionalidade de crachá.");
          }}
          style={styles.actionButton}
        >
          <Feather name="user-check" size={20} color="#f9a825" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={styles.actionButton}
        >
          <Feather name="trash-2" size={20} color="#e02041" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
