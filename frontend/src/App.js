import React, { useEffect, useState } from "react";

import "./styles/layout.css";
import Routes from "./routes/routes";
import { AuthProvider } from "./hooks/useAuth";
import { TicketProvider } from "./contexts/TicketContext";
import { AgendamentoProvider } from "./contexts/AgendamentoContext";
import { DescargaProvider } from "./contexts/DescargaContext";
import { ChatSuporteProvider } from "./contexts/ChatSuporteContext";
import { ToastProvider } from "./contexts/ToastContext";
import ChatWidget from "./components/ChatWidget";
import UpdateNotification from "./components/UpdateNotification";
import {
  initVersionCheck,
  stopVersionCheck,
  onUpdateAvailable,
  performUpdate,
  dismissUpdate,
} from "./services/versionService";

function App() {
  // Estado para controlar notificação de atualização
  const [updateInfo, setUpdateInfo] = useState(null);

  // Inicializa verificação de versão ao montar o App
  useEffect(() => {
    initVersionCheck();

    // Registra listener para quando houver atualização disponível
    const unsubscribe = onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    // Cleanup ao desmontar
    return () => {
      stopVersionCheck();
      unsubscribe();
    };
  }, []);

  // Handler para quando o usuário clica em "Atualizar"
  const handleUpdate = async () => {
    await performUpdate();
  };

  // Handler para quando o usuário clica em "Dispensar"
  const handleDismiss = () => {
    dismissUpdate();
    setUpdateInfo(null);
  };

  return (
    <AuthProvider>
      <ToastProvider>
        {/* Notificação de atualização - sempre no topo */}
        {updateInfo && (
          <UpdateNotification
            version={updateInfo.version}
            onUpdate={handleUpdate}
            onDismiss={handleDismiss}
          />
        )}

        <TicketProvider>
          <AgendamentoProvider>
            <DescargaProvider>
              <ChatSuporteProvider>
                <Routes />
                {/* Widget de Chat flutuante - disponível em todas as páginas */}
                <ChatWidget />
              </ChatSuporteProvider>
            </DescargaProvider>
          </AgendamentoProvider>
        </TicketProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
