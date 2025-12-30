// Modal do menu lateral
import React from "react";
import { View, Text, TouchableOpacity, Animated, Alert } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { styles } from "../Profile/styles";

export default function MenuLateral({
  visible,
  userData,
  width,
  isAnimating,
  modalPosition,
  overlayOpacity,
  onClose,
  onNavigateAdmin,
  onNavigateAgendamentos,
  onNavigateChat,
  onLogout,
}) {
  return (
    <Animated.View
      style={[
        styles.menuModalOverlay,
        {
          opacity: overlayOpacity,
          display: visible ? "flex" : "none",
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity
        style={styles.menuModalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.menuModalContainer,
          {
            transform: [{ translateX: modalPosition }],
            width: width * 0.75,
          },
        ]}
      >
        <View style={styles.menuModalHeader}>
          <View style={styles.menuModalHeaderContent}>
            <View style={styles.menuModalUserInfo}>
              <View style={styles.menuModalAvatar}>
                <Feather name="user" size={40} color="#10B981" />
              </View>
              <View>
                <Text style={styles.menuModalUserName}>
                  {userData.nome || "Usuário"}
                </Text>
                <Text style={styles.menuModalUserSetor}>
                  {userData.setor || "Setor não informado"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.menuModalCloseButton}
              disabled={isAnimating}
            >
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuModalOptions}>
          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={onNavigateAdmin}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(249, 168, 37, 0.1)" },
              ]}
            >
              <Feather name="globe" size={24} color="#f9a825" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Painel Admin</Text>
              <Text style={styles.menuModalOptionDescription}>
                Sistema Administrador
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={onNavigateAgendamentos}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(16, 185, 129, 0.1)" },
              ]}
            >
              <Feather name="calendar" size={24} color="#10B981" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Agendamentos</Text>
              <Text style={styles.menuModalOptionDescription}>
                Visitas Agendadas
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={() => {
              onClose();
              Alert.alert(
                "Em desenvolvimento",
                "Funcionalidade em desenvolvimento"
              );
            }}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(32, 163, 224, 0.1)" },
              ]}
            >
              <Feather name="users" size={24} color="#20a3e0" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>
                Gerenciador de Funcionários
              </Text>
              <Text style={styles.menuModalOptionDescription}>
                Controle de Funcionários
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={() => {
              onClose();
              Alert.alert(
                "Em desenvolvimento",
                "Funcionalidade em desenvolvimento"
              );
            }}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(32, 45, 224, 0.1)" },
              ]}
            >
              <Feather name="briefcase" size={24} color="#202de0ff" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>
                Cadastrar Empresas
              </Text>
              <Text style={styles.menuModalOptionDescription}>
                Empresa não cadastrado
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={() => {
              onClose();
              Alert.alert(
                "Em desenvolvimento",
                "Funcionalidade em desenvolvimento"
              );
            }}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(249, 168, 37, 0.1)" },
              ]}
            >
              <Feather name="check-square" size={24} color="#f9a825" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Marcador de Ponto</Text>
              <Text style={styles.menuModalOptionDescription}>
                Marque seu ponto
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={() => {
              onClose();
              Alert.alert(
                "Em desenvolvimento",
                "Funcionalidade em desenvolvimento"
              );
            }}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(249, 168, 37, 0.1)" },
              ]}
            >
              <Feather name="settings" size={24} color="#f9a825" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Configurações</Text>
              <Text style={styles.menuModalOptionDescription}>
                Configurações do sistema
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={onNavigateChat}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(224, 32, 65, 0.1)" },
              ]}
            >
              <Feather name="help-circle" size={24} color="#e02041" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Suporte</Text>
              <Text style={styles.menuModalOptionDescription}>
                Central de ajuda e suporte
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuModalOption}
            onPress={() => {
              onClose();
              onLogout();
            }}
            disabled={isAnimating}
          >
            <View
              style={[
                styles.menuModalIcon,
                { backgroundColor: "rgba(160, 174, 192, 0.1)" },
              ]}
            >
              <Feather name="log-out" size={24} color="#a0aec0" />
            </View>
            <View style={styles.menuModalOptionContent}>
              <Text style={styles.menuModalOptionTitle}>Sair</Text>
              <Text style={styles.menuModalOptionDescription}>
                Sair do sistema
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.menuModalFooter}>
          <Text style={styles.menuModalVersion}>v1.0.0</Text>
          <Text style={styles.menuModalCopyright}>© 2025 Sistema Liberaê</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
