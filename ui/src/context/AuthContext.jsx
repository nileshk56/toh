import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

const getInitialAuth = () => {
  const stored = localStorage.getItem("toh_auth");
  return stored
    ? JSON.parse(stored)
    : { isAuthenticated: false, user: null, token: null };
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(getInitialAuth);

  const login = ({ user, token }) => {
    const next = { isAuthenticated: true, user, token };
    setAuth(next);
    localStorage.setItem("toh_auth", JSON.stringify(next));
  };

  const logout = () => {
    const next = { isAuthenticated: false, user: null, token: null };
    setAuth(next);
    localStorage.setItem("toh_auth", JSON.stringify(next));
  };

  const value = useMemo(() => ({ auth, login, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
