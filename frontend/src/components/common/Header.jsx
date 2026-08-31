import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  FlaskConical,
  Gamepad2,
  ListChecks,
  LogOut,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authState";
import "../../styles/Header.css";

export default function Header({ title = "Cavegames" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapperRef = useRef(null);

  const adminActions = [
    {
      label: "Benutzer",
      desc: "Rollen & Zugänge verwalten",
      icon: <Users size={18} />,
      path: "/admin/users",
    },
    {
      label: "Spiele",
      desc: "Katalog verwalten",
      icon: <Gamepad2 size={18} />,
      path: "/admin/games",
    },
    {
      label: "Umfragen",
      desc: "Termine & Stimmen",
      icon: <ListChecks size={18} />,
      path: "/admin/polls",
    },
    {
      label: "Testmodus",
      desc: "Testdaten verwalten",
      icon: <FlaskConical size={18} />,
      path: "/admin/test-mode",
    },
    {
      label: "Jahre verwalten",
      desc: "Neue Jahre & Abschlüsse",
      icon: <CalendarCheck size={18} />,
      path: "/admin/years",
    },
  ];

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        menuWrapperRef.current &&
        !menuWrapperRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header-bar">
        <span className="header-title">{title}</span>

        <div className="header-menu-wrapper" ref={menuWrapperRef}>
          <button
            type="button"
            className="header-icon-wrapper"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Menü schliessen" : "Menü öffnen"}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Settings size={20} strokeWidth={2} />
          </button>

          {menuOpen && (
            <div className="header-popup-menu" role="menu">
              <button
                type="button"
                className="header-popup-item"
                onClick={() => handleNavigate("/einstellungen")}
                role="menuitem"
              >
                <span className="header-popup-icon">
                  <SlidersHorizontal size={18} />
                </span>
                <span className="header-popup-texts">
                  <span className="header-popup-label">Einstellungen</span>
                  <span className="header-popup-desc">Konto & Meldungen</span>
                </span>
              </button>

              {user?.role === "admin" && (
                <>
                  <div className="header-popup-section-label">Verwaltung</div>
                  {adminActions.map((action) => (
                    <button
                      type="button"
                      key={action.path}
                      className="header-popup-item"
                      onClick={() => handleNavigate(action.path)}
                      role="menuitem"
                    >
                      <span className="header-popup-icon">{action.icon}</span>
                      <span className="header-popup-texts">
                        <span className="header-popup-label">
                          {action.label}
                        </span>
                        <span className="header-popup-desc">{action.desc}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}

              <div className="header-popup-divider" />
              <button
                type="button"
                className="header-popup-item header-popup-item--logout"
                onClick={handleLogout}
                role="menuitem"
              >
                <span className="header-popup-icon">
                  <LogOut size={18} />
                </span>
                <span className="header-popup-texts">
                  <span className="header-popup-label">Abmelden</span>
                  <span className="header-popup-desc">Sitzung beenden</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {menuOpen && <div className="header-popup-blur" aria-hidden="true" />}
    </header>
  );
}
