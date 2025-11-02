// frontend/src/router.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminUsers from "./pages/AdminUsers";
import AdminYears from "./pages/AdminYears";
import YearDetail from "./pages/YearDetail";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Seiten */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Geschützte Seiten mit Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Standardseite */}
          <Route index element={<Home />} />
          {/* Admin-Unterseiten */}
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/years" element={<AdminYears />} />
          <Route path="admin/years/:year" element={<YearDetail />} />{" "}
          {/* 👈 HIER */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
