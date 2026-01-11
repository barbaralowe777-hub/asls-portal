import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Quick navigation */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/admin/vendor-accreditation")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 shadow"
            >
              Vendors &amp; Accreditations
            </button>
            <button
              onClick={() => navigate("/admin/application-status")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-amber-500 text-white hover:bg-amber-600 shadow"
            >
              Application Status Updates
            </button>
            <button
              onClick={() => navigate("/admin/reports")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-green-600 text-white hover:bg-green-700 shadow"
            >
              Reports
            </button>
            <button
              onClick={() => navigate("/admin/agents")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-slate-900 text-white shadow"
            >
              Agents
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Reports</h1>
              <p className="text-gray-600 text-sm">Custom reports can be added here.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
              Back to Dashboard
            </Button>
          </div>
          <p className="text-sm text-gray-700">
            This placeholder is to prevent 404s. Let me know the exact reports you need and I’ll wire them up.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;
