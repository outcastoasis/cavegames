// frontend/src/layouts/DashboardLayout.jsx

import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Header from "../components/common/Header";
import Navbar from "../components/common/Navbar";
import "../styles/layouts/DashboardLayout.css";

export default function DashboardLayout() {
  const [title, setTitle] = useState("Cavegames");
  const location = useLocation();

  return (
    <>
      <Header title={title} />
      <main className="dashboard-main">
        <div className="route-transition" key={location.pathname}>
          <Outlet context={{ setTitle }} />
        </div>
      </main>
      <Navbar />
    </>
  );
}
