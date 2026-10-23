import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // In-memory token storage (also saved to sessionStorage for cross-tab persistence fallback)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('mockinterview_auth_token');
    } catch {
      return null;
    }
  });

  const saveToken = (token: string | null) => {
    setAuthToken(token);
    try {
      if (token) {
        sessionStorage.setItem('mockinterview_auth_token', token);
      } else {
        sessionStorage.removeItem('mockinterview_auth_token');
      }
    } catch {
      // ignore storage access issues
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include', // Include HttpOnly cookies
      });

      if (res.ok) {
        const userData: User = await res.json();
        setUser(userData);
      } else {
        setUser(null);
        if (res.status === 401) {
          saveToken(null);
        }
      }
    } catch (err) {
      console.warn('Authentication check failed:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.detail || 'Invalid email or password. Please try again.',
        };
      }

      setUser(data.user);
      const token = data.session_token || data.access_token;
      if (token) {
        saveToken(token);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to connect to authentication server.',
      };
    }
  };

  const signup = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        let msg = 'Account registration failed. Please review your input.';
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          msg = data.detail[0].msg || msg;
        }
        return {
          success: false,
          error: msg,
        };
      }

      setUser(data.user);
      const token = data.session_token || data.access_token;
      if (token) {
        saveToken(token);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to connect to registration server.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout API notification failed:', err);
    } finally {
      setUser(null);
      saveToken(null);
    }
  };

  const updateProfile = async (data: {
    full_name?: string;
    target_role?: string;
    experience_level?: string;
    preferences?: import('../types/auth').UserPreferences;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        let msg = 'Failed to update profile.';
        if (typeof resData.detail === 'string') {
          msg = resData.detail;
        } else if (Array.isArray(resData.detail) && resData.detail.length > 0) {
          msg = resData.detail[0].msg || msg;
        }
        return { success: false, error: msg };
      }

      setUser(resData);
      if (resData.preferences) {
        try {
          localStorage.setItem('mockinterview_preferences', JSON.stringify(resData.preferences));
        } catch {}
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to connect to profile server.',
      };
    }
  };

  const changePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) {
        let msg = 'Failed to change password.';
        if (typeof resData.detail === 'string') {
          msg = resData.detail;
        } else if (Array.isArray(resData.detail) && resData.detail.length > 0) {
          msg = resData.detail[0].msg || msg;
        }
        return { success: false, error: msg };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to connect to server.',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
