import { useEffect, useMemo, useState } from "react";
import {
  isTestModeEnabled,
  setTestModeEnabled,
  TestModeContext,
} from "./testMode";

export function TestModeProvider({ children }) {
  const [testMode, setTestModeState] = useState(isTestModeEnabled);

  const setTestMode = (enabled) => {
    setTestModeEnabled(enabled);
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
