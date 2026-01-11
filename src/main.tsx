import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages & Components
import LandingPage from "./components/LandingPage";
import VendorIntakeForm from "./components/VendorIntakeForm";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVendorAccreditation from "./pages/AdminVendorAccreditation";
import AdminApplicationStatus from "./pages/AdminApplicationStatus";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminAgents from "./pages/AdminAgents";
import AdminOutstandingTasks from "./pages/AdminOutstandingTasks";
import AdminProspects from "./pages/AdminProspects";
import VendorDashboard from "./pages/VendorDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import ApplicationForm from "./components/ApplicationForm";
import ContractPage from "./pages/ContractPage";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";
import LoginPage from "./pages/LoginPage";
import Unauthorized from "./pages/Unauthorized";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AgentSignUp from "./pages/AgentSignUp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/vendor-intake" element={<VendorIntakeForm />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/agent-signup" element={<AgentSignUp />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          path="/admin-dashboard"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/vendor-accreditation"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminVendorAccreditation />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/application-status"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminApplicationStatus />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminReportsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminAgents />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/outstanding-tasks"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminOutstandingTasks />
            </AuthGuard>
          }
        />
        <Route
          path="/admin/prospects"
          element={
            <AuthGuard allowedRoles={["admin"]}>
              <AdminProspects />
            </AuthGuard>
          }
        />
        <Route
          path="/vendor-dashboard"
          element={
            <AuthGuard allowedRoles={["vendor", "admin"]}>
              <VendorDashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/agent-dashboard"
          element={
            <AuthGuard allowedRoles={["agent", "admin"]}>
              <AgentDashboard />
            </AuthGuard>
          }
        />

        {/* NEW APPLICATION FORM ROUTE */}
        <Route
          path="/application-form"
          element={
            <AuthGuard allowedRoles={["vendor", "admin", "agent"]}>
              <ApplicationForm />
            </AuthGuard>
          }
        />

        <Route
          path="/contract/:appId"
          element={
            <AuthGuard allowedRoles={["vendor", "admin", "agent"]}>
              <ContractPage />
            </AuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
