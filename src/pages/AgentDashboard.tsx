import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Download, Eye, Plus, Calculator, Sun, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import AuthGuard from "@/components/AuthGuard";
import RepaymentCalculator from "@/components/RepaymentCalculator";
import SolarSavingsCalculator from "@/components/SolarSavingsCalculator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const docTypeOptions = [
  { value: "lease_agreement", label: "Lease Agreement" },
  { value: "landlord_waiver", label: "Landlord Waiver" },
  { value: "rates_notice", label: "Rates Notice" },
  { value: "trust_deed", label: "Trust Deed" },
  { value: "invoice_solar_supplier_vendor", label: "Invoice from solar supplier/vendor" },
  { value: "director_1_licence_front", label: "Director 1 Licence (front)" },
  { value: "director_1_licence_back", label: "Director 1 Licence (back)" },
  { value: "director_1_medicare_front", label: "Director 1 Medicare (front)" },
  { value: "director_2_licence_front", label: "Director 2 Licence (front)" },
  { value: "director_2_licence_back", label: "Director 2 Licence (back)" },
  { value: "director_2_medicare_front", label: "Director 2 Medicare (front)" },
  { value: "guarantor_1_licence_front", label: "Guarantor 1 Licence (front)" },
  { value: "guarantor_1_licence_back", label: "Guarantor 1 Licence (back)" },
  { value: "guarantor_1_medicare_front", label: "Guarantor 1 Medicare (front)" },
  { value: "guarantor_2_licence_front", label: "Guarantor 2 Licence (front)" },
  { value: "guarantor_2_licence_back", label: "Guarantor 2 Licence (back)" },
  { value: "guarantor_2_medicare_front", label: "Guarantor 2 Medicare (front)" },
  { value: "other", label: "Other" },
];

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-gray-50 border rounded-lg p-3">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
  </div>
);

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "applications" | "tasks" | "reports" | "calculator" | "solar"
  >("applications");
  const [hasTasksOnly, setHasTasksOnly] = useState(false);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [uploadType, setUploadType] = useState<Record<string, string>>({});
  const [uploadingByApp, setUploadingByApp] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string>("all");
  const [reportOutstandingOnly, setReportOutstandingOnly] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const previewAgentId = searchParams.get("previewAgentId");
  const previewAgentCode = searchParams.get("previewAgentCode");
  const isPreviewMode = !!previewAgentId || !!previewAgentCode;

  useEffect(() => {
    const mapRow = (row: any): AppRow => {
      const data = (row.data || {}) as any;
      return {
        ...row,
        entity_name: row.entity_name || data.entityName || data.businessName || "",
        finance_amount: row.finance_amount ?? data.financeAmount ?? data.invoiceAmount ?? "",
        status: row.status || data.status || "submitted",
        pdf_url: row.pdf_url || data.pdfUrl || data.pdf_url || null,
        created_at: row.created_at || data.createdAt || data.created_at || null,
        agent_id: row.agent_id || data.agentId || null,
        vendor_id: row.vendor_id || data.vendorUuid || data.vendorId || null,
        data,
      };
    };

    const isAgentMatch = (payload: any, candidates: string[]) => {
      const options = [
        payload?.agentId,
        payload?.agent_id,
        payload?.agentCode,
        payload?.agent_code,
      ]
        .map((v) => (v ? String(v).toLowerCase() : ""))
        .filter(Boolean);
      return candidates.some((c) => options.includes(c.toLowerCase()));
    };

    const load = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Session is optional in preview mode
      if (!session && !isPreviewMode) {
        setLoading(false);
        return;
      }

      const { data: profile } = session
        ? await supabase
            .from("profiles")
            .select("agent_code,agentCode,role")
            .eq("id", session.user.id)
            .maybeSingle()
        : { data: null };

      const role = (profile as any)?.role || (session?.user?.user_metadata as any)?.role || null;
      setProfileRole(role || null);

      const targetAgentId = previewAgentId || session?.user?.id || null;
      const agentCode =
        previewAgentCode ||
        (profile as any)?.agent_code ||
        (profile as any)?.agentCode ||
        null;

      if (!targetAgentId && !agentCode) {
        setPreviewMessage(
          "Preview mode: select an agent from the Admin Dashboard to view their dashboard."
        );
        setApps([]);
        setLoading(false);
        return;
      }
      setPreviewMessage(null);
      setAgentId(targetAgentId);

      const agentTokens = [targetAgentId, agentCode].filter(Boolean).map(String);

      const appQuery = supabase
        .from("applications")
        .select(
          "id,status,entity_name,finance_amount,pdf_url,created_at,data,agent_id,vendor_id"
        )
        .order("created_at", { ascending: false });
      const [{ data: appRows }, { data: formRows }] = await Promise.all([
        targetAgentId
          ? appQuery.eq("agent_id", targetAgentId)
          : agentCode
          ? appQuery.or(`agent_id.is.null,agent_code.eq.${agentCode}`)
          : appQuery,
        supabase.from("application_forms").select("id,status,created_at,data"),
      ]);

      const combined: AppRow[] = [];
      if (appRows) combined.push(...(appRows as any[]).map(mapRow));
      if (formRows) {
        const existing = new Set(combined.map((row) => row.id));
        formRows
          .filter((row: any) => isAgentMatch(row.data, agentTokens))
          .map((row: any) =>
            mapRow({
              ...row,
              agent_id: row.data?.agentId || targetAgentId || null,
              vendor_id: row.data?.vendorUuid || row.data?.vendorId || null,
              pdf_url: row.data?.pdfUrl || null,
            })
          )
          .forEach((row: any) => {
            if (existing.has(row.id)) {
              const idx = combined.findIndex((r) => r.id === row.id);
              if (idx >= 0) combined[idx] = { ...combined[idx], ...row, data: row.data || combined[idx].data };
            } else {
              combined.push(row);
            }
          });
      }

      combined.sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      );
      setApps(combined);
      setLoading(false);
    };
    load();
  }, [previewAgentId, previewAgentCode]);

  const computeTasks = useCallback((row: AppRow) => {
    const d = row.data || {};
    const files = (d.files || {}) as Record<string, any>;
    const has = (key: string) => {
      const v = files[key];
      if (!v) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    };
    const tasks: string[] = [];

    // Directors
    (d.directors || []).forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`director_${n}_licence_front`) && !d.directors?.[idx]?.licenceFrontUrl)
        tasks.push(`Upload Director ${n} licence (front)`);
      if (!has(`director_${n}_licence_back`) && !d.directors?.[idx]?.licenceBackUrl)
        tasks.push(`Upload Director ${n} licence (back)`);
      if (!has(`director_${n}_medicare_front`) && !d.directors?.[idx]?.medicareFrontUrl)
        tasks.push(`Upload Director ${n} Medicare (front)`);
    });

    // Guarantors
    (d.guarantors || []).forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`guarantor_${n}_licence_front`) && !d.guarantors?.[idx]?.licenceFrontUrl)
        tasks.push(`Upload Guarantor ${n} licence (front)`);
      if (!has(`guarantor_${n}_licence_back`) && !d.guarantors?.[idx]?.licenceBackUrl)
        tasks.push(`Upload Guarantor ${n} licence (back)`);
      if (!has(`guarantor_${n}_medicare_front`) && !d.guarantors?.[idx]?.medicareFrontUrl)
        tasks.push(`Upload Guarantor ${n} Medicare (front)`);
    });

    if ((d.premisesType || "").toLowerCase() === "rented") {
      if (!has("lease_agreement")) tasks.push("Upload Lease Agreement");
      if (!has("landlord_waiver")) tasks.push("Upload Landlord Waiver");
    }
    if ((d.premisesType || "").toLowerCase() === "owned") {
      if (!has("rates_notice")) tasks.push("Upload Rates Notice");
    }
    if ((d.entityType || "").toLowerCase() === "trust") {
      if (!has("trust_deed")) tasks.push("Upload Trust Deed");
    }
    const invoiceKey = "invoice_solar_supplier_vendor";
    if (!has(invoiceKey) && !(d?.invoiceUrl || d?.invoice)) {
      tasks.push("Upload invoice from solar supplier/vendor");
    }
    return tasks;
  }, []);

  const TaskChips = ({ tasks, appId }: { tasks: string[]; appId: string }) => {
    const limit = 3;
    const isExpanded = !!expandedTasks[appId];
    const visible = isExpanded ? tasks : tasks.slice(0, limit);
    const remaining = tasks.length - visible.length;
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {visible.map((t, idx) => (
          <span
            key={idx}
            className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold"
          >
            {t}
          </span>
        ))}
        {remaining > 0 && !isExpanded && (
          <button
            type="button"
            onClick={() => setExpandedTasks((cur) => ({ ...cur, [appId]: true }))}
            className="inline-flex items-center rounded-full bg-red-50 text-red-700 px-2 py-1 text-xs font-semibold hover:bg-red-100"
          >
            +{remaining} more
          </button>
        )}
        {isExpanded && tasks.length > limit && (
          <button
            type="button"
            onClick={() => setExpandedTasks((cur) => ({ ...cur, [appId]: false }))}
            className="inline-flex items-center rounded-full bg-gray-50 text-gray-600 px-2 py-1 text-xs font-semibold hover:bg-gray-100"
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  const uploadDoc = async (app: AppRow, file: File, docType: string) => {
    if (isPreviewMode) {
      alert("Preview mode: actions are disabled.");
      return;
    }
    const type = docType || "other";
    setUploadingByApp((cur) => ({ ...cur, [app.id]: true }));
    try {
      const safeName = (file.name || "upload").replace(/[^a-z0-9.\\-_]/gi, "_").slice(0, 80);
      const path = `applications/${app.id}/support_${type}_${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const url = urlData?.publicUrl;
      if (!url) throw new Error("Could not get uploaded file URL");

      const existingData = app.data || {};
      const prevFiles: any = existingData.files || {};
      const prevList = Array.isArray(prevFiles[type]) ? prevFiles[type] : prevFiles[type] ? [prevFiles[type]] : [];
      const files = { ...prevFiles, [type]: [...prevList, url] };
      const newData = { ...existingData, files };

      const { error: formErr } = await supabase.from("application_forms").update({ data: newData }).eq("id", app.id);
      if (formErr) throw formErr;
      await supabase.from("applications").update({ data: newData }).eq("id", app.id);

      setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, data: newData } : a)));
      setSelected((cur) => (cur && cur.id === app.id ? { ...cur, data: newData } : cur));
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed; please try again.");
    } finally {
      setUploadingByApp((cur) => ({ ...cur, [app.id]: false }));
    }
  };

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
  }, [apps, statusFilter, searchTerm, hasTasksOnly, computeTasks]);

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
        cardBg: "bg-blue-600",
      },
      {
        label: "Under Review",
        value: filteredApps.filter(
          (a) => a.status === "under_review" || a.status === "submitted"
        ).length,
        cardBg: "bg-amber-500",
      },
      {
        label: "Approved",
        value: filteredApps.filter((a) => a.status === "approved").length,
        cardBg: "bg-green-600",
      },
      {
        label: "Settled",
        value: filteredApps.filter(
          (a) => a.status === "funded" || a.status === "settled"
        ).length,
        cardBg: "bg-emerald-600",
      },
      {
        label: "Declined",
        value: filteredApps.filter(
          (a) => a.status === "declined" || a.status === "rejected"
        ).length,
        cardBg: "bg-rose-500",
      },
      {
        label: "Withdrawn",
        value: filteredApps.filter((a) => a.status === "withdrawn").length,
        cardBg: "bg-purple-600",
      },
    ],
    [filteredApps]
  );

  const outstandingApps = useMemo(() => {
    let list = apps
      .map((app) => ({ app, tasks: computeTasks(app) }))
      .filter((x) => x.tasks.length > 0);
    if (taskSearchTerm) {
      const q = taskSearchTerm.toLowerCase();
      list = list.filter(
        ({ app }) =>
          app.id.toLowerCase().includes(q) ||
          (app.entity_name || "").toLowerCase().includes(q) ||
          (app.data?.businessName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, computeTasks, taskSearchTerm]);

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

  const reportRows = useMemo(() => {
    let list = apps;
    if (reportStatus !== "all") list = list.filter((a) => a.status === reportStatus);
    if (reportOutstandingOnly) list = list.filter((a) => computeTasks(a).length > 0);
    return list;
  }, [apps, reportStatus, reportOutstandingOnly, computeTasks]);

  const reportTotals = useMemo(() => {
    const outstanding = reportRows.filter((a) => computeTasks(a).length > 0).length;
    const submitted = reportRows.filter((a) => a.status === "submitted").length;
    const underReview = reportRows.filter((a) => a.status === "under_review").length;
    const approved = reportRows.filter((a) => a.status === "approved").length;
    const settled = reportRows.filter((a) => a.status === "funded" || a.status === "settled").length;
    const declined = reportRows.filter((a) => a.status === "declined" || a.status === "rejected").length;
    const value = reportRows.reduce((sum, a) => sum + parseFinance(a.finance_amount), 0);
    return { outstanding, submitted, underReview, approved, settled, declined, value };
  }, [reportRows, computeTasks]);

  const exportReportCSV = () => {
    if (!reportRows.length) return alert("No data to export");
    const header = ["id","business","status","finance_amount","submitted","tasks"];
    const rows = reportRows.map((a) => [
      a.id,
      a.entity_name || "",
      a.status,
      a.finance_amount || "",
      formatAUSDate(a.created_at),
      computeTasks(a).join("; "),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replaceAll('"','""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard allowedRoles={["agent", "admin"]}>
      <div className="bg-gray-50 min-h-screen py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {isPreviewMode && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3">
              Preview mode: read-only view. Actions are disabled.
            </div>
          )}
          {previewMessage && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3">
              {previewMessage}
            </div>
          )}
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
                onClick={() => {
                  if (isPreviewMode) {
                    alert("Preview mode: actions are disabled.");
                    return;
                  }
                  navigate("/application-form");
                }}
                className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center w-full sm:w-auto justify-center"
                disabled={isPreviewMode}
              >
                <Plus className="w-5 h-5 mr-2" /> New Application
              </button>
            </div>
          </div>

          {activeTab === "applications" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`rounded-lg shadow p-5 text-white ${stat.cardBg || "bg-gray-800"}`}
                >
                  <p className="text-sm font-medium text-white/90">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
              ))}
              <div className="rounded-lg shadow p-5 text-white bg-green-700">
                <p className="text-sm font-medium text-white/90">Total Finance Value</p>
                <p className="text-2xl font-bold mt-2">
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
                    <option value="withdrawn">Withdrawn</option>
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
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Outstanding Tasks</h3>
                  <p className="text-sm text-gray-600">Upload documents to resolve items.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by customer, business, or ID..."
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {(!loading ? outstandingApps : []).map(({ app, tasks }) => (
                    <div key={app.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50">
                      <div className="md:w-1/3 space-y-1">
                        <div className="font-mono text-sm text-gray-700">{app.id}</div>
                        <div className="font-semibold text-gray-900">{app.entity_name || "-"}</div>
                        <div className="text-xs text-gray-500">
                          Submitted: {app.created_at ? new Date(app.created_at).toLocaleDateString("en-AU") : "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <StatusBadge status={app.status} />
                          </span>
                        </div>
                      </div>
                      <div className="md:w-1/3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            {tasks.length}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">Outstanding tasks</span>
                        </div>
                        <TaskChips tasks={tasks} appId={app.id} />
                      </div>
                      <div className="md:w-1/3">
                        <div className="flex flex-col gap-2">
                          <Select
                            value={uploadType[app.id] || "other"}
                            onValueChange={(v) => setUploadType({ ...uploadType, [app.id]: v })}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Document type" />
                            </SelectTrigger>
                            <SelectContent>
                              {docTypeOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="text-xs text-blue-700 hover:text-blue-900 cursor-pointer flex items-center gap-2">
                            <UploadCloud className="h-4 w-4" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const type = uploadType[app.id] || "other";
                                uploadDoc(app, file, type);
                                e.target.value = "";
                              }}
                            />
                            {uploadingByApp[app.id] ? "Uploading..." : "Upload & mark complete"}
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!loading && outstandingApps.length === 0 && (
                    <div className="p-6 text-center text-gray-500">No outstanding tasks.</div>
                  )}
                  {loading && <div className="p-6 text-center text-gray-500">Loading...</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  className="px-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="settled">Settled</option>
                  <option value="declined">Declined</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-green-600 border-gray-300 rounded"
                    checked={reportOutstandingOnly}
                    onChange={(e) => setReportOutstandingOnly(e.target.checked)}
                  />
                  <span>Outstanding tasks only</span>
                </label>
                <button
                  onClick={exportReportCSV}
                  className="px-4 h-11 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Download className="w-4 h-4 inline mr-2" /> Export report
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Submitted" value={reportTotals.submitted} />
                <Stat label="Under Review" value={reportTotals.underReview} />
                <Stat label="Approved" value={reportTotals.approved} />
                <Stat label="Settled" value={reportTotals.settled} />
                <Stat label="Declined" value={reportTotals.declined} />
                <Stat label="Outstanding tasks" value={reportTotals.outstanding} />
                <Stat label="Filtered applications" value={reportRows.length} />
                <Stat label="Total value" value={currency(reportTotals.value)} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Business</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Finance</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Submitted</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportRows.map((app) => {
                      const tasks = computeTasks(app);
                      return (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{app.id}</td>
                          <td className="px-4 py-2">{app.entity_name || "—"}</td>
                          <td className="px-4 py-2">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-4 py-2">{app.finance_amount || "—"}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {formatAUSDate(app.created_at)}
                          </td>
                          <td className="px-4 py-2 text-xs text-red-700">
                            {tasks.length ? tasks.join(", ") : "None"}
                          </td>
                        </tr>
                      );
                    })}
                    {!reportRows.length && (
                      <tr>
                        <td
                          className="px-4 py-4 text-center text-gray-500"
                          colSpan={6}
                        >
                          No rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
