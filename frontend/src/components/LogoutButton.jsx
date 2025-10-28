// frontend/src/components/LogoutButton.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Token + User entfernen
    navigate("/login"); // Weiterleitung
  };

  return (
    <button
      onClick={handleLogout}
      style={{ position: "absolute", top: 10, right: 10 }}
    >
      Logout
    </button>
  );
}
