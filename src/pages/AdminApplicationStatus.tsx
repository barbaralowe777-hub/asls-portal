import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AppRow = {
  id: string;
  entity_name?: string | null;
  status: string;
  finance_amount?: string | null;
  created_at?: string | null;
  data?: any;
};

const STATUS_CHOICES = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "funded", label: "Settled" },
  { value: "declined", label: "Declined" },
  { value: "withdrawn", label: "Withdrawn" },
];

const AdminApplicationStatus: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [previousStatus, setPreviousStatus] = useState<Record<string, string>>({});
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [editEmails, setEditEmails] = useState({
    lessee: "",
    director1: "",
    director2: "",
    guarantor1: "",
    guarantor2: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const mapRow = (row: any): AppRow => {
      const data = (row.data || {}) as any;
      return {
        id: row.id,
        entity_name: row.entity_name || data.entityName || data.businessName || "",
        status: row.status || data.status || "submitted",
        finance_amount: row.finance_amount ?? data.financeAmount ?? data.invoiceAmount ?? "",
        created_at: row.created_at || data.createdAt || data.created_at || null,
        data,
      };
    };

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: appRows }, { data: formRows }] = await Promise.all([
          supabase
            .from("applications")
            .select("id,entity_name,status,finance_amount,created_at,data")
            .order("created_at", { ascending: false }),
          supabase
            .from("application_forms")
            .select("id,status,created_at,data")
            .order("created_at", { ascending: false }),
        ]);

        const combined: AppRow[] = [];
        if (appRows) combined.push(...(appRows as any[]).map(mapRow));
        if (formRows) {
          const existing = new Set(combined.map((row) => row.id));
          (formRows as any[])
            .map((row: any) =>
              mapRow({
                ...row,
                entity_name: row.data?.entityName || row.data?.businessName,
                finance_amount: row.data?.financeAmount || row.data?.invoiceAmount,
              })
            )
            .forEach((row) => {
              if (!existing.has(row.id)) combined.push(row);
            });
        }

        combined.sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        );
        setApps(combined);
      } catch (err) {
        console.error("Failed to load applications", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = apps;
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          (a.entity_name || "").toLowerCase().includes(q) ||
          (a.data?.businessName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, statusFilter, search]);

  const saveStatus = async (id: string, desired?: string) => {
    setSaveError(null);
    const next = (desired || pending[id])?.trim();
    if (!next) return;
    const current = apps.find((a) => a.id === id)?.status;
    if (next === "declined" || next === "withdrawn") {
      const proceed = window.confirm(
        `You are about to ${next} an application. This may be permanent - are you sure you want to continue?`
      );
      if (!proceed) return;
    }

    let updated = false;
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("admin-update-status", {
        body: { id, status: next },
      });
      if (fnErr || fnData?.error) {
        const msg = fnErr?.message || fnData?.error || "Failed to update status";
        setSaveError(msg);
        alert(msg);
        return;
      }
      updated = true;
    } catch (err: any) {
      console.error("Status update failed", err);
      setSaveError(err?.message || "Failed to update status");
      alert(err?.message || "Failed to update status");
      return;
    }

    if (!updated) return;
    if (current) {
      setPreviousStatus((cur) => ({ ...cur, [id]: current }));
    }
    setApps((cur) => cur.map((a) => (a.id === id ? { ...a, status: next } : a)));
    setPending((cur) => {
      const copy = { ...cur };
      delete copy[id];
      return copy;
    });
  };

  const revertStatus = async (id: string) => {
    const prev = previousStatus[id];
    if (!prev) return;
    await saveStatus(id, prev);
  };

  const formatDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-AU") : "-");

  const validateEmail = (v: string) => {
    const email = v.trim();
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const openEdit = async (id: string) => {
    setEditError(null);
    setEditMessage(null);
    setEditLoading(true);
    setEditAppId(id);
    try {
      const { data, error } = await supabase
        .from("application_forms")
        .select("data")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const payload = (data?.data as any) || {};
      setEditData(payload);
      setEditEmails({
        lessee: payload.email || "",
        director1: payload.directors?.[0]?.email || "",
        director2: payload.directors?.[1]?.email || "",
        guarantor1: payload.guarantors?.[0]?.email || "",
        guarantor2: payload.guarantors?.[1]?.email || "",
      });
    } catch (err: any) {
      console.error("Failed to load application form", err);
      setEditError(err?.message || "Unable to load application data");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditAppId(null);
    setEditData(null);
    setEditMessage(null);
    setEditError(null);
  };

  const saveAndMaybeResend = async (resend: boolean) => {
    if (!editAppId || !editData) return;
    setEditError(null);
    setEditMessage(null);

    const fields = editEmails;
    const invalid = Object.entries(fields).find(([key, v]) => v.trim() && !validateEmail(v));
    if (invalid) {
      setEditError(`Please enter a valid email for ${invalid[0]}.`);
      return;
    }

    setResendLoading(true);
    try {
      const updated = { ...editData };
      updated.email = fields.lessee.trim() || null;
      if (!Array.isArray(updated.directors)) updated.directors = [];
      if (!Array.isArray(updated.guarantors)) updated.guarantors = [];
      updated.directors[0] = { ...(updated.directors[0] || {}), email: fields.director1.trim() || null };
      updated.directors[1] = { ...(updated.directors[1] || {}), email: fields.director2.trim() || null };
      updated.guarantors[0] = { ...(updated.guarantors[0] || {}), email: fields.guarantor1.trim() || null };
      updated.guarantors[1] = { ...(updated.guarantors[1] || {}), email: fields.guarantor2.trim() || null };

      const { error: updateErr } = await supabase
        .from("application_forms")
        .update({ data: updated })
        .eq("id", editAppId);
      if (updateErr) throw updateErr;

      const { error: appUpdateErr } = await supabase
        .from("applications")
        .update({
          data: updated,
          entity_name: updated.entityName || updated.businessName || updated.companyName || null,
        })
        .eq("id", editAppId);
      if (appUpdateErr) {
        console.warn("Updated application_forms but failed to sync applications", appUpdateErr);
      }
      setApps((cur) =>
        cur.map((a) =>
          a.id === editAppId
            ? {
                ...a,
                data: updated,
                entity_name:
                  updated.entityName || updated.businessName || updated.companyName || a.entity_name,
              }
            : a
        )
      );

      if (resend) {
        const { error: fnErr } = await supabase.functions.invoke("create-envelope", {
          body: { applicationId: editAppId },
        });
        if (fnErr) throw fnErr;
        setEditMessage("Saved and resent DocuSign successfully.");
      } else {
        setEditMessage("Saved successfully.");
      }
    } catch (err: any) {
      console.error("Save/resend failed", err);
      setEditError(err?.message || "Failed to save or resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

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

        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Status Updates</h1>
              <p className="text-gray-600 text-sm">Search, view, and update application statuses.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
                Back to Dashboard
              </Button>
              <Button onClick={() => navigate("/application-form")} className="bg-[#1dad21] hover:bg-green-700">
                + New Application
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              {STATUS_CHOICES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Search by ID or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-sm"
            />
          </div>
          {saveError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {saveError}
            </div>
          )}

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Vendor</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-left">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(loading ? [] : filtered).map((a) => {
                  const data = (a.data || {}) as any;
                  const customer = a.entity_name || data.entityName || data.businessName || "Unknown";
                  const customerEmail = data.customerEmail || "";
                  const vendorName = data.vendorName || data.vendor || "Unassigned";
                  const agentName =
                    [data.agentFirstName, data.agentLastName].filter(Boolean).join(" ").trim() ||
                    data.agentName ||
                    "-";
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono">{a.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{customer}</div>
                        {customerEmail && <div className="text-xs text-gray-500">{customerEmail}</div>}
                      </td>
                      <td className="px-4 py-3">{a.finance_amount || data.financeAmount || "-"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(a.created_at)}</td>
                      <td className="px-4 py-3">{vendorName}</td>
                      <td className="px-4 py-3">{agentName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={pending[a.id] ?? ""}
                            onChange={(e) => setPending({ ...pending, [a.id]: e.target.value })}
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Select status</option>
                            {STATUS_CHOICES.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!pending[a.id]}
                            onClick={() => saveStatus(a.id)}
                            className={`text-xs px-3 py-1 ${
                              pending[a.id]
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            Update
                          </Button>
                          {previousStatus[a.id] && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => revertStatus(a.id)}
                              className="text-xs px-3 py-1"
                            >
                              Revert
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(a.id)}
                            className="text-xs px-3 py-1"
                          >
                            Edit emails / resend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={8}>
                      No applications found.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 relative">
            <button
              onClick={closeEdit}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-lg"
              aria-label="Close"
            >
              ×
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit recipient emails</h2>
              <p className="text-sm text-gray-600">
                Application ID: <span className="font-mono">{editAppId}</span>
              </p>
            </div>

            {editLoading ? (
              <div className="text-gray-600">Loading...</div>
            ) : editError && !editData ? (
              <div className="text-red-600 text-sm">{editError}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "lessee", label: "Lessee email" },
                  { key: "director1", label: "Director 1 email" },
                  { key: "director2", label: "Director 2 email" },
                  { key: "guarantor1", label: "Guarantor 1 email" },
                  { key: "guarantor2", label: "Guarantor 2 email" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">{field.label}</label>
                    <Input
                      type="email"
                      value={(editEmails as any)[field.key]}
                      onChange={(e) =>
                        setEditEmails((cur) => ({ ...cur, [field.key]: e.target.value }))
                      }
                      placeholder="name@example.com"
                    />
                  </div>
                ))}
              </div>
            )}

            {editMessage && <div className="text-green-700 text-sm">{editMessage}</div>}
            {editError && editData && <div className="text-red-600 text-sm">{editError}</div>}

            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button
                onClick={() => saveAndMaybeResend(false)}
                disabled={resendLoading || editLoading}
                variant="secondary"
              >
                Save only
              </Button>
              <Button
                onClick={() => saveAndMaybeResend(true)}
                disabled={resendLoading || editLoading}
              >
                {resendLoading ? "Saving..." : "Save & Resend DocuSign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplicationStatus;
