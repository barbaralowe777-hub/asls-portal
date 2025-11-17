import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, Eye, Plus, Calculator, Sun } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import AuthGuard from "@/components/AuthGuard";
import RepaymentCalculator from "@/components/RepaymentCalculator";
import SolarSavingsCalculator from "@/components/SolarSavingsCalculator";

type AppRow = {
  id: string;
  status: string;
  entity_name?: string | null;
  finance_amount?: string | null;
  pdf_url?: string | null;
  created_at?: string | null;
  data?: any;
  agent_id?: string | null;
  vendor_id?: string | null;
};

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "applications" | "tasks" | "reports" | "calculator" | "solar"
  >("applications");
  const [hasTasksOnly, setHasTasksOnly] = useState(false);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setAgentId(session.user.id);
      let query = supabase
        .from("applications")
        .select(
          "id,status,entity_name,finance_amount,pdf_url,created_at,data,agent_id,vendor_id"
        )
        .order("created_at", { ascending: false })
        .eq("agent_id", session.user.id);
      const { data, error } = await query;
      if (!error && data) setApps(data as AppRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filteredApps = useMemo(() => {
    let list = apps;
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          (a.entity_name || "").toLowerCase().includes(q)
      );
    }
    if (hasTasksOnly) {
      list = list.filter((a) => computeTasks(a).length > 0);
    }
    return list;
  }, [apps, statusFilter, searchTerm, hasTasksOnly]);

  const parseFinance = (s?: string | null) => {
    if (!s) return 0;
    const num = parseFloat(String(s).replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };
  const formatAUSDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString("en-AU") : "-";
  const currency = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  const financeTotal = useMemo(() => {
    return filteredApps.reduce((sum, a) => sum + parseFinance(a.finance_amount), 0);
  }, [filteredApps]);

  const stats = useMemo(
    () => [
      {
        label: "Total Applications",
        value: filteredApps.length,
        bg: "bg-blue-100",
        text: "text-blue-800",
      },
      {
        label: "Under Review",
        value: filteredApps.filter(
          (a) => a.status === "under_review" || a.status === "submitted"
        ).length,
        bg: "bg-amber-100",
        text: "text-amber-800",
      },
      {
        label: "Approved",
        value: filteredApps.filter((a) => a.status === "approved").length,
        bg: "bg-green-100",
        text: "text-green-800",
      },
      {
        label: "Settled",
        value: filteredApps.filter(
          (a) => a.status === "funded" || a.status === "settled"
        ).length,
        bg: "bg-emerald-100",
        text: "text-emerald-800",
      },
      {
        label: "Declined",
        value: filteredApps.filter(
          (a) => a.status === "declined" || a.status === "rejected"
        ).length,
        bg: "bg-red-100",
        text: "text-red-800",
      },
    ],
    [filteredApps]
  );

  const computeTasks = (row: AppRow) => {
    const d = row.data || {};
    const files = (d.files || {}) as Record<string, string[]>;
    const has = (key: string) => Array.isArray(files[key]) && files[key].length > 0;

    const tasks: string[] = [];
    if (d.premisesType === "Rented" && !has("lease_agreement"))
      tasks.push("Upload Lease Agreement");
    if (d.premisesType === "Owned" && !has("rates_notice"))
      tasks.push("Upload Rates Notice");
    if (d.entityType === "Trust" && !has("trust_deed"))
      tasks.push("Upload Trust Deeds");
    return tasks;
  };

  const exportCSV = () => {
    if (!filteredApps.length) return alert("No data to export");
    const header = ["id", "entity_name", "status", "finance_amount", "submitted"];
    const rows = filteredApps.map((a) => [
      a.id,
      a.entity_name || "",
      a.status,
      a.finance_amount || "",
      formatAUSDate(a.created_at),
    ]);
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent_apps_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard allowedRoles={["agent"]}>
      <div className="bg-gray-50 min-h-screen py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Track all applications submitted under your login.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("calculator")}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-blue-600 text-white hover:bg-blue-700 shadow w-full sm:w-auto justify-center"
              >
                <Calculator className="w-5 h-5 mr-2" /> Repayment Calculator
              </button>
              <button
                onClick={() => setActiveTab("solar")}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-yellow-500 text-white hover:bg-yellow-600 shadow w-full sm:w-auto justify-center"
              >
                <Sun className="w-5 h-5 mr-2" /> Solar Savings
              </button>
              <button
                onClick={() => navigate("/application-form")}
                className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center w-full sm:w-auto justify-center"
              >
                <Plus className="w-5 h-5 mr-2" /> New Application
              </button>
            </div>
          </div>

          {activeTab === "applications" && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div
                    className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <span className={`text-xl font-bold ${stat.text}`}>
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm font-medium">{stat.label}</p>
                </div>
              ))}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-4">
                  $
                </div>
                <p className="text-gray-600 text-sm">Total Finance Value</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {currency(financeTotal)}
                </p>
              </div>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { key: "applications", label: "Applications" },
              { key: "tasks", label: "Outstanding Tasks" },
              { key: "reports", label: "Reports" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-4 py-2 rounded-full border ${
                  activeTab === t.key
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "applications" && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by business name or Application ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="settled">Settled</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-red-600 border-gray-300 rounded"
                      checked={hasTasksOnly}
                      onChange={(e) => setHasTasksOnly(e.target.checked)}
                    />
                    <span>Has outstanding tasks</span>
                  </label>
                  <button
                    onClick={exportCSV}
                    className="px-4 h-11 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <Download className="w-4 h-4 inline mr-2" /> Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "applications" && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Application
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finance Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {(loading ? Array.from({ length: 4 }) : filteredApps).map(
                      (app, idx) => (
                        <tr key={app?.id || idx}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {loading ? (
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                            ) : (
                              <>
                                <p>{app.id}</p>
                                <p className="text-gray-500">
                                  {app.data?.agentFirstName
                                    ? `${app.data.agentFirstName} ${app.data.agentLastName || ""}`
                                    : "—"}
                                </p>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {loading ? (
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-32" />
                            ) : (
                              app.entity_name || "—"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                            {loading ? (
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                            ) : (
                              app.finance_amount || "—"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            {loading ? (
                              <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                            ) : (
                              <StatusBadge status={app.status} />
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {loading ? (
                              <div className="h-4 bg-gray-100 rounded animate-pulse w-16" />
                            ) : (
                              formatAUSDate(app.created_at)
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!loading && (
                              <div className="flex items-center gap-3">
                                <a
                                  href={app.pdf_url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#1dad21] hover:text-green-700 flex items-center"
                                >
                                  <Eye className="w-4 h-4 mr-1" /> PDF
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setSelected(app)}
                                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                                >
                                  Details
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                {!loading && filteredApps.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    No applications found.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Outstanding Tasks</h3>
              {filteredApps.flatMap((a) =>
                computeTasks(a).map((task) => ({ id: a.id, task }))
              ).length === 0 ? (
                <p className="text-gray-500">No outstanding tasks</p>
              ) : (
                <ul className="list-disc pl-6 space-y-2">
                  {filteredApps
                    .flatMap((a) =>
                      computeTasks(a).map((task) => ({ id: a.id, task }))
                    )
                    .map((t, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-mono font-semibold mr-2">
                          {t.id}
                        </span>
                        {t.task}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === "reports" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Reports</h3>
              <button
                onClick={exportCSV}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export Applications CSV
              </button>
            </div>
          )}

          {activeTab === "calculator" && (
            <div className="bg-white rounded-lg shadow p-6">
              <RepaymentCalculator />
            </div>
          )}

          {activeTab === "solar" && (
            <div className="bg-white rounded-lg shadow p-6">
              <SolarSavingsCalculator />
            </div>
          )}

          {selected && (
            <div
              className="fixed inset-0 bg-black/30 z-50 flex justify-end"
              onClick={() => setSelected(null)}
            >
              <div
                className="w-full max-w-xl h-full bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b">
                  <h3 className="text-xl font-semibold">
                    Application {selected.id}
                  </h3>
                  <p className="text-sm text-gray-600">{selected.entity_name}</p>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-64px)]">
                  <div>
                    <h4 className="font-semibold mb-2">Outstanding Tasks</h4>
                    {(() => {
                      const t = computeTasks(selected);
                      return t.length ? (
                        <ul className="list-disc pl-5 text-sm">
                          {t.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">None</p>
                      );
                    })()}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Application Data</h4>
                    <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto">
                      {JSON.stringify(selected.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default AgentDashboard;
