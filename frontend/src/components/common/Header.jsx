import { useState, useRef, useEffect } from "react";
import { User, Settings, Users, CalendarCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../styles/Header.css";

export default function Header({ title = "Spielabend App" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const menuRef = useRef();

  const adminActions = [
    {
      label: "Benutzer",
      desc: "Rollen & Zugänge verwalten",
      icon: <Users size={18} />,
      path: "/admin/users",
    },
    {
      label: "Jahre verwalten",
      desc: "Neue Jahre & Abschlüsse",
      icon: <CalendarCheck size={18} />,
      path: "/admin/years",
    },
  ];

  const handleAdminClick = (path) => {
    setAdminOpen(false);
    navigate(path);
  };

  // Schliessen beim Klick ausserhalb
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAdminOpen(false);
      }
    }
    if (adminOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [adminOpen]);

  return (
    <header className="header">
      <div className="header-bar">
        <div
          className="header-icon-wrapper"
          onClick={() => navigate("/profil")}
        >
          <User size={20} strokeWidth={2} />
        </div>
        <span className="header-title">{title}</span>
        {user?.role === "admin" && (
          <div
            className="header-icon-wrapper"
            onClick={() => setAdminOpen(!adminOpen)}
          >
            <Settings size={20} strokeWidth={2} />
          </div>
        )}
      </div>

      {adminOpen && (
        <>
          <div className="admin-popup-blur" />
          <div className="admin-popup-menu" ref={menuRef}>
            {adminActions.map((action, i) => (
              <div
                key={i}
                className="admin-popup-item"
                onClick={() => handleAdminClick(action.path)}
              >
                <div className="admin-popup-icon">{action.icon}</div>
                <div className="admin-popup-texts">
                  <span className="admin-popup-label">{action.label}</span>
                  <span className="admin-popup-desc">{action.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
