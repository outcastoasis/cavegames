// frontend/src/layouts/DashboardLayout.jsx

import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "../components/common/Header";
import Navbar from "../components/common/Navbar";
import "../styles/layouts/DashboardLayout.css";

export default function DashboardLayout() {
  const [title, setTitle] = useState("Cavegames");

  return (
    <>
      <Header title={title} />
      <main className="dashboard-main">
        <Outlet context={{ setTitle }} />
      </main>
      <Navbar />
    </>
  );
}
