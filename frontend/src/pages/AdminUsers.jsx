import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import {
  ChevronDown,
  ImageOff,
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import defaultAvatar from "../assets/images/avatar.jpg";
import UserCreateModal from "../components/forms/UserCreateModal";
import UserEditModal from "../components/forms/UserEditModal";
import UserPasswordResetDialog from "../components/forms/UserPasswordResetDialog";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { SkeletonBlock } from "../components/ui/Skeleton";
import StatusBadge from "../components/ui/StatusBadge";
import Toast from "../components/ui/Toast";
import { useAuth } from "../context/authState";
import API from "../services/api";
import "../styles/pages/AdminUsers.css";

const initialFilters = {
  status: "all",
  role: "all",
  data: "all",
  sort: "displayName",
};

export default function AdminUsers() {
  const { user, setUser } = useAuth();
  const { setTitle } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setTitle("Benutzerverwaltung");
  }, [setTitle]);

  const fetchUsers = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");

    try {
      const response = await API.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Fehler beim Laden der Benutzer:", error);
      setLoadError("Die Benutzer konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const visibleUsers = useMemo(
    () =>
      users
        .filter((item) =>
          `${item.displayName} ${item.username}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .filter((item) => {
          if (filters.status === "active") return item.active !== false;
          if (filters.status === "inactive") return item.active === false;
          return true;
        })
        .filter((item) =>
          filters.role === "all" ? true : item.role === filters.role,
        )
        .filter((item) => {
          if (filters.data === "test") return item.isTestData === true;
          if (filters.data === "live") return item.isTestData !== true;
          return true;
        })
        .sort((first, second) => {
          if (filters.sort === "role")
            return String(first.role).localeCompare(String(second.role));
          if (filters.sort === "status") {
            return (
              Number(second.active !== false) - Number(first.active !== false)
            );
          }
          return String(first.displayName).localeCompare(
            String(second.displayName),
            "de-CH",
          );
        }),
    [filters, search, users],
  );

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== initialFilters[key],
  ).length;

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction || actionBusy) return;
    const { type, targetUser } = confirmAction;

    setActionBusy(true);
    try {
      if (type === "delete") {
        await API.delete(`/users/${targetUser._id}`);
        setUsers((current) =>
          current.filter((item) => item._id !== targetUser._id),
        );
        setToastMessage("Benutzer gelöscht");
      } else {
        await API.delete(`/users/${targetUser._id}/avatar`);
        setUsers((current) =>
          current.map((item) =>
            item._id === targetUser._id
              ? { ...item, profileImageUrl: null }
              : item,
          ),
        );

        if (targetUser._id === user._id) {
          setUser((current) => ({ ...current, profileImageUrl: null }));
        }
        setToastMessage("Profilbild entfernt");
      }
      setConfirmAction(null);
    } catch (error) {
      setToastMessage(
        error.response?.data?.error ||
          (type === "delete"
            ? "Benutzer konnte nicht gelöscht werden"
            : "Profilbild konnte nicht entfernt werden"),
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="page-shell admin-users-page">
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}

      <div className="admin-users-toolbar">
        <div className="admin-users-count">
          <Users size={19} aria-hidden="true" />
          <span>{visibleUsers.length} Benutzer</span>
        </div>
        <Button
          leadingIcon={<UserPlus size={18} />}
          onClick={() => setShowCreateModal(true)}
          size="sm"
        >
          Neuer Benutzer
        </Button>
      </div>

      <Card as="section" className="admin-users-controls" padding="md">
        <label className="admin-users-search">
          <span className="admin-users-visually-hidden">Benutzer suchen</span>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Name oder Benutzername"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <Button
          aria-expanded={filtersOpen}
          className="admin-users-filter-trigger"
          leadingIcon={<SlidersHorizontal size={18} />}
          onClick={() => setFiltersOpen((open) => !open)}
          size="sm"
          trailingIcon={
            <ChevronDown
              className={filtersOpen ? "is-open" : ""}
              size={17}
            />
          }
          variant="secondary"
        >
          Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </Button>

        {filtersOpen && (
          <div className="admin-users-filter-grid">
            <FilterField
              label="Status"
              onChange={(value) => updateFilter("status", value)}
              options={[
                ["all", "Alle"],
                ["active", "Aktiv"],
                ["inactive", "Deaktiviert"],
              ]}
              value={filters.status}
            />
            <FilterField
              label="Rolle"
              onChange={(value) => updateFilter("role", value)}
              options={[
                ["all", "Alle"],
                ["admin", "Admin"],
                ["spieler", "Spieler"],
              ]}
              value={filters.role}
            />
            <FilterField
              label="Daten"
              onChange={(value) => updateFilter("data", value)}
              options={[
                ["all", "Live & Test"],
                ["live", "Nur Live"],
                ["test", "Nur Test"],
              ]}
              value={filters.data}
            />
            <FilterField
              label="Sortierung"
              onChange={(value) => updateFilter("sort", value)}
              options={[
                ["displayName", "Name"],
                ["role", "Rolle"],
                ["status", "Status"],
              ]}
              value={filters.sort}
            />
            {activeFilterCount > 0 && (
              <Button
                className="admin-users-filter-reset"
                onClick={() => setFilters(initialFilters)}
                size="sm"
                variant="ghost"
              >
                Zurücksetzen
              </Button>
            )}
          </div>
        )}
      </Card>

      {loading ? (
        <UserListSkeleton />
      ) : loadError ? (
        <Card className="admin-users-state" variant="muted">
          <RefreshCw size={23} aria-hidden="true" />
          <h2>Laden fehlgeschlagen</h2>
          <p>{loadError}</p>
          <Button
            leadingIcon={<RefreshCw size={17} />}
            onClick={() => fetchUsers({ showLoader: true })}
            size="sm"
            variant="secondary"
          >
            Erneut laden
          </Button>
        </Card>
      ) : visibleUsers.length === 0 ? (
        <Card className="admin-users-state" variant="muted">
          <Users size={23} aria-hidden="true" />
          <h2>Keine Benutzer gefunden</h2>
          <p>Suche oder Filter anpassen.</p>
        </Card>
      ) : (
        <div className="admin-users-list">
          {visibleUsers.map((userItem) => (
            <Card as="article" className="admin-user-card" key={userItem._id} padding="md">
              <div className="admin-user-card__identity">
                <img
                  className="admin-user-card__avatar"
                  src={userItem.profileImageUrl || defaultAvatar}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.src = defaultAvatar;
                  }}
                />
                <div className="admin-user-card__copy">
                  <strong>{userItem.displayName}</strong>
                  <span>@{userItem.username}</span>
                </div>
              </div>

              <div className="admin-user-card__badges">
                <StatusBadge
                  label={userItem.role === "admin" ? "Admin" : "Spieler"}
                  tone={userItem.role === "admin" ? "primary" : "neutral"}
                />
                <StatusBadge
                  label={userItem.active === false ? "Deaktiviert" : "Aktiv"}
                  tone={userItem.active === false ? "neutral" : "success"}
                />
                {userItem.isTestData && (
                  <StatusBadge label="Test" tone="warning" />
                )}
              </div>

              <div className="admin-user-card__actions">
                <Button
                  aria-label={`${userItem.displayName} bearbeiten`}
                  iconOnly
                  onClick={() => setEditUser(userItem)}
                  size="sm"
                  title="Bearbeiten"
                  variant="secondary"
                >
                  <Pencil size={18} />
                </Button>
                <Button
                  aria-label={`Passwort von ${userItem.displayName} ändern`}
                  iconOnly
                  onClick={() => setPasswordUser(userItem)}
                  size="sm"
                  title="Passwort ändern"
                  variant="secondary"
                >
                  <KeyRound size={18} />
                </Button>
                <Button
                  aria-label={`Profilbild von ${userItem.displayName} entfernen`}
                  disabled={!userItem.profileImageUrl}
                  iconOnly
                  onClick={() =>
                    setConfirmAction({ type: "avatar", targetUser: userItem })
                  }
                  size="sm"
                  title="Profilbild entfernen"
                  variant="secondary"
                >
                  <ImageOff size={18} />
                </Button>
                <Button
                  aria-label={`${userItem.displayName} löschen`}
                  disabled={userItem._id === user._id}
                  iconOnly
                  onClick={() =>
                    setConfirmAction({ type: "delete", targetUser: userItem })
                  }
                  size="sm"
                  title="Konto löschen"
                  variant="danger-ghost"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      )}
      {editUser && (
        <UserEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={fetchUsers}
        />
      )}
      {passwordUser && (
        <UserPasswordResetDialog
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSuccess={(message) => {
            setPasswordUser(null);
            setToastMessage(message);
          }}
        />
      )}

      <ConfirmDialog
        busy={actionBusy}
        busyLabel={
          confirmAction?.type === "delete" ? "Wird gelöscht …" : "Wird entfernt …"
        }
        confirmLabel={confirmAction?.type === "delete" ? "Löschen" : "Entfernen"}
        danger={confirmAction?.type === "delete"}
        icon={confirmAction?.type === "avatar" ? <ImageOff size={23} /> : null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmedAction}
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Benutzer löschen?"
            : "Profilbild entfernen?"
        }
      >
        <p>
          {confirmAction?.type === "delete"
            ? `Das Konto von ${confirmAction.targetUser.displayName} wird dauerhaft gelöscht.`
            : `Das Profilbild von ${confirmAction?.targetUser.displayName || "diesem Benutzer"} wird entfernt.`}
        </p>
      </ConfirmDialog>
    </div>
  );
}

function FilterField({ label, onChange, options, value }) {
  return (
    <label className="admin-users-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserListSkeleton() {
  return (
    <div className="admin-users-list" aria-label="Benutzer werden geladen">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card className="admin-user-skeleton" key={index} padding="md">
          <SkeletonBlock className="admin-user-skeleton__avatar" />
          <div>
            <SkeletonBlock className="admin-user-skeleton__name" />
            <SkeletonBlock className="admin-user-skeleton__meta" />
          </div>
          <SkeletonBlock className="admin-user-skeleton__actions" />
        </Card>
      ))}
    </div>
  );
}
