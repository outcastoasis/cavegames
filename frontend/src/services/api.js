import axios from "axios";
import { isTestModeEnabled } from "../context/testMode";
import {
  getAccessToken,
  notifySessionExpired,
  refreshSession,
} from "./authSession";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // wichtig, damit Cookies / Tokens übertragen werden
});

// Das kurzlebige Zugriffstoken bleibt ausschliesslich im Arbeitsspeicher.
API.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (isTestModeEnabled()) {
    config.headers["X-Test-Mode"] = "true";
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const auth = await refreshSession();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${auth.token}`;
        return API(originalRequest);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError?.status)) {
          notifySessionExpired();
        }
      }
    }

    return Promise.reject(error);
  },
);

export default API;
