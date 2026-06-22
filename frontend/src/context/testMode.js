import { createContext, useContext } from "react";

const STORAGE_KEY = "testModeEnabled";

export const TestModeContext = createContext();

export function isTestModeEnabled() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setTestModeEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

export function useTestMode() {
  return useContext(TestModeContext);
}
