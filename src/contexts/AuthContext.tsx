import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, UserRegistrationData } from '../services/api';
import { useAutoLogout } from '../hooks/useAutoLogout';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: UserRegistrationData) => Promise<void>;
  logout: () => void;
  setActiveSessionInfo: (id: number | null, createdAt: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loginTime, setLoginTime] = useState<string | null>(localStorage.getItem('login_time'));
  const [activeSession, setActiveSession] = useState<{id: number, createdAt: string} | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedLoginTime = localStorage.getItem('login_time');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedLoginTime) {
      setLoginTime(storedLoginTime);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('login_time');
    setToken(null);
    setLoginTime(null);
    setActiveSession(null);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      const newLoginTime = new Date().toISOString();
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('login_time', newLoginTime);
      setToken(response.access_token);
      setLoginTime(newLoginTime);
    } catch (error) {
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

  const setActiveSessionInfo = (id: number | null, createdAt: string | null) => {
    if (id !== null && createdAt !== null) {
      setActiveSession({ id, createdAt });
    } else {
      setActiveSession(null);
      // Extra logic handled by useAutoLogout since isSessionActive changes to false.
    }
  };

  const isAuthenticated = !!token;

  // Utilize our custom hook
  const { showWarning, timeRemaining } = useAutoLogout({
    loginTime,
    isSessionActive: !!activeSession,
    logout,
    warningMinutes: 5,
  });

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, register, logout, setActiveSessionInfo }}>
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
