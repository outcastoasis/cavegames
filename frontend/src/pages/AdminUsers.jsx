import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import {
  ImageOff,
  KeyRound,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/pages/AdminUsers.css";
import UserCreateModal from "../components/forms/UserCreateModal";
import UserEditModal from "../components/forms/UserEditModal";
import Toast from "../components/ui/Toast";
import defaultAvatar from "../assets/images/avatar.jpg";

export default function AdminUsers() {
  const { user } = useAuth();
  const { setTitle } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [testFilter, setTestFilter] = useState("all");
  const [sortBy, setSortBy] = useState("displayName");

  useEffect(() => {
    setTitle("Benutzerverwaltung");
  }, [setTitle]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Benutzer:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleDeleteUser = async (targetUser) => {
    if (targetUser._id === user._id) {
      setToastMsg("Du kannst dich nicht selbst löschen");
      return;
    }

    const ok = window.confirm(
      `Konto "${targetUser.displayName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
    );
    if (!ok) return;

    try {
      await API.delete(`/users/${targetUser._id}`);
      setUsers((prev) => prev.filter((item) => item._id !== targetUser._id));
      setToastMsg("Benutzer gelöscht");
    } catch (err) {
      setToastMsg(
        err.response?.data?.error || "Benutzer konnte nicht gelöscht werden",
      );
    }
  };

  const handlePasswordReset = async (targetUser) => {
    const password = window.prompt(
      `Neues Passwort für ${targetUser.displayName} eingeben`,
    );
    if (!password) return;

    try {
      await API.patch(`/users/${targetUser._id}`, { password });
      setToastMsg("Passwort aktualisiert");
    } catch (err) {
      setToastMsg(
        err.response?.data?.error ||
          "Passwort konnte nicht aktualisiert werden",
      );
    }
  };

  const handleRemoveAvatar = async (targetUser) => {
    if (
      !window.confirm(`Profilbild von ${targetUser.displayName} entfernen?`)
    ) {
      return;
    }

    try {
      await API.delete(`/users/${targetUser._id}/avatar`);
      setToastMsg("Profilbild entfernt");
      await fetchUsers();
    } catch (err) {
      setToastMsg(
        err.response?.data?.error || "Profilbild konnte nicht entfernt werden",
      );
    }
  };

  const visibleUsers = users
    .filter((item) =>
      `${item.displayName} ${item.username}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter((item) => {
      if (statusFilter === "active") return item.active !== false;
      if (statusFilter === "inactive") return item.active === false;
      return true;
    })
    .filter((item) => (roleFilter === "all" ? true : item.role === roleFilter))
    .filter((item) => {
      if (testFilter === "test") return item.isTestData === true;
      if (testFilter === "live") return item.isTestData !== true;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "role")
        return String(a.role).localeCompare(String(b.role));
      if (sortBy === "status") {
        return Number(b.active !== false) - Number(a.active !== false);
      }
      return String(a.displayName).localeCompare(String(b.displayName));
    });

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

      <input
        type="text"
        className="input user-search"
        placeholder="Benutzer suchen..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="user-filter-row">
        <select
          className="input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Deaktiviert</option>
        </select>
        <select
          className="input"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="all">Alle Rollen</option>
          <option value="admin">Admin</option>
          <option value="spieler">Spieler</option>
        </select>
        <select
          className="input"
          value={testFilter}
          onChange={(event) => setTestFilter(event.target.value)}
        >
          <option value="all">Live & Test</option>
          <option value="live">Nur Live</option>
          <option value="test">Nur Test</option>
        </select>
        <select
          className="input"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="displayName">Sortieren: Name</option>
          <option value="role">Sortieren: Rolle</option>
          <option value="status">Sortieren: Status</option>
        </select>
      </div>

      {loading ? (
        <p>Lade Benutzer...</p>
      ) : visibleUsers.length === 0 ? (
        <p>Keine Benutzer gefunden.</p>
      ) : (
        <div className="user-list">
          {visibleUsers.map((userItem) => (
            <div key={userItem._id} className="card user-card">
              <div className="user-card-content">
                <img
                  className="user-avatar"
                  src={userItem.profileImageUrl || defaultAvatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.src = defaultAvatar;
                  }}
                />

                <div className="user-main">
                  <div className="user-info">
                    <strong>{userItem.displayName}</strong>
                    <div className="username">({userItem.username})</div>
                  </div>
                  <div className="user-tags">
                    <span className={`role-tag ${userItem.role}`}>
                      {userItem.role}
                    </span>
                    <span
                      className={`status-tag ${
                        userItem.active === false ? "inactive" : "active"
                      }`}
                    >
                      {userItem.active === false ? "Deaktiviert" : "Aktiv"}
                    </span>
                    {userItem.isTestData && (
                      <span className="data-tag test">Test</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="user-actions">
                <button
                  className="button neutral small user-action-button"
                  onClick={() => setEditUser(userItem)}
                  title="Bearbeiten"
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="button neutral small user-action-button"
                  onClick={() => handlePasswordReset(userItem)}
                  title="Passwort zuruecksetzen"
                >
                  <KeyRound size={18} />
                </button>
                <button
                  className="button neutral small user-action-button"
                  onClick={() => handleRemoveAvatar(userItem)}
                  title="Profilbild entfernen"
                  disabled={!userItem.profileImageUrl}
                >
                  <ImageOff size={18} />
                </button>

                <button
                  className="button danger small user-action-button user-action-button-danger"
                  onClick={() => handleDeleteUser(userItem)}
                  disabled={userItem._id === user._id}
                  title="Konto löschen"
                >
                  <Trash2 size={18} />
                </button>
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
            fetchUsers();
          }}
        />
      )}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            fetchUsers();
          }}
        />
      )}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
    </div>
  );
}
