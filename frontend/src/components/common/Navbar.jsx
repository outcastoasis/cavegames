// frontend/src/components/common/Navbar.jsx

import {
  BookOpenCheck,
  Gamepad2,
  Home,
  ClipboardList,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import "../../styles/Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar" aria-label="Hauptnavigation">
      <NavItem
        icon={<BookOpenCheck aria-hidden="true" />}
        label="Historie"
        to="/historie"
      />
      <NavItem
        icon={<Gamepad2 aria-hidden="true" />}
        label="Abende"
        to="/abende"
      />
      <NavItem
        icon={<Home aria-hidden="true" />}
        label="Home"
        to="/"
        center
      />
      <NavItem
        icon={<ClipboardList aria-hidden="true" />}
        label="Umfragen"
        to="/umfragen"
      />
      <NavItem
        icon={<User aria-hidden="true" />}
        label="Profil"
        to="/profil"
      />
    </nav>
  );
}

function NavItem({ icon, label, to, center = false }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `nav-item${isActive ? " active" : ""}${center ? " center-button" : ""}`
      }
    >
      <span className={`nav-item-icon${center ? " center-icon" : ""}`}>
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}
