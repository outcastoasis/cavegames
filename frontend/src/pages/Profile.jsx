import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/pages/Profile.css";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="profile-page">
      <h2 className="profile-title">
        Hallo {user?.displayName || user?.username}
      </h2>
      <div className="profile-card">
        <p className="profile-info">
          <strong>Benutzername:</strong> {user?.username}
        </p>
        <p className="profile-info">
          <strong>Rolle:</strong> {user?.role}
        </p>
        <button className="button danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
