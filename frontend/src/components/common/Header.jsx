// frontend/src/components/common/Header.jsx
import { Settings, User } from "lucide-react";
import "../../styles/Header.css";

export default function Header({ title = "Spielabend App" }) {
  return (
    <header className="header">
      <div className="header-bar">
        <div className="header-icon-wrapper">
          <User size={20} strokeWidth={2} />
        </div>
        <span className="header-title">{title}</span>
        <div className="header-icon-wrapper">
          <Settings size={20} strokeWidth={2} />
        </div>
      </div>
    </header>
  );
}
