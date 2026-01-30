import React, { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./styles/layout.css";
import "./styles/toast.css";
import Routes from "./routes/routes";
import { AuthProvider } from "./hooks/useAuth";
import { TicketProvider } from "./contexts/TicketContext";
import { AgendamentoProvider } from "./contexts/AgendamentoContext";
import { DescargaProvider } from "./contexts/DescargaContext";
import { ChatSuporteProvider } from "./contexts/ChatSuporteContext";
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
      <TicketProvider>
        <AgendamentoProvider>
          <DescargaProvider>
            <ChatSuporteProvider>
              <Routes />
              {/* Widget de Chat flutuante - disponível em todas as páginas */}
              <ChatWidget />
              {/* Container de notificações Toast - disponível globalmente */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                limit={5}
              />
            </ChatSuporteProvider>
          </DescargaProvider>
        </AgendamentoProvider>
      </TicketProvider>
    </AuthProvider>
  );
}

export default App;
