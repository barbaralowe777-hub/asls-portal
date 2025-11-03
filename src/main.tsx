import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// ✅ Pages & Components
import LandingPage from "@/components/LandingPage";
import VendorDashboard from "@/pages/VendorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import VendorIntakeForm from "@/components/VendorIntakeForm";
import NotFound from "@/pages/NotFound";

// 🧑‍💼 Temporary Agent Dashboard placeholder
const AgentDashboard = VendorDashboard;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Dashboards */}
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />
        <Route path="/agent-dashboard" element={<AgentDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Vendor Intake */}
        <Route path="/vendor-intake" element={<VendorIntakeForm />} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
