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

const AdminAgents: React.FC = () => {
  const navigate = useNavigate();
  const [vendorList, setVendorList] = useState<
    { id: string; name: string; vendor_code?: string | null; accredited_number?: string | null }[]
  >([]);
  const [adminAgentInvite, setAdminAgentInvite] = useState({
    name: "",
    email: "",
    vendorId: "",
    vendorAgentNumber: "",
    phone: "",
  });
  const [adminAgentMessage, setAdminAgentMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [{ data: vendors }, { data: agentsData }] = await Promise.all([
        supabase.from("vendors").select("id,name,vendor_code,accredited_number").order("name"),
        supabase.from("agents").select("id,name,email,phone,agent_code,vendor_id,status").order("name"),
      ]);
      setVendorList((vendors as any[]) || []);
      setAgents((agentsData as any[]) || []);
    };
    loadData();
  }, []);

  const vendorLabel = (vendorId?: string | null) => {
    const v = vendorList.find((x) => x.id === vendorId);
    if (!v) return vendorId || "Unassigned";
    const code = v.vendor_code ? v.vendor_code.toUpperCase() : "";
    const acc = v.accredited_number ? v.accredited_number.toUpperCase() : "";
    const labelCode = code || acc;
    return labelCode ? `${labelCode} - ${v.name || v.id}` : v.name || v.id;
  };

  const filteredAgents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter((a) => {
      const vendorName = vendorLabel(a.vendor_id).toLowerCase();
      return (
        (a.name || "").toLowerCase().includes(term) ||
        (a.email || "").toLowerCase().includes(term) ||
        (a.agent_code || "").toLowerCase().includes(term) ||
        vendorName.includes(term)
      );
    });
  }, [agents, searchTerm, vendorList]);

  const handleAdminInviteAgent = async () => {
    if (!adminAgentInvite.vendorId) {
      setAdminAgentMessage("Please select a vendor.");
      return;
    }
    if (!adminAgentInvite.name || !adminAgentInvite.email) {
      setAdminAgentMessage("Agent full name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const vendorName = vendorList.find((v) => v.id === adminAgentInvite.vendorId)?.name || "";
      const agentCode =
        adminAgentInvite.vendorAgentNumber.trim() ||
        `AG-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      const { data: agentRow, error } = await supabase
        .from("agents")
        .insert([
          {
            vendor_id: adminAgentInvite.vendorId,
            name: adminAgentInvite.name,
            email: adminAgentInvite.email,
            phone: adminAgentInvite.phone || null,
            status: "active",
            agent_code: agentCode,
          },
        ])
        .select()
        .single();
      if (error) throw error;

      if (agentRow?.id) {
        try {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("agent-invite", {
            body: {
              agent_id: agentRow.id,
              vendor_id: adminAgentInvite.vendorId,
              name: adminAgentInvite.name,
              email: adminAgentInvite.email,
            },
          });
          if (fnError || (fnData as any)?.error) {
            const inviteErr = fnError || (fnData as any).error;
            throw new Error(
              typeof inviteErr === "string" ? inviteErr : inviteErr?.message || "Invite function failed"
            );
          }
          setAdminAgentMessage(
            `Agent recorded and invite sent. Vendor: ${vendorName || adminAgentInvite.vendorId}. Agent code: ${agentCode}`
          );
        } catch (fnErr: any) {
          console.error("Invite function failed", fnErr);
          setAdminAgentMessage(
            `Agent recorded; invite email may not have been sent. Vendor: ${vendorName || adminAgentInvite.vendorId}. Agent code: ${agentCode}`
          );
        }
      }

      setAdminAgentInvite({
        name: "",
        email: "",
        vendorId: "",
        vendorAgentNumber: "",
        phone: "",
      });
      // refresh list
      const { data: agentsData } = await supabase
        .from("agents")
        .select("id,name,email,phone,agent_code,vendor_id,status")
        .order("name");
      setAgents((agentsData as any[]) || []);
    } catch (err: any) {
      console.error("Admin agent invite failed", err);
      setAdminAgentMessage("Failed to register agent. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAgent) return;
    setEditSaving(true);
    try {
      const { id, name, email, phone, agent_code, vendor_id, status } = editingAgent;
      const { error } = await supabase
        .from("agents")
        .update({ name, email, phone, agent_code, vendor_id, status })
        .eq("id", id);
      if (error) throw error;
      setAgents((list) =>
        list.map((a) => (a.id === id ? { ...a, name, email, agent_code, vendor_id, status } : a))
      );
      setEditingAgent(null);
      setAdminAgentMessage("Agent updated.");
    } catch (err) {
      console.error(err);
      setAdminAgentMessage("Failed to update agent.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Agent (Admin)</h1>
              <p className="text-gray-600">Create an agent, link them to a vendor, and send the invite.</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin-dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              value={adminAgentInvite.vendorId || "none"}
              onValueChange={(v) => {
                const pickedId = v === "none" ? "" : v;
                setAdminAgentInvite({
                  ...adminAgentInvite,
                  vendorId: pickedId,
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select vendor</SelectItem>
                {vendorList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {vendorLabel(v.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={vendorList.find((v) => v.id === adminAgentInvite.vendorId)?.name || ""}
              placeholder="Vendor name (auto)"
              disabled
            />
            <Input
              placeholder="Agent full name"
              value={adminAgentInvite.name}
              onChange={(e) => setAdminAgentInvite({ ...adminAgentInvite, name: e.target.value })}
            />
            <Input
              placeholder="Agent email"
              type="email"
              value={adminAgentInvite.email}
              onChange={(e) => setAdminAgentInvite({ ...adminAgentInvite, email: e.target.value })}
            />
            <Input
              placeholder="Mobile phone"
              type="tel"
              value={adminAgentInvite.phone}
              onChange={(e) => setAdminAgentInvite({ ...adminAgentInvite, phone: e.target.value })}
            />
            <Input
              placeholder="Vendor agent number (optional)"
              value={adminAgentInvite.vendorAgentNumber}
              onChange={(e) =>
                setAdminAgentInvite({ ...adminAgentInvite, vendorAgentNumber: e.target.value })
              }
              className="lg:col-span-2"
            />
            <Button
              className="bg-[#1dad21] hover:bg-green-700"
              onClick={handleAdminInviteAgent}
              disabled={saving}
            >
              {saving ? "Sending..." : "Send Invite"}
            </Button>
          </div>
          {adminAgentMessage && (
            <p className="mt-3 text-sm text-gray-700">{adminAgentMessage}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Agents</h2>
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by agent name, email, vendor or code..."
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Agent</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Code</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Vendor</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAgents.map((agent) => {
                  const isEditing = editingAgent?.id === agent.id;
                  const vendorName = vendorLabel(agent.vendor_id);
                  if (isEditing) {
                    return (
                      <tr key={agent.id} className="bg-gray-50">
                        <td className="px-4 py-2">
                          <Input
                            value={editingAgent.name || ""}
                            onChange={(e) =>
                              setEditingAgent({ ...editingAgent, name: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={editingAgent.email || ""}
                            onChange={(e) =>
                              setEditingAgent({ ...editingAgent, email: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={editingAgent.phone || ""}
                            onChange={(e) =>
                              setEditingAgent({ ...editingAgent, phone: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={editingAgent.agent_code || ""}
                            onChange={(e) =>
                              setEditingAgent({ ...editingAgent, agent_code: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={editingAgent.vendor_id || "none"}
                            onValueChange={(v) =>
                              setEditingAgent({ ...editingAgent, vendor_id: v === "none" ? null : v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {vendorList.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name || v.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={editingAgent.status || "active"}
                            onValueChange={(v) =>
                              setEditingAgent({ ...editingAgent, status: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2 space-x-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
                            {editSaving ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAgent(null)}>
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={agent.id}>
                      <td className="px-4 py-2">{agent.name || "-"}</td>
                      <td className="px-4 py-2">{agent.email || "-"}</td>
                      <td className="px-4 py-2">{agent.phone || "-"}</td>
                      <td className="px-4 py-2">{agent.agent_code || "-"}</td>
                      <td className="px-4 py-2">{vendorName}</td>
                      <td className="px-4 py-2 capitalize">{agent.status || "active"}</td>
                      <td className="px-4 py-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingAgent(agent)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!filteredAgents.length && (
                  <tr>
                    <td className="px-4 py-4 text-gray-500" colSpan={7}>
                      No agents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAgents;
