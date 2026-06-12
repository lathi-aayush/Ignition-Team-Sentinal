import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "../api/client.js";
import { isTokenExpired, parseJwtPayload } from "../utils/jwt.js";
import { reconnectPera } from "../wallet/pera.js";
import { signLoginChallenge } from "../wallet/signLoginChallenge.js";
import { Buffer } from "buffer";


const AuthContext = createContext(null);

const STORAGE_KEY = "sentinal_token";

/** Always build the user object from the JWT so the shape is identical
 *  whether the user just logged in or refreshed the page. */
function userFromToken(token) {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload?.role) return null;
  return {
    id: payload.sub,
    walletAddress: payload.walletAddress || null,
    role: payload.role,
    displayName: payload.displayName || null,
    email: payload.email || null,
    photoURL: payload.photoURL || null,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(() => userFromToken(localStorage.getItem(STORAGE_KEY)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reconnectPera().catch((err) => console.warn("Pera auto-reconnect failed:", err));
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => clearSession();
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, [clearSession]);

  useEffect(() => {
    async function syncProfile() {
      if (token) {
        if (isTokenExpired(token)) {
          clearSession();
          setLoading(false);
          return;
        }
        setAuthToken(token);
        const derived = userFromToken(token);
        if (derived) {
          setUser(derived);
          try {
            const { data } = await api.get("/api/profile/summary");
            if (data?.profile) {
              setUser({
                id: data.profile.id,
                walletAddress: data.profile.walletAddress,
                role: data.profile.role,
                displayName: data.profile.displayName,
                email: data.profile.email,
                photoURL: data.profile.photoURL,
              });
            }
          } catch (err) {
            if (err?.response?.status === 401) {
              clearSession();
              setLoading(false);
              return;
            }
            console.warn("Failed to refetch latest profile data:", err.message);
          }
        } else {
          clearSession();
        }
      } else {
        setAuthToken(null);
        setUser(null);
      }
      setLoading(false);
    }
    syncProfile();
  }, [token, clearSession]);

  const persistSession = useCallback(async (incoming) => {
    const derived = userFromToken(incoming);
    if (!derived) throw new Error("Auth response contained an invalid token.");
    localStorage.setItem(STORAGE_KEY, incoming);
    setAuthToken(incoming);
    setToken(incoming);
    setUser(derived);
    return derived;
  }, []);

  const login = useCallback(async (walletAddress, role) => {
    // 1. Fetch challenge
    const challengeRes = await api.post("/api/auth/challenge", { walletAddress });
    const { nonce, message } = challengeRes.data;

    // 2. Sign challenge message using Pera Wallet
    const encodedMessage = new TextEncoder().encode(message);
    const signed = await signLoginChallenge(encodedMessage, walletAddress);
    const signatureBase64 = Buffer.from(signed[0]).toString("base64");

    // 3. Complete login with signature verification
    const { data } = await api.post("/api/auth/login", {
      walletAddress,
      nonce,
      signature: signatureBase64,
      role,
    });
    
    const user = await persistSession(data.token);
    return {
      user,
      isNewUser: Boolean(data.isNewUser),
      needsProfile: Boolean(data.needsProfile),
    };
  }, [persistSession]);

  const register = useCallback(async (walletAddress, role, displayName) => {
    // 1. Fetch challenge
    const challengeRes = await api.post("/api/auth/challenge", { walletAddress });
    const { nonce, message } = challengeRes.data;

    // 2. Sign challenge
    const encodedMessage = new TextEncoder().encode(message);
    const signed = await signLoginChallenge(encodedMessage, walletAddress);
    const signatureBase64 = Buffer.from(signed[0]).toString("base64");

    // 3. Complete registration with verified signature
    const { data } = await api.post("/api/auth/register", {
      walletAddress,
      nonce,
      signature: signatureBase64,
      role,
      displayName,
    });
    
    return persistSession(data.token);
  }, [persistSession]);

  const linkWallet = useCallback(async (walletAddress) => {
    // 1. Fetch challenge
    const challengeRes = await api.post("/api/auth/challenge", { walletAddress });
    const { nonce, message } = challengeRes.data;

    // 2. Sign challenge
    const encodedMessage = new TextEncoder().encode(message);
    const signed = await signLoginChallenge(encodedMessage, walletAddress);
    const signatureBase64 = Buffer.from(signed[0]).toString("base64");

    // 3. Complete link-wallet with verified signature
    const { data } = await api.post("/api/auth/link-wallet", {
      walletAddress,
      nonce,
      signature: signatureBase64,
    });
    
    return persistSession(data.token);
  }, [persistSession]);


  const updateProfile = useCallback(async (displayName) => {
    const { data } = await api.put("/api/profile", { displayName });
    return persistSession(data.token);
  }, [persistSession]);

  const becomeCreator = useCallback(async () => {
    const { data } = await api.post("/api/auth/become-creator");
    if (!data?.token) throw new Error("No token returned");
    return persistSession(data.token);
  }, [persistSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      linkWallet,
      updateProfile,
      becomeCreator,
      logout,
      isAuthenticated: Boolean(token && user),
    }),
    [token, user, loading, login, register, linkWallet, updateProfile, becomeCreator, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
