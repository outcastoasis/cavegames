import axios from "axios";
import { isTestModeEnabled } from "../context/TestModeContext";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // wichtig, damit Cookies / Tokens übertragen werden
});

// JWT-Token aus localStorage automatisch mitsenden
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (isTestModeEnabled()) {
    config.headers["X-Test-Mode"] = "true";
  }
  return config;
});

export default API;
