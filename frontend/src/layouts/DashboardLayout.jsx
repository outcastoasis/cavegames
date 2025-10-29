import { Outlet } from "react-router-dom";
import Header from "../components/common/Header";
import Navbar from "../components/common/Navbar";
import "../styles/layouts/DashboardLayout.css";

export default function DashboardLayout({ title = "Spielabend App" }) {
  return (
    <>
      <Header title={title} />
      <main className="dashboard-main">
        <Outlet />
      </main>
      <Navbar />
    </>
  );
}
