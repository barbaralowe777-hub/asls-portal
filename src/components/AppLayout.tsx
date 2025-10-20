console.log("✅ AppLayout loaded");

import React, { useState } from "react";
import Navigation from "./Navigation";
import LandingPage from "./LandingPage";
import VendorDashboard from "./VendorDashboard";
import ApplicationForm from "./ApplicationForm";
import VendorIntakeForm from "./VendorIntakeForm";
import AdminAnalytics from "./AdminAnalytics"; // ✅ Correct path
import ApiKeys from "./ApiKeys";
import RepaymentCalculator from "./RepaymentCalculator";
import Signup from "./Signup";
import Login from "./Login";
import StatusBadge from "./StatusBadge";
import { mockApplications } from "@/data/mockData";
import { Eye, Plus } from "lucide-react";

const AppLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState("landing");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<"vendor" | "agent" | "admin">("vendor");

  // ---------------------------
  // Login Handlers
  // ---------------------------
  const handleVendorLogin = () => {
    setIsLoggedIn(true);
    setUserType("vendor");
    setCurrentPage("vendor-dashboard");
  };

  const handleAgentLogin = () => {
    setIsLoggedIn(true);
    setUserType("agent");
    setCurrentPage("agent-dashboard");
  };

  const handleAdminLogin = () => {
    setIsLoggedIn(true);
    setUserType("admin");
    setCurrentPage("admin-analytics");
  };

  const handleGetAccredited = () => setCurrentPage("vendor-intake");

  // ---------------------------
  // Page Renderer
  // ---------------------------
  const renderPage = () => {
    if (currentPage === "vendor-intake") {
      return (
        <VendorIntakeForm
          onBack={() => setCurrentPage("landing")}
          onSubmit={() => {
            alert("Application submitted successfully! We will contact you soon.");
            setCurrentPage("landing");
          }}
        />
      );
    }

    if (currentPage === "landing" && !isLoggedIn) {
      return (
        <LandingPage
          onGetStarted={handleGetAccredited}
          onVendorLogin={() => setCurrentPage("login")}
          onAgentLogin={() => setCurrentPage("login")}
          onAdminLogin={() => setCurrentPage("login")}
        />
      );
    }

    if (currentPage === "login") {
      return (
        <Login
          onLoginSuccess={(role) => {
            setIsLoggedIn(true);
            setUserType(role as "vendor" | "agent" | "admin");
            setCurrentPage(
              role === "vendor"
                ? "vendor-dashboard"
                : role === "agent"
                ? "agent-dashboard"
                : "admin-analytics"
            );
          }}
          onSwitchToSignup={() => setCurrentPage("signup")}
        />
      );
    }

    if (currentPage === "signup") {
      return (
        <Signup
          onSignupSuccess={(role) => {
            setIsLoggedIn(true);
            setUserType(role);
            setCurrentPage(role === "vendor" ? "vendor-dashboard" : "agent-dashboard");
          }}
        />
      );
    }

    // --- Authenticated Routes ---
    switch (currentPage) {
      case "vendor-dashboard":
        return (
          <VendorDashboard
            onNewApplication={() => setCurrentPage("new-application")}
            onViewApplication={(id) => console.log("View vendor app:", id)}
          />
        );

      case "agent-dashboard":
        return (
          <AgentDashboard
            onNewApplication={() => setCurrentPage("new-application")}
            onViewApplication={(id) => console.log("View agent app:", id)}
          />
        );

      case "new-application":
        return (
          <ApplicationForm
            onBack={() =>
              setCurrentPage(userType === "agent" ? "agent-dashboard" : "vendor-dashboard")
            }
            onSubmit={() => {
              alert("Application submitted successfully!");
              setCurrentPage(userType === "agent" ? "agent-dashboard" : "vendor-dashboard");
            }}
          />
        );

      case "api-keys":
        return <ApiKeys />;

      case "repayment-calculator":
        return <RepaymentCalculator />;

      case "admin-analytics":
        console.log("✅ Rendering Admin Analytics Page");
        return <AdminAnalytics adminName="Admin User" />;

      default:
        console.log("⚠️ Fallback to Vendor Dashboard");
        return (
          <VendorDashboard
            onNewApplication={() => setCurrentPage("new-application")}
            onViewApplication={(id) => console.log(id)}
          />
        );
    }
  };

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {isLoggedIn && (
        <Navigation
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isVendor={userType === "vendor"}
        />
      )}
      {renderPage()}
    </div>
  );
};

// ------------------------------------
// Inline AgentDashboard Component 👇
// ------------------------------------
const AgentDashboard: React.FC<{
  onNewApplication: () => void;
  onViewApplication: (id: string) => void;
}> = ({ onNewApplication, onViewApplication }) => {
  const agentId = "agent_123";
  const [statusFilter, setStatusFilter] = useState("all");
  const applications = mockApplications.filter((a) => a.agentId === agentId);

  const filteredApps =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  const outstandingTasks = applications.filter(
    (a) => a.status === "under_review" || a.status === "pending_action"
  );

  const stats = [
    { label: "Total Applications", value: applications.length, color: "bg-[#1dad21]" },
    {
      label: "Under Review",
      value: applications.filter((a) => a.status === "under_review").length,
      color: "bg-amber-500",
    },
    {
      label: "Approved",
      value: applications.filter((a) => a.status === "approved").length,
      color: "bg-green-500",
    },
    {
      label: "Settled",
      value: applications.filter((a) => a.status === "funded").length,
      color: "bg-emerald-500",
    },
    {
      label: "Declined",
      value: applications.filter((a) => a.status === "declined").length,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760324623689_be6a0877.png"
            alt="Australian Solar Lending Solutions"
            className="h-12 w-auto"
          />
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your applications and outstanding tasks
            </p>
          </div>
          <button
            onClick={onNewApplication}
            className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Application
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 text-center">
              <div
                className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-3`}
              >
                <span className="text-white text-lg font-bold">{stat.value}</span>
              </div>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "under_review", "approved", "funded", "declined", "tasks"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full font-medium text-sm ${
                statusFilter === status
                  ? "bg-[#1dad21] text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status === "tasks" ? "Outstanding Tasks" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(statusFilter === "tasks" ? outstandingTasks : filteredApps).map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{app.customerName}</div>
                    <div className="text-sm text-gray-500">{app.customerEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ${app.loanAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{app.submittedDate}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => onViewApplication(app.id)}
                      className="text-[#1dad21] hover:text-green-700 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
