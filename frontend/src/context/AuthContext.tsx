import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { getToken, setToken, clearToken } from '../utils/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'kitchen' | 'admin';
  studentId?: string;
  avatar?: string;
  accountStatus?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, studentId?: string) => Promise<{ pending?: boolean; message?: string }>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setTokState]= useState<string | null>(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const t = getToken();
      if (t) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch {
          clearToken();
          setTokState(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setTokState(res.data.token);
    setUser(res.data.user);
  };

  const register = async (name: string, email: string, password: string, role = 'student', studentId?: string) => {
    const res = await api.post('/auth/register', { name, email, password, role, studentId });
    // If pending kitchen account — no token issued
    if (res.data.pending) {
      return { pending: true, message: res.data.message };
    }
    setToken(res.data.token);
    setTokState(res.data.token);
    setUser(res.data.user);
    return {};
  };

  const logout = () => {
    clearToken();
    setTokState(null);
    setUser(null);
  };

  const updateUser = (u: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...u } : null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
