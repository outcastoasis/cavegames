// frontend/src/pages/AdminUsers.jsx

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/AdminUsers.css";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await API.get("/users");
        setUsers(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der Benutzer:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return (
    <div className="admin-users-page">
      <h2>👥 Benutzerverwaltung</h2>

      {loading ? (
        <p>Lade Benutzer...</p>
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div key={user._id} className="user-card">
              <div className="user-info">
                <strong>{user.displayName}</strong> ({user.username})
              </div>
              <div className="user-meta">
                Rolle: <span className="role-tag">{user.role}</span>
                {user.active === false && (
                  <span className="inactive-tag">deaktiviert</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
