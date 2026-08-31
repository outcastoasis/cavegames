// frontend/src/components/ProtectedRoute.jsx

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authState";
import PageLoader from "./ui/PageLoader";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <PageLoader
        title="Authentifizierung wird geladen"
        message="Wir prüfen deine Sitzung."
      />
    );
  }

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
}
