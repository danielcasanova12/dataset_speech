import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, UserRegistrationData } from '../services/api';

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
  const [activeSession, setActiveSession] = useState<{id: number, createdAt: string} | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('login_time');
    setToken(null);
    setActiveSession(null);
  };

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const loginTimeString = localStorage.getItem('login_time');
      if (!loginTimeString) return;

      const loginTime = new Date(loginTimeString).getTime();
      const currentTime = new Date().getTime();

      const fourHoursMs = 4 * 60 * 60 * 1000;
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (currentTime - loginTime >= fourHoursMs) {
        if (!activeSession) {
          logout();
        } else {
          const sessionStartTime = new Date(activeSession.createdAt).getTime();
          if (currentTime - sessionStartTime >= twoHoursMs) {
            logout();
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [token, activeSession]);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.login(username, password);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('login_time', new Date().toISOString());
      setToken(response.access_token);
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

      // Regra adicional: se a sessão finalizar e o token já tiver +4 horas, logout imediato.
      const loginTimeString = localStorage.getItem('login_time');
      if (loginTimeString) {
         const loginTime = new Date(loginTimeString).getTime();
         const currentTime = new Date().getTime();
         if (currentTime - loginTime >= 4 * 60 * 60 * 1000) {
            logout();
         }
      }
    }
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, register, logout, setActiveSessionInfo }}>
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
