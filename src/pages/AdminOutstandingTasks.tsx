import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UploadCloud } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

type AppRow = {
  id: string;
  entity_name?: string | null;
  status: string;
  created_at?: string | null;
  vendor_id?: string | null;
  agent_id?: string | null;
  vendor_name?: string | null;
  agent_name?: string | null;
  data?: any;
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

const AdminOutstandingTasks: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [vendorList, setVendorList] = useState<{ id: string; name: string; vendor_code?: string | null }[]>([]);
  const [agentProfiles, setAgentProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadType, setUploadType] = useState<Record<string, string>>({});

  useEffect(() => {
    const mapRow = (row: any): AppRow => {
      const data = (row.data || {}) as any;
      return {
        id: row.id,
        entity_name: row.entity_name || data.entityName || data.businessName || "",
        status: row.status || data.status || "submitted",
        created_at: row.created_at || data.createdAt || data.created_at || null,
        vendor_id: row.vendor_id || data.vendorUuid || data.vendorId || null,
        agent_id: row.agent_id || data.agentId || null,
        vendor_name: row.vendor_name || data.vendorName || null,
        agent_name: row.agent_name || data.agentName || null,
        data,
      };
    };

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: appRows }, { data: formRows }, { data: vendorRows }, { data: agentRows }] =
          await Promise.all([
            supabase
              .from("applications")
              .select("id,entity_name,status,created_at,data,vendor_name,agent_name,vendor_id,agent_id"),
            supabase.from("application_forms").select("id,status,created_at,data"),
            supabase.from("vendors").select("id,name,vendor_code"),
            supabase.from("profiles").select("*"),
          ]);

        const combined: AppRow[] = [];
        if (appRows) combined.push(...(appRows as any[]).map(mapRow));
        if (formRows) {
          const existing = new Set(combined.map((r) => r.id));
          (formRows as any[])
            .map((row: any) =>
              mapRow({
                ...row,
                entity_name: row.data?.entityName || row.data?.businessName,
                vendor_name: row.data?.vendorName,
                agent_name: row.data?.agentName,
              })
            )
            .forEach((r) => {
              if (!existing.has(r.id)) combined.push(r);
            });
        }
        combined.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        );
        setApplications(combined);
        if (vendorRows) setVendorList(vendorRows);
        if (agentRows) {
          const filteredAgents = (agentRows as any[]).filter(
            (a) => !!a.agent_code || !!a.agentCode
          );
          setAgentProfiles(filteredAgents);
        }
      } catch (err) {
        console.error("Failed to load outstanding tasks", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const computeTasks = (row: AppRow) => {
    const d = row.data || {};
    const files = (d.files || {}) as Record<string, any>;
    const has = (key: string) => {
      const v = files[key];
      if (!v) return false;
      if (Array.isArray(v)) return v.length > 0;
      return true;
    };
    const tasks: string[] = [];

    (d.directors || []).forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`director_${n}_licence_front`) && !d.directors?.[idx]?.licenceFrontUrl)
        tasks.push(`Upload Director ${n} licence (front)`);
      if (!has(`director_${n}_licence_back`) && !d.directors?.[idx]?.licenceBackUrl)
        tasks.push(`Upload Director ${n} licence (back)`);
      if (!has(`director_${n}_medicare_front`) && !d.directors?.[idx]?.medicareFrontUrl)
        tasks.push(`Upload Director ${n} Medicare (front)`);
    });

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

    return tasks;
  };

  const filteredApps = useMemo(() => {
    let list = applications.map((a) => ({ ...a, tasks: computeTasks(a) }));
    list = list.filter((a) => a.tasks.length > 0);
    if (vendorFilter !== "all") {
      list = list.filter(
        (a) =>
          a.vendor_id === vendorFilter ||
          a.vendor_name?.toLowerCase() === vendorFilter.toLowerCase()
      );
    }
    if (agentFilter !== "all") {
      list = list.filter(
        (a) =>
          a.agent_id === agentFilter ||
          a.agent_name?.toLowerCase() === agentFilter.toLowerCase()
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          (a.entity_name || "").toLowerCase().includes(q) ||
          (a.data?.businessName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, vendorFilter, agentFilter, searchTerm]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const TaskChips = ({
    tasks,
    appId,
  }: {
    tasks: string[];
    appId: string;
  }) => {
    const isExpanded = !!expanded[appId];
    const limit = 3;
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
            onClick={() => setExpanded((cur) => ({ ...cur, [appId]: true }))}
            className="inline-flex items-center rounded-full bg-red-50 text-red-700 px-2 py-1 text-xs font-semibold hover:bg-red-100"
          >
            +{remaining} more
          </button>
        )}
        {isExpanded && tasks.length > limit && (
          <button
            type="button"
            onClick={() => setExpanded((cur) => ({ ...cur, [appId]: false }))}
            className="inline-flex items-center rounded-full bg-gray-50 text-gray-600 px-2 py-1 text-xs font-semibold hover:bg-gray-100"
          >
            Show less
          </button>
        )}
      </div>
    );
  };

  const uploadDoc = async (app: AppRow, file: File, docType: string) => {
    setUploading((cur) => ({ ...cur, [app.id]: true }));
    try {
      const safeName = (file.name || "upload").replace(/[^a-z0-9.\-_]/gi, "_").slice(0, 80);
      const path = `applications/${app.id}/support_${docType}_${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
      const url = urlData?.publicUrl;
      if (!url) throw new Error("Could not get uploaded file URL");

      const existingData = app.data || {};
      const prevFiles: any = existingData.files || {};
      const list: string[] = Array.isArray(prevFiles[docType]) ? prevFiles[docType] : [];
      const files = { ...prevFiles, [docType]: [...list, url] };
      const newData = { ...existingData, files };

      // Update application_forms (primary source for tasks)
      const { error: formErr } = await supabase
        .from("application_forms")
        .update({ data: newData })
        .eq("id", app.id);
      if (formErr) throw formErr;

      // Best effort: update applications data as well (some dashboards use it)
      await supabase.from("applications").update({ data: newData }).eq("id", app.id);

      setApplications((cur) =>
        cur.map((a) => (a.id === app.id ? { ...a, data: newData } : a))
      );
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed; please try again.");
    } finally {
      setUploading((cur) => ({ ...cur, [app.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Outstanding Tasks</h1>
            <p className="text-gray-600 text-sm">
              View outstanding tasks across all applications. Upload documents to resolve items.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by customer, business, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={vendorFilter} onValueChange={(v) => setVendorFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendorList.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {(v.vendor_code ? `${v.vendor_code} - ` : "") + (v.name || v.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={agentFilter} onValueChange={(v) => setAgentFilter(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agentProfiles.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name || a.email || a.company_name || a.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="divide-y divide-gray-100">
            {(!loading ? filteredApps : []).map((a) => (
              <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50">
                <div className="md:w-1/4 space-y-1">
                  <div className="font-mono text-sm text-gray-700">{a.id}</div>
                  <div className="font-semibold text-gray-900">
                    {a.entity_name || a.data?.entityName || a.data?.businessName || "Unknown"}
                  </div>
                  {a.data?.customerEmail && (
                    <div className="text-xs text-gray-500">{a.data.customerEmail}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    Vendor: {a.vendor_name || "Unassigned"} • Agent: {a.agent_name || "Unassigned"}
                  </div>
                  <div className="text-xs text-gray-500">
                    Submitted: {a.created_at ? new Date(a.created_at).toLocaleDateString("en-AU") : "-"}
                  </div>
                </div>

                <div className="md:w-1/6">
                  <StatusBadge status={a.status as any} />
                </div>

                <div className="md:w-1/3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      {computeTasks(a).length}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Outstanding tasks</span>
                  </div>
                  <TaskChips tasks={computeTasks(a)} appId={a.id} />
                </div>

                <div className="md:w-1/4">
                  <div className="flex flex-col gap-2">
                    <Select
                      value={uploadType[a.id] || "other"}
                      onValueChange={(v) => setUploadType({ ...uploadType, [a.id]: v })}
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
                          const docType = uploadType[a.id] || "other";
                          uploadDoc(a, file, docType);
                          e.target.value = "";
                        }}
                      />
                      {uploading[a.id] ? "Uploading..." : "Upload & mark complete"}
                    </label>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredApps.length === 0 && (
              <div className="p-6 text-center text-gray-500">No outstanding tasks.</div>
            )}
            {loading && <div className="p-6 text-center text-gray-500">Loading...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOutstandingTasks;
