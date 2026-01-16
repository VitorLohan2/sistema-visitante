import React from "react";

import "./styles/layout.css";
import Routes from "./routes/routes";
import { AuthProvider } from "./hooks/useAuth";
import { TicketProvider } from "./contexts/TicketContext";
import { AgendamentoProvider } from "./contexts/AgendamentoContext";
import { DescargaProvider } from "./contexts/DescargaContext";
import ChatWidget from "./components/ChatWidget";

function App() {
  return (
    <AuthProvider>
      <TicketProvider>
        <AgendamentoProvider>
          <DescargaProvider>
            <Routes />
            {/* Widget de Chat flutuante - disponível em todas as páginas */}
            <ChatWidget />
          </DescargaProvider>
        </AgendamentoProvider>
      </TicketProvider>
    </AuthProvider>
  );
}

export default App;
