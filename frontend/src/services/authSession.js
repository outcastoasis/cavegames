const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

export const AUTH_SESSION_UPDATED_EVENT = "cavegames:auth-session-updated";
export const AUTH_SESSION_EXPIRED_EVENT = "cavegames:auth-session-expired";

let accessToken = "";
let refreshPromise = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token = "") {
  accessToken = token;
}

export function clearLegacyAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "Sitzung konnte nicht erneuert werden");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function notifySessionUpdated(auth) {
  setAccessToken(auth.token);
  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_UPDATED_EVENT, { detail: auth }),
  );
}

export function notifySessionExpired() {
  setAccessToken("");
  clearLegacyAuthStorage();
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authRequest("refresh")
      .then((auth) => {
        notifySessionUpdated(auth);
        return auth;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function bootstrapLegacySession(token) {
  const auth = await authRequest("session", {
    headers: { Authorization: `Bearer ${token}` },
  });
  clearLegacyAuthStorage();
  notifySessionUpdated(auth);
  return auth;
}

export async function endSession() {
  try {
    await authRequest("logout", { keepalive: true });
  } catch {
    // Local logout must always succeed. The short-lived access token still
    // limits a failed server-side revocation to a few minutes.
  } finally {
    notifySessionExpired();
  }
}
