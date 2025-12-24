// src/pages/EditarEmpresa/styles.js
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // CONTAINER E CABEÇALHO
  // ═══════════════════════════════════════════════════════════════
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoRow: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 54,
    height: 60,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  headerContent: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTEÚDO
  // ═══════════════════════════════════════════════════════════════
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // ═══════════════════════════════════════════════════════════════
  // FORMULÁRIO
  // ═══════════════════════════════════════════════════════════════
  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#334155",
    marginBottom: 8,
  },

  required: {
    color: "#ef4444",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#1e293b",
  },

  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },

  // ═══════════════════════════════════════════════════════════════
  // BOTÃO SALVAR
  // ═══════════════════════════════════════════════════════════════
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
    gap: 8,
  },

  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },

  saveButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },

  // ═══════════════════════════════════════════════════════════════
  // MARGEM FINAL
  // ═══════════════════════════════════════════════════════════════
  margin: {
    height: 30,
  },
});
