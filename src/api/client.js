import axios from "axios";

// Base URL configurable por entorno (nunca hardcodeada) — ver .env.example
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // evita que un servicio caído cuelgue la UI indefinidamente
  headers: { "Content-Type": "application/json" },
});

// --- Token en memoria + sessionStorage ---
// Se evita localStorage (persiste indefinidamente entre pestañas/sesiones y
// amplía la ventana de exposición ante un XSS). sessionStorage se limpia al
// cerrar la pestaña. La mitigación real de XSS para no exponer el token al
// JS del cliente sería una cookie HttpOnly seteada por el Gateway, pero eso
// requiere un cambio de contrato en el backend que excede el alcance de
// esta entrega — queda documentado como mejora recomendada en el README.
const TOKEN_KEY = "uchfyd_token";
let memoryToken = null;

export function setToken(token) {
  memoryToken = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage puede fallar (modo privado); el token sigue vivo en memoria
  }
}

export function getToken() {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

// Adjunta el JWT a cada request saliente
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Reintento acotado ante 503 (pool de hilos saturado) ---
// No se reintenta nunca sobre POST /pedidos sin control, para no duplicar
// una orden: solo se reintenta una vez, con backoff corto, y únicamente
// cuando el propio backend indica saturación transitoria (503).
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 503 && !config._retried) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 900));
      return client(config);
    }
    if (response?.status === 401) {
      // token vencido / inválido: se limpia para forzar un nuevo login
      setToken(null);
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default client;
export { API_BASE_URL };
