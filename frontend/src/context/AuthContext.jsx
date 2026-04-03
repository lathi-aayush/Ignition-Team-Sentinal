import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "../api/client.js";
import { parseJwtPayload } from "../utils/jwt.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "sentinal_token";

/** Always build the user object from the JWT so the shape is identical
 *  whether the user just logged in or refreshed the page. */
function userFromToken(token) {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload?.walletAddress || !payload?.role) return null;
  return {
    id: payload.sub,
    walletAddress: payload.walletAddress,
    role: payload.role,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(() => userFromToken(localStorage.getItem(STORAGE_KEY)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      const derived = userFromToken(token);
      if (derived) {
        setUser(derived);
      } else {
        // Token exists but is malformed / missing required fields – force logout
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        setAuthToken(null);
      }
    } else {
      setAuthToken(null);
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (walletAddress, role) => {
    const { data } = await api.post("/api/auth/login", { walletAddress, role });
    const incoming = data.token;
    // Derive user from the JWT – never trust data.user shape from backend
    const derived = userFromToken(incoming);
    if (!derived) throw new Error("Login response contained an invalid token.");
    localStorage.setItem(STORAGE_KEY, incoming);
    setAuthToken(incoming);
    setToken(incoming);
    setUser(derived);
    return derived;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [token, user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}