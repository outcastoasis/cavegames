// frontend/src/components/common/Navbar.jsx

import {
  BookOpenCheck,
  Gamepad2,
  Home,
  ClipboardList,
  Users,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "../../styles/Navbar.css";

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <footer className="navbar">
      <NavItem
        icon={<BookOpenCheck />}
        label="Historie"
        to="/historie"
        active={pathname === "/historie"}
      />
      <NavItem
        icon={<Gamepad2 />}
        label="Abende"
        to="/abende"
        active={pathname === "/abende"}
      />
      <NavItem
        icon={<Home />}
        label="Home"
        to="/"
        active={pathname === "/"}
        center
      />
      <NavItem
        icon={<ClipboardList />}
        label="Umfragen"
        to="/umfragen"
        active={pathname === "/umfragen"}
      />
      <NavItem
        icon={<User />}
        label="Profil"
        to="/profil"
        active={pathname === "/profil"}
      />
    </footer>
  );
}

function NavItem({ icon, label, to, active, center }) {
  return (
    <Link
      to={to}
      className={`nav-item ${active ? "active" : ""} ${
        center ? "center-button" : ""
      }`}
    >
      <div className={center ? "center-icon" : ""}>{icon}</div>
      <span>{label}</span>
    </Link>
  );
}
