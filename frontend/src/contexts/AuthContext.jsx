import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set the token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch user data
      axios.get(`${API_URL}/api/auth/me`)
        .then(response => {
          setUser(response.data.user);
        })
        .catch(error => {
          console.error('Auth check error:', error);
          // If token is invalid, clear it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setError(error.response?.data?.message || 'Authentication failed');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      // Set the token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      // Set the token in axios defaults
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return user;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Remove the token from axios defaults
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, profileData);
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Profile update failed');
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 