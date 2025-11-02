import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useOutletContext } from "react-router-dom";
import API from "../services/api";
import "../styles/pages/AdminUsers.css";
import UserCreateModal from "../components/forms/UserCreateModal";
import UserEditModal from "../components/forms/UserEditModal";

import { UserPlus, Pencil, Trash2, RotateCcw, Users } from "lucide-react";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setTitle } = useOutletContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    setTitle("Benutzerverwaltung");
  }, [setTitle]);

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

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleEdit = (userId) => {
    console.log("Bearbeiten:", userId);
    // TODO: Editier-Modal öffnen
  };

  const handleDeactivate = async (userId) => {
    try {
      await API.delete(`/users/${userId}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, active: false } : u))
      );
    } catch (err) {
      console.error("Fehler beim Deaktivieren:", err);
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await API.patch(`/users/${userId}`, { active: true });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, active: true } : u))
      );
    } catch (err) {
      console.error("Fehler beim Reaktivieren:", err);
    }
  };

  return (
    <div className="admin-users-page">
      <div className="user-header-row">
        <div className="title-with-icon">
          <Users size={20} />
          <span>Benutzer</span>
        </div>

        <button
          className="button new-user-button"
          onClick={() => setShowCreateModal(true)}
        >
          <UserPlus size={18} />
          <span>Neuer Benutzer</span>
        </button>
      </div>

      {loading ? (
        <p>Lade Benutzer...</p>
      ) : users.length === 0 ? (
        <p>Keine Benutzer gefunden.</p>
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div key={user._id} className="card user-card">
              <div className="user-main">
                <div className="user-info">
                  <strong>{user.displayName}</strong>
                  <div className="username">({user.username})</div>
                </div>
                <div className="user-tags">
                  <span className={`role-tag ${user.role}`}>{user.role}</span>
                  {!user.active && (
                    <span className="inactive-tag">deaktiviert</span>
                  )}
                </div>
              </div>

              <div className="user-actions">
                <button
                  className="icon-button"
                  onClick={() => setEditUser(user)}
                  title="Bearbeiten"
                >
                  <Pencil size={18} />
                </button>

                {user.active ? (
                  <button
                    className="icon-button"
                    onClick={() => handleDeactivate(user._id)}
                    title="Deaktivieren"
                  >
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <button
                    className="icon-button"
                    onClick={() => handleReactivate(user._id)}
                    title="Reaktivieren"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            setLoading(true);
            API.get("/users")
              .then((res) => setUsers(res.data))
              .catch((err) => console.error(err))
              .finally(() => setLoading(false));
          }}
        />
      )}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setLoading(true);
            API.get("/users")
              .then((res) => setUsers(res.data))
              .catch((err) => console.error(err))
              .finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}
