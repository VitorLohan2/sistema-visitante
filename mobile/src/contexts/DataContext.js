// import React, { createContext, useState, useContext, useEffect } from "react";
// import api from "../services/api";
// import { useAuthSocket } from "./SocketContext";

// const DataContext = createContext();

// export function DataProvider({ children }) {
//   const { socket, authStatus } = useAuthSocket();

//   const [ong, setOng] = useState(null);
//   const [incidents, setIncidents] = useState([]);
//   const [visitantes, setVisitantes] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // 🔥 1) Carrega tudo UMA VEZ após login
//   useEffect(() => {
//     if (!authStatus) return;

//     async function loadInitialData() {
//       try {
//         const [ongRes, incidentsRes, visitantesRes] = await Promise.all([
//           api.get("/profile"),
//           api.get("/incidents"),
//           api.get("/visitantes"),
//         ]);

//         setOng(ongRes.data);
//         setIncidents(incidentsRes.data);
//         setVisitantes(visitantesRes.data);
//       } catch (error) {
//         console.log("Erro inicial:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadInitialData();
//   }, [authStatus]);

//   // 🔥 2) Recebe updates em tempo real pelo socket
//   useEffect(() => {
//     if (!socket) return;

//     // INCIDENTES
//     socket.on("incidentCreated", (newIncident) => {
//       setIncidents((prev) => [newIncident, ...prev]);
//     });

//     socket.on("incidentUpdated", (updated) => {
//       setIncidents((prev) =>
//         prev.map((i) => (i.id === updated.id ? updated : i))
//       );
//     });

//     socket.on("incidentDeleted", (id) => {
//       setIncidents((prev) => prev.filter((i) => i.id !== id));
//     });

//     // VISITANTES
//     socket.on("visitanteCreated", (novo) => {
//       setVisitantes((p) => [novo, ...p]);
//     });

//     socket.on("visitanteUpdated", (editado) => {
//       setVisitantes((p) => p.map((v) => (v.id === editado.id ? editado : v)));
//     });

//     socket.on("visitanteDeleted", (id) => {
//       setVisitantes((p) => p.filter((v) => v.id !== id));
//     });

//     return () => {
//       socket.off("incidentCreated");
//       socket.off("incidentUpdated");
//       socket.off("incidentDeleted");

//       socket.off("visitanteCreated");
//       socket.off("visitanteUpdated");
//       socket.off("visitanteDeleted");
//     };
//   }, [socket]);

//   return (
//     <DataContext.Provider
//       value={{
//         ong,
//         incidents,
//         visitantes,
//         loading,
//       }}
//     >
//       {children}
//     </DataContext.Provider>
//   );
// }

// export function useData() {
//   return useContext(DataContext);
// }
