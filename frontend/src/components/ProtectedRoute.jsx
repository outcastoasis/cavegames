// frontend/src/components/ProtectedRoute.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLoader from "./ui/PageLoader";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <PageLoader
        title="Authentifizierung wird geladen"
        message="Wir prüfen deine Sitzung."
      />
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
