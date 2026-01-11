import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VendorRow = {
  id: string;
  name?: string | null;
  vendor_code?: string | null;
  accredited_number?: string | null;
  agreement_url?: string | null;
  accredited_at?: string | null;
};

const AdminVendorAccreditation: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [accreditedNumber, setAccreditedNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id,name,vendor_code,accredited_number,agreement_url,accredited_at")
        .order("name");
      setVendors((data as VendorRow[]) || []);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = vendors.length;
    const withAcc = vendors.filter((v) => !!v.accredited_number).length;
    const withoutAcc = total - withAcc;
    return { total, withAcc, withoutAcc };
  }, [vendors]);

  const filtered = useMemo(() => {
    let list = vendors;
    if (showMissingOnly) list = list.filter((v) => !v.accredited_number);
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (v) => v.id.toLowerCase().includes(q) || (v.name || "").toLowerCase().includes(q)
    );
  }, [vendors, search, showMissingOnly]);

  const handleUpload = async (file: File) => {
    if (!selected) return;
    setUploading(true);
    try {
      const path = `vendors/${selected.id}/agreement_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      const agreement_url = data?.publicUrl;
      await supabase.from("vendors").update({ agreement_url }).eq("id", selected.id);
      const updated = { ...selected, agreement_url };
      setSelected(updated);
      setVendors((cur) => cur.map((v) => (v.id === selected.id ? updated : v)));
      alert("Agreement uploaded");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveAccreditedNumber = async () => {
    if (!selected) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("vendors")
      .update({
        accredited_number: accreditedNumber,
        accredited_at: nowIso,
      })
      .eq("id", selected.id);
    if (error) {
      alert("Failed to save");
      return;
    }
    const updated = { ...selected, accredited_number: accreditedNumber, accredited_at: nowIso };
    setSelected(updated);
    setVendors((cur) => cur.map((v) => (v.id === selected.id ? updated : v)));
    alert("Saved");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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

        <div className="bg-white rounded-lg shadow p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendors &amp; Accreditations</h1>
              <p className="text-gray-600 text-sm">
                Track vendor codes, accreditation numbers, and agreements.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-800">
            <div className="rounded-lg border bg-indigo-50 text-indigo-800 p-3 flex flex-col">
              <span className="text-xs uppercase font-semibold">Total vendors</span>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
            <div className="rounded-lg border bg-green-50 text-green-800 p-3 flex flex-col">
              <span className="text-xs uppercase font-semibold">Accredited</span>
              <span className="text-xl font-bold">{stats.withAcc}</span>
            </div>
            <div className="rounded-lg border bg-amber-50 text-amber-800 p-3 flex flex-col">
              <span className="text-xs uppercase font-semibold">Missing</span>
              <span className="text-xl font-bold">{stats.withoutAcc}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search vendor by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 text-amber-600 border-gray-300 rounded"
                checked={showMissingOnly}
                onChange={(e) => setShowMissingOnly(e.target.checked)}
              />
              <span>Missing accreditation only</span>
            </label>
          </div>

          <div className="bg-gray-50 border rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Vendor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Code</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Accreditation</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Agreement</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((v) => (
                    <tr key={v.id} className={selected?.id === v.id ? "bg-white" : ""}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{v.name || "Unnamed Vendor"}</div>
                        <div className="text-xs text-gray-600">ID: {v.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800 font-semibold">
                          {v.vendor_code ? v.vendor_code.toUpperCase() : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.accredited_number ? (
                          <StatusBadge status="success" label={v.accredited_number} />
                        ) : (
                          <span className="text-amber-600 font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.agreement_url ? (
                          <a
                            href={v.agreement_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-500">Not on file</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(v);
                            setAccreditedNumber(v.accredited_number || "");
                          }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td className="px-4 py-4 text-sm text-gray-500" colSpan={5}>
                        No vendors found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selected && (
          <div className="bg-white rounded-lg shadow p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Selected vendor</p>
                <h2 className="text-xl font-semibold text-gray-900">{selected.name || "Unnamed Vendor"}</h2>
                <p className="text-xs text-gray-500">
                  ID: {selected.id} {selected.vendor_code ? `• Code: ${selected.vendor_code}` : ""}
                </p>
              </div>
              {selected.accredited_number && (
                <div className="text-right text-sm text-gray-700">
                  <p className="font-semibold">Accreditation #: {selected.accredited_number}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800">Agreement</p>
                <p className="text-xs text-gray-600">
                  {selected.agreement_url ? (
                    <a
                      href={selected.agreement_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      View current agreement
                    </a>
                  ) : (
                    "No agreement on file (upload recommended but not mandatory)."
                  )}
                </p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                  disabled={uploading}
                  className="text-sm"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800">Accreditation Number</p>
                <Input
                  type="text"
                  value={accreditedNumber}
                  onChange={(e) => setAccreditedNumber(e.target.value)}
                  className="text-sm w-full"
                  placeholder="Enter accreditation number"
                />
                <Button onClick={saveAccreditedNumber} className="w-fit">
                  Save Accreditation
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVendorAccreditation;
