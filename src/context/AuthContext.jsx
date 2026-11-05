import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import client, { decodeToken, getToken, isTokenExpired, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    const t = getToken();
    return t && !isTokenExpired(t) ? t : null;
  });

  const usuario = useMemo(() => (token ? decodeToken(token) : null), [token]);

  // Logout automático cuando el JWT vence (sin esperar a que falle un request)
  useEffect(() => {
    if (!token) return;
    const payload = decodeToken(token);
    if (!payload?.exp) return;
    const msHastaVencer = payload.exp * 1000 - Date.now();
    if (msHastaVencer <= 0) {
      logout();
      return;
    }
    const timer = setTimeout(() => logout(), msHastaVencer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    setToken(data.token);
    setTokenState(data.token);
    return data;
  }, []);

  const registrar = useCallback(async (email, password) => {
    const { data } = await client.post("/auth/registro", { email, password });
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
  }, []);

  // El interceptor de axios dispara este evento ante un 401 (token vencido
  // o rechazado por el Gateway) para que el estado de React quede en sync.
  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      token,
      usuario, // { sub, email, iat, exp }
      isAuthenticated: Boolean(token),
      login,
      registrar,
      logout,
    }),
    [token, usuario, login, registrar, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
