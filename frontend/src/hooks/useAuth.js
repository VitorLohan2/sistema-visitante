import { useState, useEffect, useContext, createContext } from "react";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem("token");
    const usuarioStr = localStorage.getItem("usuario");

    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        setIsAuthenticated(true);
        setUser({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          empresa_id: usuario.empresa_id,
          setor_id: usuario.setor_id,
        });
      } catch (error) {
        console.error("Erro ao fazer parse do usuário:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }

    setLoading(false);
  };

  const login = (token, usuario) => {
    console.log("Fazendo login com:", usuario.email);

    localStorage.setItem("token", token);
    localStorage.setItem(
      "usuario",
      JSON.stringify({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        empresa_id: usuario.empresa_id,
        setor_id: usuario.setor_id,
      })
    );

    setIsAuthenticated(true);
    setUser({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      empresa_id: usuario.empresa_id,
      setor_id: usuario.setor_id,
    });
  };

  const logout = () => {
    console.log("Fazendo logout");

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setIsAuthenticated(false);
    setUser(null);

    // Redireciona para a página inicial
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        login,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
};
