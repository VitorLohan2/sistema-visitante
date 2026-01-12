import React from "react";

import "./global.css";
import Routes from "./routes/routes";
import { AuthProvider } from "./hooks/useAuth";
import { TicketProvider } from "./contexts/TicketContext";
import { AgendamentoProvider } from "./contexts/AgendamentoContext";

function App() {
  return (
    <AuthProvider>
      <TicketProvider>
        <AgendamentoProvider>
          <Routes />
        </AgendamentoProvider>
      </TicketProvider>
    </AuthProvider>
  );
}

export default App;
