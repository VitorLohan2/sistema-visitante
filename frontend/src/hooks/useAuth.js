import { useState, useEffect, useContext, createContext } from 'react';
import { useHistory } from 'react-router-dom';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const ongId = localStorage.getItem('ongId');
    const ongName = localStorage.getItem('ongName');
    const ongType = localStorage.getItem('ongType');
    
    //console.log('Verificando autenticação:', { ongId, ongName, ongType });
    
    if (ongId && ongName) {
      setIsAuthenticated(true);
      setUser({
        id: ongId,
        name: ongName,
        type: ongType
      });
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    
    setLoading(false);
  };

  const login = (userData) => {
    console.log('Fazendo login com:', userData);
    
    localStorage.setItem('token', userData.id);
    localStorage.setItem('ongId', userData.id);
    localStorage.setItem('ongName', userData.name);
    localStorage.setItem('ongType', userData.type);
    
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    console.log('Fazendo logout');
    
    localStorage.removeItem('token');
    localStorage.removeItem('ongId');
    localStorage.removeItem('ongName');
    localStorage.removeItem('ongType');
    
    setIsAuthenticated(false);
    setUser(null);
    
    // Redireciona para a página inicial
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      loading,
      user,
      login,
      logout,
      checkAuthStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};