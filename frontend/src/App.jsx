// frontend/src/App.jsx

import AppRouter from "./router";
import { AuthProvider } from "./context/AuthContext";
import { TestModeProvider } from "./context/TestModeContext";

export default function App() {
  return (
    <AuthProvider>
      <TestModeProvider>
        <AppRouter />
      </TestModeProvider>
    </AuthProvider>
  );
}
