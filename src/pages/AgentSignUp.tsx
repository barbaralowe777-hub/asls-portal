import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AgentSignUp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    vendorCode: "",
    vendorName: "",
    vendorAddress: "",
    vendorPhone: "",
    vendorEmail: "",
    vendorAbn: "",
  });

  const [vendorLookupLoading, setVendorLookupLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "vendorCode" ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const normalizeAbn = (value?: string | null) => {
    if (!value) return null;
    const digits = value.replace(/\D/g, "");
    return digits || null;
  };

  const fetchNextVendorCode = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("vendor_code")
      .not("vendor_code", "is", null)
      .order("vendor_code", { ascending: false })
      .limit(1);
    if (error) throw error;
    const last = data?.[0]?.vendor_code;
    const lastNumber = last ? parseInt(String(last).replace(/\D/g, ""), 10) : 0;
    const nextNumber = lastNumber ? lastNumber + 1 : 101;
    return `V${String(nextNumber).padStart(5, "0")}`;
  };

  const findVendorByCode = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    const { data, error } = await supabase
      .from("vendors")
      .select("id,name,vendor_code,contact_email,vendor_phone,abn,metadata,vendor_address")
      .ilike("vendor_code", normalized)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const createVendor = async () => {
    const vendor_code = await fetchNextVendorCode();
    const { data, error } = await supabase
      .from("vendors")
      .insert({
        name: form.vendorName || `${form.firstName} ${form.lastName}`.trim(),
        vendor_code,
        contact_name: `${form.firstName} ${form.lastName}`.trim(),
        contact_email: form.vendorEmail || form.email,
        vendor_phone: form.vendorPhone || form.phone,
        status: "pending",
        abn: normalizeAbn(form.vendorAbn),
        metadata: {
          address: form.vendorAddress || "",
          phone: form.vendorPhone || "",
        },
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  useEffect(() => {
    const code = form.vendorCode.trim();
    if (!code) {
      setExistingVendor(null);
      return;
    }

    let isActive = true;
    setVendorLookupLoading(true);

    findVendorByCode(code)
      .then((vendor) => {
        if (!isActive || !vendor) return;
        setExistingVendor(vendor);
        const meta: any = vendor.metadata || {};
        setForm((prev) => ({
          ...prev,
          vendorCode: vendor.vendor_code || prev.vendorCode,
          vendorName: vendor.name || prev.vendorName,
          vendorEmail: vendor.contact_email || prev.vendorEmail,
          vendorPhone: vendor.vendor_phone || prev.vendorPhone,
          vendorAbn: vendor.abn || prev.vendorAbn,
          vendorAddress: meta.address || (vendor as any).vendor_address || prev.vendorAddress,
        }));
      })
      .catch((err) => {
        console.error("Vendor lookup failed", err);
        setExistingVendor(null);
      })
      .finally(() => {
        if (isActive) setVendorLookupLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [form.vendorCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      // Find or create vendor
      let vendor = null;
      if (form.vendorCode.trim()) {
        vendor = existingVendor || (await findVendorByCode(form.vendorCode));
        if (!vendor) {
          throw new Error("Vendor code not found. Please provide vendor details to create one.");
        }
      } else {
        vendor = await createVendor();
      }
      if (!vendor?.id) throw new Error("Vendor lookup/creation failed.");

      const agentCode = `AG-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const agentName = `${form.firstName} ${form.lastName}`.trim();

      const { data: agentRow, error: agentErr } = await supabase
        .from("agents")
        .insert([
          {
            vendor_id: vendor.id,
            name: agentName,
            email: form.email,
            phone: form.phone || null,
            status: "active",
            agent_code: agentCode,
          },
        ])
        .select()
        .single();
      if (agentErr) throw agentErr;

      try {
        await supabase.functions.invoke("agent-invite", {
          body: {
            agent_id: agentRow.id,
            vendor_id: vendor.id,
            name: agentName,
            email: form.email,
          },
        });
        setMessage(
          `Thanks! Agent recorded and invite sent. Vendor: ${vendor.vendor_code || vendor.name}. Agent code: ${agentCode}`
        );
      } catch (fnErr: any) {
        console.error("Agent invite failed", fnErr);
        setMessage(
          `Agent recorded. Invite may not have been sent. Vendor: ${vendor.vendor_code || vendor.name}. Agent code: ${agentCode}`
        );
      }

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        vendorCode: "",
        vendorName: "",
        vendorAddress: "",
        vendorPhone: "",
        vendorEmail: "",
        vendorAbn: "",
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl p-6 sm:p-10 border-t-4 border-green-600">
        <div className="text-center mb-8">
          <img src="/ASLS-logo.png" alt="ASLS" className="mx-auto w-40 sm:w-56 mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Solar Agent Intake Form</h1>
          <p className="text-gray-500 mt-2">Provide your details to access the ASLS Agent Portal.</p>
        </div>

        {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
        {message && <div className="bg-green-100 text-green-800 px-4 py-2 rounded mb-4">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700">First Name*</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Last Name*</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Email*</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Phone*</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700">Vendor Code (if known)</label>
              <input
                type="text"
                name="vendorCode"
                value={form.vendorCode}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Vendor ABN</label>
              <input
                type="text"
                name="vendorAbn"
                value={form.vendorAbn}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Vendor Name</label>
              <input
                type="text"
                name="vendorName"
                value={form.vendorName}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Vendor Email</label>
              <input
                type="email"
                name="vendorEmail"
                value={form.vendorEmail}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Vendor Phone</label>
              <input
                type="tel"
                name="vendorPhone"
                value={form.vendorPhone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-gray-700">Vendor Address</label>
              <input
                type="text"
                name="vendorAddress"
                value={form.vendorAddress}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              By submitting, you agree to our terms and acknowledge emails may be sent for portal access.
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentSignUp;
