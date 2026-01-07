// src/routes/ProtectedRoute.jsx
import React, { useState } from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SidebarMenu from "../components/SidebarMenu";
import ConfigModal from "../components/ConfigModal";
import "../styles/layout.css";

export default function ProtectedRoute({ children, ...rest }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [unseenCount, setUnseenCount] = useState(0);

  const handleOpenConfigModal = async () => {
    try {
      setUserDetails(user);
      setConfigModalVisible(true);
    } catch (err) {
      console.error("Erro ao carregar informações do usuário:", err);
    }
  };

  const handleCloseConfigModal = () => {
    setConfigModalVisible(false);
    setUserDetails(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div>Verificando autenticação...</div>
        <div style={{ fontSize: "14px", color: "#666" }}>
          Aguarde um momento
        </div>
      </div>
    );
  }

  return (
    <Route
      {...rest}
      render={({ location }) =>
        isAuthenticated ? (
          <div className="layout-container">
            <SidebarMenu
              unseenCount={unseenCount}
              handleOpenConfigModal={handleOpenConfigModal}
            />
            <main className="layout-main">{children}</main>
            {configModalVisible && userDetails && (
              <ConfigModal
                userDetails={userDetails}
                onClose={handleCloseConfigModal}
              />
            )}
          </div>
        ) : (
          <Redirect
            to={{
              pathname: "/",
              state: { from: location },
            }}
          />
        )
      }
    />
  );
}
