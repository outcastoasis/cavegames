// frontend/src/layouts/DashboardLayout.jsx
import Header from "../components/common/Header";
import Navbar from "../components/common/Navbar";
import LogoutButton from "../components/LogoutButton";
import "../styles/layouts/DashboardLayout.css";

export default function DashboardLayout({ title, children }) {
  return (
    <>
      <Header title={title} />
      <div className="logout-container">
        <LogoutButton />
      </div>
      <main className="dashboard-main">{children}</main>
      <Navbar />
    </>
  );
}
