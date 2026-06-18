import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "testModeEnabled";
const TestModeContext = createContext();

export function isTestModeEnabled() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function TestModeProvider({ children }) {
  const [testMode, setTestModeState] = useState(isTestModeEnabled);

  const setTestMode = (enabled) => {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    setTestModeState(enabled);
  };

  useEffect(() => {
    const handleStorage = () => setTestModeState(isTestModeEnabled());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({ testMode, setTestMode }),
    [testMode]
  );

  return (
    <TestModeContext.Provider value={value}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() {
  return useContext(TestModeContext);
}
