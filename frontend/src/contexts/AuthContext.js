import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [allowedOPDs, setAllowedOPDs] = useState(() => {
    const stored = localStorage.getItem('allowed_opds');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    if (token) {
      // apiClient attaches Authorization header via interceptor
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Logging in...');
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });
      
      const { access_token, user: userData, allowed_opds } = response.data;
      
      // Store token
      setToken(access_token);
      localStorage.setItem('token', access_token);
      
      // Store user data
      setUser(userData);
      
      // Store allowed OPDs
      const opds = allowed_opds || [];
      setAllowedOPDs(opds);
      localStorage.setItem('allowed_opds', JSON.stringify(opds));
      
      console.log('Login successful. User:', userData);
      console.log('Allowed OPDs:', opds);
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAllowedOPDs([]);
    localStorage.removeItem('token');
    localStorage.removeItem('allowed_opds');
  };

  const hasRole = (requiredRoles) => {
    if (!user) return false;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  };

  const hasOPDAccess = (opdCode) => {
    if (!user) return false;
    
    // Admin has access to all OPDs
    if (user.role === 'admin') return true;
    
    // Check if OPD is in allowed list
    return allowedOPDs.includes(opdCode);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    hasRole,
    hasOPDAccess,
    allowedOPDs,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

