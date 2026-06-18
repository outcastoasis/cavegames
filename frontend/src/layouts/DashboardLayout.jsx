// frontend/src/layouts/DashboardLayout.jsx

import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Header from "../components/common/Header";
import Navbar from "../components/common/Navbar";
import { useTestMode } from "../context/TestModeContext";
import "../styles/layouts/DashboardLayout.css";

export default function DashboardLayout() {
  const [title, setTitle] = useState("Cavegames");
  const location = useLocation();
  const { testMode } = useTestMode();

  return (
    <>
      <Header title={title} />
      {testMode && <div className="testmode-banner">Du bist im Testmodus</div>}
      <main className="dashboard-main">
        <div className="route-transition" key={`${location.pathname}-${testMode}`}>
          <Outlet context={{ setTitle }} />
        </div>
      </main>
      <Navbar />
    </>
  );
}
