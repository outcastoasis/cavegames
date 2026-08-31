import { useEffect, useState } from "react";
import { AuthContext } from "./authState";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_SESSION_UPDATED_EVENT,
  bootstrapLegacySession,
  clearLegacyAuthStorage,
  endSession,
  refreshSession,
  setAccessToken,
} from "../services/authSession";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const handleUpdated = (event) => {
      if (!active) return;
      setToken(event.detail.token);
      setUser(event.detail.user);
    };
    const handleExpired = () => {
      if (!active) return;
      setToken("");
      setUser(null);
    };
    window.addEventListener(AUTH_SESSION_UPDATED_EVENT, handleUpdated);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);

    const restore = async () => {
      try {
        await refreshSession();
      } catch {
        const legacyToken = localStorage.getItem("token");
        if (legacyToken) {
          try {
            await bootstrapLegacySession(legacyToken);
          } catch {
            clearLegacyAuthStorage();
            setAccessToken("");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();

    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_UPDATED_EVENT, handleUpdated);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  // Login
  const login = (userData, tokenData) => {
    clearLegacyAuthStorage();
    setAccessToken(tokenData);
    setToken(tokenData);
    setUser(userData);
  };

  // Logout
  const logout = () => {
    void endSession();
    clearLegacyAuthStorage();
    setAccessToken("");
    setToken("");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, token, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

