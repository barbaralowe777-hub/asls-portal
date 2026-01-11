import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Search, Download, X, Filter, Eye, Calculator } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RepaymentCalculator from "@/components/RepaymentCalculator";

// ----------------------------
// Helpers
// ----------------------------
const currency = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

const parseAmount = (value: any) => {
  if (value === null || value === undefined) return 0;
  const num = Number(
    typeof value === "string" ? value.replace(/[^0-9.-]/g, "") : value
  );
  return Number.isFinite(num) ? num : 0;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  funded: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

const toSafeValue = (label?: string | null, fallback?: string | number, placeholder?: string) => {
  const primary = (label || "").trim().toLowerCase();
  if (primary) return primary;
  const fallbackStr = fallback !== undefined && fallback !== null ? String(fallback).trim().toLowerCase() : "";
  if (fallbackStr) return fallbackStr;
  return placeholder || "unknown";
};

const downloadCSV = (rows: any[], filename: string) => {
  if (!rows.length) return alert("No data to export.");
  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "ddMMyyyy_HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ----------------------------
// Component
// ----------------------------
const AdminAnalytics: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [vendorList, setVendorList] = useState<{ id: string; name: string; vendor_code?: string | null }[]>([]);
  const [agentProfiles, setAgentProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [previewVendorCode, setPreviewVendorCode] = useState<string>("");
  const [previewAgentId, setPreviewAgentId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const mapRow = (row: any) => {
      const data = (row.data || {}) as any;
      const customerName =
        row.entity_name || data.entityName || data.businessName || "Unknown";
      const agentName =
        [data.agentFirstName, data.agentLastName].filter(Boolean).join(" ").trim() ||
        row.agent_name ||
        data.agentName ||
        "Unknown";
        const vendorLabel = row.vendor_name || data.vendorName || "Unassigned";
      const submittedDate =
        row.created_at || data.createdAt || data.created_at || new Date().toISOString();
      const actionRequired = !!(data.actionRequired || (data.missingTasks || []).length);

      return {
        id: row.id,
        customerName,
        customerEmail: data.customerEmail || "",
        loanAmount: parseAmount(
          row.finance_amount ?? data.financeAmount ?? data.invoiceAmount
        ),
        status: row.status || data.status || "submitted",
        submittedDate,
        vendor: vendorLabel,
        vendor_id: row.vendor_id || data.vendorUuid || data.vendorId || null,
        agent: agentName,
        agent_id: row.agent_id || data.agentId || null,
        pdf_url: row.pdf_url || data.pdfUrl || data.pdf_url || data.contractUrl || null,
        actionRequired,
        data,
      };
    };

    const fetchApplications = async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*");
      if (error) throw error;
      return data || [];
    };

    const load = async () => {
      setLoading(true);
      try {
        const appRows = await fetchApplications();

        const [{ data: formRows, error: formErr }] = await Promise.all([
          supabase.from("application_forms").select("id,status,created_at,data"),
        ]);
        if (formErr) console.warn("application_forms fetch issue", formErr);

        const { data: vendorRows, error: vendorErr } = await supabase.from("vendors").select("id,name,vendor_code");
        if (vendorErr) console.warn("vendors fetch issue", vendorErr);

        let agentRows: any[] | null = null;
        let agentErr: any = null;
        try {
          const { data, error } = await supabase
            .from("agents")
            .select("id,name,email,agent_code,vendor_id");
          agentRows = data || null;
          agentErr = error || null;
        } catch (e: any) {
          agentErr = e;
        }
        if (agentErr || !agentRows) {
          console.warn("agent fetch issue, falling back to profiles", agentErr);
          const { data, error } = await supabase
            .from("profiles")
            .select("id,name,email,agent_code,agentCode,company_name")
            .not("agent_code", "is", null);
          agentRows = data || null;
          if (error) console.warn("profiles fallback agent fetch issue", error);
        }

        const combined: any[] = [];
        if (appRows) {
          combined.push(...appRows.map(mapRow));
        }
        if (formRows) {
          const existing = new Set(combined.map((row) => row.id));
          formRows
            .map((row: any) =>
              mapRow({
                ...row,
                entity_name: row.data?.entityName || row.data?.businessName,
                finance_amount: row.data?.financeAmount || row.data?.invoiceAmount,
                vendor_name: row.data?.vendorName,
                agent_name: row.data?.agentName,
              })
            )
            .forEach((row) => {
              if (!existing.has(row.id)) combined.push(row);
            });
        }

        combined.sort(
          (a, b) =>
            new Date(b.submittedDate || "").getTime() -
            new Date(a.submittedDate || "").getTime()
        );
        setApplications(combined);
        if (vendorRows) setVendorList(vendorRows);
        if (agentRows) {
          const filteredAgents = (agentRows as any[]).filter(
            (a) => !!(a.agent_code || (a as any)?.agentCode)
          );
          setAgentProfiles(filteredAgents);
        }
      } catch (err) {
        console.error("Failed to load admin data", err);
        alert("Unable to load admin data right now. Please refresh or try again shortly.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openDocument = (app: any) => {
    const url = app?.pdf_url || app?.data?.pdfUrl || app?.data?.contractUrl;
    if (!url) {
      alert("Application documents are not available yet for this record.");
      return;
    }
    window.open(url, "_blank", "noopener");
  };

  const openVendorPreview = () => {
    if (!previewVendorCode) {
      alert("Select a vendor to preview.");
      return;
    }
    const vendor = vendorList.find((v) => v.vendor_code === previewVendorCode) || vendorList.find((v) => v.id === previewVendorCode);
    const vendorId = vendor?.id ? `&previewVendorId=${encodeURIComponent(vendor.id)}` : "";
    const url = `/vendor-dashboard?previewVendorCode=${encodeURIComponent(previewVendorCode)}${vendorId}`;
    window.open(url, "_blank", "noopener");
  };

  const openAgentPreview = () => {
    if (!previewAgentId) {
      alert("Select an agent to preview.");
      return;
    }
    const agent = agentProfiles.find((a) => a.id === previewAgentId);
    const agentCode = agent?.agent_code || agent?.agentCode || "";
    const codeParam = agentCode ? `&previewAgentCode=${encodeURIComponent(agentCode)}` : "";
    const url = `/agent-dashboard?previewAgentId=${encodeURIComponent(previewAgentId)}${codeParam}`;
    window.open(url, "_blank", "noopener");
  };

  // ---------------------------
  // KPI Summary
  // ---------------------------
  const totalApplications = applications.length;
  const totalFinanceValue = applications.reduce((sum, a) => sum + a.loanAmount, 0);
  const totalVendors = vendorList.length;
  const totalAgents = agentProfiles.length;
  const underReviewCount = applications.filter((a) => a.status === "under_review" || a.status === "submitted").length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;
  const settledCount = applications.filter((a) => a.status === "funded" || a.status === "settled").length;
  const declinedCount = applications.filter((a) => a.status === "declined").length;
  const approvalRate = (
    (applications.filter((a) => a.status === "approved").length / Math.max(totalApplications, 1)) * 100
  ).toFixed(1);

  // ---------------------------
  // Derived Tables
  // ---------------------------
  const isWithinTimeWindow = (submittedDate?: string | null) => {
    if (!submittedDate || timeFilter === "all") return true;
    const now = new Date();
    const date = new Date(submittedDate);
    if (Number.isNaN(date.getTime())) return false;
    if (timeFilter === "month") {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
    if (timeFilter === "quarter") {
      const quarter = Math.floor(date.getMonth() / 3);
      const currentQuarter = Math.floor(now.getMonth() / 3);
      return date.getFullYear() === now.getFullYear() && quarter === currentQuarter;
    }
    if (timeFilter === "year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredApps = useMemo(() => {
    let filtered = applications;

    if (statusFilter !== "all") filtered = filtered.filter((a) => a.status === statusFilter);
    if (vendorFilter !== "all") {
      filtered = filtered.filter((a) => {
        const name = (a.vendor || "").toLowerCase();
        const id = String((a as any).vendor_id || "").toLowerCase();
        return name === vendorFilter.toLowerCase() || (id && id === vendorFilter.toLowerCase()) || (!name && vendorFilter.startsWith("vendor-") && !id);
      });
    }
    if (agentFilter !== "all") {
      filtered = filtered.filter((a) => {
        const name = (a.agent || "").toLowerCase();
        const id = String((a as any).agent_id || "").toLowerCase();
        return name === agentFilter.toLowerCase() || (id && id === agentFilter.toLowerCase()) || (!name && agentFilter.startsWith("agent-") && !id);
      });
    }
    if (outstandingOnly) filtered = filtered.filter((a) => !!a.actionRequired);
    filtered = filtered.filter((a) => isWithinTimeWindow(a.submittedDate));

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortBy === "amount") {
      filtered = [...filtered].sort((a, b) => b.loanAmount - a.loanAmount);
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) =>
        a.customerName.localeCompare(b.customerName)
      );
    } else {
      filtered = [...filtered].sort(
        (a, b) =>
          new Date(b.submittedDate).getTime() -
          new Date(a.submittedDate).getTime()
      );
    }

    return filtered;
  }, [applications, statusFilter, vendorFilter, agentFilter, outstandingOnly, timeFilter, searchTerm, sortBy]);

  // Filtered KPI snapshot for summary tiles
  const filteredTotals = useMemo(() => {
    const total = filteredApps.length;
    const value = filteredApps.reduce((sum, a) => sum + a.loanAmount, 0);
    const vendors = new Set(filteredApps.map((a) => a.vendor || "Unassigned")).size;
    const agents = new Set(filteredApps.map((a) => a.agent || "Unassigned")).size;
    const underReview = filteredApps.filter((a) => a.status === "under_review" || a.status === "submitted").length;
    const approved = filteredApps.filter((a) => a.status === "approved").length;
    const settled = filteredApps.filter((a) => a.status === "funded" || a.status === "settled").length;
    const declined = filteredApps.filter((a) => a.status === "declined").length;
    const withdrawn = filteredApps.filter((a) => a.status === "withdrawn").length;
    const approval = ((approved / Math.max(total, 1)) * 100).toFixed(1);
    return { total, value, vendors, agents, underReview, approved, settled, declined, withdrawn, approval };
  }, [filteredApps]);

  const topCards = [
    { label: "Vendors", value: filteredTotals.vendors, bg: "bg-indigo-600" },
    { label: "Agents", value: filteredTotals.agents, bg: "bg-sky-600" },
    { label: "Finance Value", value: currency(filteredTotals.value), bg: "bg-emerald-600" },
    { label: "Approval Rate", value: `${filteredTotals.approval}%`, bg: "bg-teal-600" },
  ];

  const statusCards = [
    { label: "Applications", value: filteredTotals.total, bg: "bg-blue-600" },
    { label: "Under Review", value: filteredTotals.underReview, bg: "bg-amber-500" },
    { label: "Approved", value: filteredTotals.approved, bg: "bg-green-600" },
    { label: "Settled", value: filteredTotals.settled, bg: "bg-emerald-600" },
    { label: "Declined", value: filteredTotals.declined, bg: "bg-rose-500" },
    { label: "Withdrawn", value: filteredTotals.withdrawn, bg: "bg-purple-600" },
  ];

  const vendorPerformance = useMemo(() => {
    const v: Record<string, any> = {};
    filteredApps.forEach((a) => {
      if (!v[a.vendor])
        v[a.vendor] = { name: a.vendor, apps: 0, value: 0, approved: 0 };
      v[a.vendor].apps++;
      v[a.vendor].value += a.loanAmount;
      if (a.status === "approved") v[a.vendor].approved++;
    });
    return Object.values(v).map((x) => ({
      ...x,
      approvalRate: ((x.approved / x.apps) * 100 || 0).toFixed(1),
    }));
  }, [filteredApps]);

  const agentPerformance = useMemo(() => {
    const a: Record<string, any> = {};
    filteredApps.forEach((app) => {
      if (!app.agent || app.agent === "—") return;
      if (!a[app.agent])
        a[app.agent] = { name: app.agent, apps: 0, value: 0, approved: 0 };
      a[app.agent].apps++;
      a[app.agent].value += app.loanAmount;
      if (app.status === "approved") a[app.agent].approved++;
    });
    return Object.values(a).map((x) => ({
      ...x,
      approvalRate: ((x.approved / x.apps) * 100 || 0).toFixed(1),
    }));
  }, [filteredApps]);

  const outstandingTasks = useMemo(() => {
    const map: Record<string, number> = {};
    filteredApps
      .filter((a) => a.actionRequired)
      .forEach((a) => (map[a.vendor] = (map[a.vendor] || 0) + 1));
    return Object.entries(map).map(([vendor, count]) => ({ vendor, count }));
  }, [filteredApps]);

  const monthlyStats = useMemo(() => {
    const buckets: Record<string, { apps: number; approved: number }> = {};
    filteredApps.forEach((app) => {
      if (!app.submittedDate) return;
      const date = new Date(app.submittedDate);
      if (Number.isNaN(date.getTime())) return;
      const key = format(date, "MMM");
      if (!buckets[key]) buckets[key] = { apps: 0, approved: 0 };
      buckets[key].apps += 1;
      if (app.status === "approved") buckets[key].approved += 1;
    });
    return Object.entries(buckets).map(([month, data]) => ({
      month,
      applications: data.apps,
      approvalRate: data.apps ? Math.round((data.approved / data.apps) * 100) : 0,
    }));
  }, [filteredApps]);

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Monitor all vendor and agent performance, and generate reports.
            </p>
          </div>
          <Button
            onClick={() => downloadCSV(filteredApps, "Applications_Report")}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" /> Export Report
          </Button>
        </div>
        {loading && (
          <p className="text-sm text-gray-500 mb-4">
            Syncing latest live data from Supabase...
          </p>
        )}

        {/* Quick navigation */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
            <button
              onClick={() => navigate("/admin/outstanding-tasks")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-indigo-600 text-white shadow"
            >
              Outstanding Tasks
            </button>
            <button
              onClick={() => navigate("/admin/prospects")}
              className="px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center bg-purple-600 text-white hover:bg-purple-700 shadow"
            >
              Prospects
            </button>
          </div>
        </div>

        {/* Preview dashboards (admin only) */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-emerald-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Preview vendor/agent dashboards</p>
              <p className="text-xs text-gray-500">Opens a read-only view in a new tab.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <Select value={previewVendorCode || "none"} onValueChange={(v) => setPreviewVendorCode(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select vendor</SelectItem>
                  {vendorList.map((v) => (
                    <SelectItem key={v.id} value={v.vendor_code || v.id}>
                      {(v.vendor_code ? `${v.vendor_code} - ` : "") + (v.name || v.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={openVendorPreview} className="w-full sm:w-auto">
                Open Vendor Dashboard
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <Select value={previewAgentId || "none"} onValueChange={(v) => setPreviewAgentId(v === "none" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select agent</SelectItem>
                  {agentProfiles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.company_name || a.name || a.email || a.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={openAgentPreview} className="w-full sm:w-auto">
                Open Agent Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-4 grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by customer name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="funded">Settled</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>

          {/* Vendor */}
          <Select value={vendorFilter} onValueChange={(v) => setVendorFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendorList.map((v) => (
                <SelectItem
                  key={v.id}
                  value={toSafeValue(v.name, v.id, `vendor-${v.id || "unknown"}`)}
                >
                  {v.name || v.id || "Unnamed Vendor"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Agent */}
          <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentProfiles.map((a) => (
                <SelectItem
                  key={a.id}
                  value={toSafeValue(a.company_name || a.name, a.id, `agent-${a.id || "unknown"}`)}
                >
                  {a.company_name || a.name || "Unnamed Agent"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 text-amber-600 border-gray-300 rounded"
              checked={outstandingOnly}
              onChange={(e) => setOutstandingOnly(e.target.checked)}
            />
            <span>Outstanding tasks only</span>
          </label>
          <p className="text-xs text-gray-500">
            Filters apply to charts, tables, and exports.
          </p>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {topCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl shadow p-5 text-white ${card.bg}`}
            >
              <p className="text-xs text-white/80 uppercase tracking-[0.12em] font-semibold">{card.label}</p>
              <p className="text-2xl font-bold mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {statusCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl shadow p-4 text-center text-white ${card.bg}`}
            >
              <p className="text-[11px] text-white/80 uppercase tracking-[0.12em] font-semibold">{card.label}</p>
              <p className="text-xl font-bold mt-2">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle>Monthly Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle>Approval Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis domain={[0, 100]} stroke="#6b7280" />
                  <Tooltip />
                  <Line type="monotone" dataKey="approvalRate" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Tasks */}
        <Card className="shadow mb-8">
          <CardHeader>
            <CardTitle>Outstanding Tasks by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingTasks.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={outstandingTasks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendor" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">
                ✅ No outstanding vendor tasks.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vendor and Agent Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Approved %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorPerformance.map((v, i) => (
                    <TableRow
                      key={i}
                      onClick={() => setSelectedVendor(v)}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <TableCell>{v.name}</TableCell>
                      <TableCell>{v.apps}</TableCell>
                      <TableCell>{currency(v.value)}</TableCell>
                      <TableCell>{v.approvalRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                onClick={() =>
                  downloadCSV(vendorPerformance, "Vendor_Report")
                }
                className="mt-3"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-1" /> Export Vendor Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Approved %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentPerformance.map((a, i) => (
                    <TableRow
                      key={i}
                      onClick={() => setSelectedAgent(a)}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.apps}</TableCell>
                      <TableCell>{currency(a.value)}</TableCell>
                      <TableCell>{a.approvalRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                onClick={() => downloadCSV(agentPerformance, "Agent_Report")}
                className="mt-3"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-1" /> Export Agent Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{app.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{app.customerName}</div>
                      <div className="text-sm text-gray-500">
                        {app.customerEmail}
                      </div>
                    </TableCell>
                    <TableCell>{currency(app.loanAmount)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[app.status]}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{app.submittedDate}</TableCell>
                    <TableCell>{app.vendor}</TableCell>
                    <TableCell>{app.agent}</TableCell>
                    <TableCell>
                      {app.pdf_url || app.data?.pdfUrl || app.data?.contractUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => openDocument(app)}
                        >
                          <Eye className="h-4 w-4" />
                          View application
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-500">No documents yet</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Repayments Calculator */}
        <div className="mt-10">
          <Card className="shadow-sm border border-emerald-100">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Calculator className="h-5 w-5 text-emerald-600" />
                Repayments Calculator
              </CardTitle>
              <p className="text-sm text-gray-500">
                Same calculator available to vendor and agent portals.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <RepaymentCalculator variant="embedded" />
            </CardContent>
          </Card>
        </div>

        {/* Vendor Modal */}
        {selectedVendor && (
          <Dialog
            open={!!selectedVendor}
            onOpenChange={() => setSelectedVendor(null)}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Vendor Details: {selectedVendor.name}
                </DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications
                    .filter((a) => a.vendor === selectedVendor.name)
                    .map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>{app.customerName}</TableCell>
                        <TableCell>{currency(app.loanAmount)}</TableCell>
                        <TableCell>{app.status}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <DialogFooter className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadCSV(
                      applications.filter(
                        (a) => a.vendor === selectedVendor.name
                      ),
                      "Vendor_Apps"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button onClick={() => setSelectedVendor(null)}>
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Agent Modal */}
        {selectedAgent && (
          <Dialog
            open={!!selectedAgent}
            onOpenChange={() => setSelectedAgent(null)}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Agent Details: {selectedAgent.name}
                </DialogTitle>
              </DialogHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications
                    .filter((a) => a.agent === selectedAgent.name)
                    .map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>{app.id}</TableCell>
                        <TableCell>{app.customerName}</TableCell>
                        <TableCell>{currency(app.loanAmount)}</TableCell>
                        <TableCell>{app.status}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <DialogFooter className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadCSV(
                      applications.filter(
                        (a) => a.agent === selectedAgent.name
                      ),
                      "Agent_Apps"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button onClick={() => setSelectedAgent(null)}>
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
