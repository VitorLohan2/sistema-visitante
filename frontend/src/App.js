import React, { useEffect } from "react";

import "./styles/layout.css";
import Routes from "./routes/routes";
import { AuthProvider } from "./hooks/useAuth";
import { TicketProvider } from "./contexts/TicketContext";
import { AgendamentoProvider } from "./contexts/AgendamentoContext";
import { DescargaProvider } from "./contexts/DescargaContext";
import { ChatSuporteProvider } from "./contexts/ChatSuporteContext";
import { ToastProvider } from "./contexts/ToastContext";
import ChatWidget from "./components/ChatWidget";
import { initVersionCheck, stopVersionCheck } from "./services/versionService";

function App() {
  // Inicializa verificação de versão ao montar o App
  useEffect(() => {
    initVersionCheck();

    // Cleanup ao desmontar
    return () => {
      stopVersionCheck();
    };
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
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
