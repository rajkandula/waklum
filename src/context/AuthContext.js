"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername, password, redirectUrl = null) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      // Don't auto-redirect if a redirectUrl is provided (OAuth flow handles it)
      if (!redirectUrl) {
        router.push('/dashboard');
      }
      return { success: true };
    } else {
      const error = await res.json();
      return { success: false, error: error.error || 'Login failed' };
    }
  };

  const signup = async (name, email, username, password, inviteToken = null) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, password, inviteToken }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      // If user joined a project via invite, redirect there
      if (data.joinedProjectId) {
        router.push(`/dashboard/projects/${data.joinedProjectId}`);
      } else {
        router.push('/dashboard');
      }
      return { success: true };
    } else {
      const error = await res.json();
      return { success: false, error: error.error || 'Signup failed' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    // Return empty fallback during SSR/Turbopack anomalies if it happens,
    // though it ideally should be wrapped.
    return { login: async () => {}, signup: async () => {}, logout: async () => {}, refreshUser: async () => {}, user: null, loading: false };
  }
  return context;
};
