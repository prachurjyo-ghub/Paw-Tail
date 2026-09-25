"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest } from "@/lib/api";

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    fullName: user.name || user.fullName || "Pet Parent",
    username:
      user.username ||
      user.email?.split("@")[0] ||
      "petparent",
    joinedAt: user.createdAt || user.joinedAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest("/users/me");
      const nextUser = normalizeUser(data.user);
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refreshUser);
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const data = await apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const nextUser = normalizeUser(data.user);
    setUser(nextUser);
    return { ok: true, user: nextUser };
  }, []);

  const signup = useCallback(async ({ name, email, phone, password }) => {
    return apiRequest("/users/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, password }),
    });
  }, []);

  const verifyEmail = useCallback(async ({ email, code }) => {
    const data = await apiRequest("/users/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    const nextUser = normalizeUser(data.user);
    setUser(nextUser);
    return { ok: true, user: nextUser };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/users/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, signup, verifyEmail, logout, loaded, refreshUser }),
    [user, login, signup, verifyEmail, logout, loaded, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
