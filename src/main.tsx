import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages & Components
import LandingPage from "./components/LandingPage";
import VendorIntakeForm from "./components/VendorIntakeForm";
import AdminDashboard from "./pages/AdminDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import ApplicationForm from "./components/ApplicationForm";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import Login from "./components/Login"; // ✅ Shared login component

// Temporary placeholder (until AgentDashboard is built)
const AgentDashboard = VendorDashboard;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/vendor-intake" element={<VendorIntakeForm />} />

  <Route
    path="/admin-dashboard"
    element={
      <AuthGuard allowedRoles={["admin"]}>
        <AdminDashboard />
      </AuthGuard>
    }
  />
  <Route
    path="/vendor-dashboard"
    element={
      <AuthGuard allowedRoles={["vendor"]}>
        <VendorDashboard />
      </AuthGuard>
    }
  />
  <Route
    path="/agent-dashboard"
    element={
      <AuthGuard allowedRoles={["agent"]}>
        <AgentDashboard />
      </AuthGuard>
    }
  />

  {/* ✅ NEW APPLICATION FORM ROUTE */}
  <Route
    path="/application-form"
    element={
      <AuthGuard allowedRoles={["vendor", "admin", "agent"]}>
        <ApplicationForm />
      </AuthGuard>
    }
  />

  {/* Fallback */}
  <Route path="*" element={<NotFound />} />
</Routes>

    </BrowserRouter>
  </React.StrictMode>
);
