import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, UserRegistrationData, setApiToken } from '../services/api';
import { useAutoLogout } from '../hooks/useAutoLogout';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: UserRegistrationData) => Promise<void>;
  logout: () => void;
  setActiveSessionInfo: (id: number | null, createdAt: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // O token agora é gerenciado internamente pela API e pelo estado de autenticação
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('is_auth'));
  const [isAdmin, setIsAdmin] = useState<boolean>(sessionStorage.getItem('is_admin') === 'true');
  const [loginTime, setLoginTime] = useState<string | null>(localStorage.getItem('login_time'));
  const [activeSession, setActiveSession] = useState<{id: number, createdAt: string} | null>(null);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('access_token');
    const storedLoginTime = localStorage.getItem('login_time');
    
    if (storedToken) {
      setApiToken(storedToken);
      api.getCurrentUser()
        .then((user) => {
          const nextIsAdmin = !!user.is_superuser;
          sessionStorage.setItem('is_auth', 'true');
          sessionStorage.setItem('is_admin', String(nextIsAdmin));
          setIsAuthenticated(true);
          setIsAdmin(nextIsAdmin);
        })
        .catch(() => {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('is_auth');
          sessionStorage.removeItem('is_admin');
          localStorage.removeItem('login_time');
          setApiToken(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoginTime(null);
        });
    }
    if (storedLoginTime) {
      setLoginTime(storedLoginTime);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('is_auth');
    sessionStorage.removeItem('is_admin');
    localStorage.removeItem('login_time');
    setApiToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setLoginTime(null);
    setActiveSession(null);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      const newLoginTime = new Date().toISOString();

      setApiToken(response.access_token);
      const currentUser = await api.getCurrentUser();
      const nextIsAdmin = !!currentUser.is_superuser;

      // Armazenamos no sessionStorage (morre ao fechar a aba) e na memória da API
      sessionStorage.setItem('access_token', response.access_token);
      sessionStorage.setItem('is_auth', 'true');
      sessionStorage.setItem('is_admin', String(nextIsAdmin));
      localStorage.setItem('login_time', newLoginTime);

      setIsAuthenticated(true);
      setIsAdmin(nextIsAdmin);
      setLoginTime(newLoginTime);
    } catch (error) {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('is_auth');
      sessionStorage.removeItem('is_admin');
      localStorage.removeItem('login_time');
      setApiToken(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setLoginTime(null);
      throw error;
    }
  };

  const register = async (data: UserRegistrationData) => {
    try {
      await api.register(data);
    } catch (error) {
      throw error;
    }
  };

  const setActiveSessionInfo = useCallback((id: number | null, createdAt: string | null) => {
    if (id !== null && createdAt !== null) {
      setActiveSession({ id, createdAt });
    } else {
      setActiveSession(null);
    }
  }, []);

  const { showWarning, timeRemaining } = useAutoLogout({
    loginTime,
    isSessionActive: !!activeSession,
    logout,
    warningMinutes: 5,
  });

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, register, logout, setActiveSessionInfo }}>
      {showWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ff9800',
          color: 'white',
          textAlign: 'center',
          padding: '10px',
          zIndex: 9999,
          fontWeight: 'bold'
        }}>
          ⚠️ Atenção: Sua sessão irá expirar em {timeRemaining ? Math.ceil(timeRemaining / 60000) : 0} minuto(s).
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
