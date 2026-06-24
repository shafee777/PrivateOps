import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hasVaultPin, setHasVaultPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user session exists in local storage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      const hasPin = localStorage.getItem('hasVaultPin') === 'true';
      setHasVaultPin(hasPin);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { user: userData, accessToken, refreshToken, hasVaultPin: pinSet } = res.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('hasVaultPin', pinSet ? 'true' : 'false');
      
      setUser(userData);
      setHasVaultPin(pinSet);
      navigate('/');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please check credentials.' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      const { user: userData, accessToken, refreshToken, hasVaultPin: pinSet } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('hasVaultPin', pinSet ? 'true' : 'false');

      setUser(userData);
      setHasVaultPin(pinSet);
      navigate('/');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('vaultToken');
    setUser(null);
    setHasVaultPin(false);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasVaultPin, setHasVaultPin, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
