import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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
import { Search, Send, RefreshCw, CheckCircle } from "lucide-react";

type Prospect = {
  id: string;
  contact_name: string;
  business_name: string;
  phone: string;
  email: string;
  status: "sent" | "onboarded";
  last_sent_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const AdminProspects: React.FC = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    contact_name: "",
    business_name: "",
    phone: "",
    email: "",
  });

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProspects((data as Prospect[]) || []);
    } catch (err) {
      console.error("Failed to load prospects", err);
      setMessage("Unable to load prospects. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const filteredProspects = useMemo(() => {
    if (!search) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p) =>
        (p.contact_name || "").toLowerCase().includes(q) ||
        (p.business_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
  }, [prospects, search]);

  const resetForm = () =>
    setForm({ contact_name: "", business_name: "", phone: "", email: "" });

  const sendInvite = async () => {
    setMessage(null);
    if (!form.contact_name || !form.business_name || !form.email) {
      setMessage("Contact name, business name, and email are required.");
      return;
    }
    setSending(true);
    try {
      // 1) Send email via Edge Function (needs to exist in Supabase)
      try {
        await supabase.functions.invoke("prospect_invite", {
          body: {
            contact_name: form.contact_name,
            business_name: form.business_name,
            phone: form.phone,
            email: form.email,
          },
        });
      } catch (fnErr: any) {
        console.warn("Invite function failed", fnErr);
        setMessage("Invite recorded, but email may not have been sent. Please verify.");
      }

      // 2) Upsert prospect record
      const { error: upsertErr } = await supabase.from("prospects").upsert({
        contact_name: form.contact_name,
        business_name: form.business_name,
        phone: form.phone || null,
        email: form.email.toLowerCase(),
        status: "sent",
        last_sent_at: new Date().toISOString(),
      });
      if (upsertErr) throw upsertErr;

      setMessage("Prospect invite sent.");
      resetForm();
      fetchProspects();
    } catch (err) {
      console.error("Failed to send prospect invite", err);
      setMessage("Failed to send invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const markOnboarded = async (id: string) => {
    setMessage(null);
    try {
      const { error } = await supabase
        .from("prospects")
        .update({ status: "onboarded", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "onboarded" } : p))
      );
    } catch (err) {
      console.error("Failed to update status", err);
      setMessage("Failed to update status.");
    }
  };

  const resendInvite = async (id: string, email: string) => {
    setMessage(null);
    try {
      await supabase.functions.invoke("prospect_invite", {
        body: { contact_name: "", business_name: "", phone: "", email },
      });
    } catch (err) {
      console.warn("Resend function failed", err);
      setMessage("Resend attempted; verify email delivery.");
    }

    try {
      const { error } = await supabase
        .from("prospects")
        .update({ last_sent_at: new Date().toISOString(), status: "sent" })
        .eq("id", id);
      if (error) throw error;
      setProspects((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, last_sent_at: new Date().toISOString(), status: "sent" }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to update resend timestamp", err);
      setMessage("Failed to update resend status.");
    }
  };

  const canResend = (_p: Prospect) => {
    // Always allow manual resend
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prospects</h1>
            <p className="text-gray-600 mt-1">Send vendor invites and track follow-up.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3">
            {message}
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Send Prospect Invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Contact name"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
              <Input
                placeholder="Business name"
                value={form.business_name}
                onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={sendInvite} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send invite"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prospects List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, business, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.map((p) => {
                    const allowResend = canResend(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.contact_name}</TableCell>
                        <TableCell>{p.business_name}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.phone}</TableCell>
                        <TableCell className="capitalize">
                          <span
                            className={
                              p.status === "onboarded"
                                ? "text-green-700 font-semibold"
                                : "text-gray-700"
                            }
                          >
                            {p.status || "sent"}
                          </span>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markOnboarded(p.id)}
                            disabled={p.status === "onboarded"}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Onboarded
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resendInvite(p.id, p.email)}
                            disabled={!allowResend}
                            title={allowResend ? "Resend invite" : "Resend invite"}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Resend
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filteredProspects.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        {loading ? "Loading..." : "No prospects yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProspects;
