import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Download, Eye, Plus, Calculator, Users, CheckCircle, Sun, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import AuthGuard from '@/components/AuthGuard';
import RepaymentCalculator from '@/components/RepaymentCalculator';
import SolarSavingsCalculator from '@/components/SolarSavingsCalculator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AppRow = {
  id: string;
  status: string;
  entity_name?: string | null;
  finance_amount?: string | null;
  pdf_url?: string | null;
  created_at?: string | null;
  data?: any;
  vendor_id?: string | null;
  agent_id?: string | null;
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

type StatProps = { label: string; value: React.ReactNode; bgClass?: string; textClass?: string };
const Stat = ({ label, value, bgClass, textClass }: StatProps) => (
  <div className={`rounded-xl shadow-sm p-4 border border-gray-100 ${bgClass || "bg-gradient-to-br from-white to-gray-50"}`}>
    <p className="text-[11px] text-gray-500 uppercase tracking-[0.12em] font-semibold">{label}</p>
    <p className={`text-xl font-semibold mt-1 ${textClass || "text-gray-900"}`}>{value}</p>
  </div>
);

const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'applications' | 'tasks' | 'reports' | 'calculator' | 'agents' | 'solar'>('applications');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [invite, setInvite] = useState({ name: '', email: '' });
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [hasTasksOnly, setHasTasksOnly] = useState(false);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [docType, setDocType] = useState<string>("");
  const [uploadType, setUploadType] = useState<Record<string, string>>({});
  const [uploadingByApp, setUploadingByApp] = useState<Record<string, boolean>>({});
  const [taskSearchTerm, setTaskSearchTerm] = useState("");
  const [taskAgentFilter, setTaskAgentFilter] = useState<string>("all");
  const [reportStatus, setReportStatus] = useState<string>('all');
  const [reportAgent, setReportAgent] = useState<string>('all');
  const [reportOutstandingOnly, setReportOutstandingOnly] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ appId: '', businessName: '', reason: '' });
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const SHOW_DEMO = false;

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const previewVendorCode = searchParams.get("previewVendorCode");
  const previewVendorId = searchParams.get("previewVendorId");
  const isPreviewMode = profileRole === "admin" && (!!previewVendorCode || !!previewVendorId);

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
        vendor_id: row.vendor_id || data.vendorUuid || data.vendorId || null,
        agent_id: row.agent_id || data.agentId || null,
        data,
      };
    };

    const isVendorMatch = (payload: any, vId: string | null) => {
      if (!vId) return false;
      const target = String(vId).toLowerCase();
      const candidates = [
        payload?.vendorUuid,
        payload?.vendorId,
        payload?.vendor_id,
        payload?.vendorCode,
        payload?.vendor_code,
      ]
        .map((v) => (v ? String(v).toLowerCase() : ""))
        .filter(Boolean);
      return candidates.includes(target);
    };

    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const role = (profile as any)?.role || (session.user.user_metadata as any)?.role || null;
        setProfileRole(role || null);
        const vId = (profile as any)?.vendor_id || (profile as any)?.vendorId || null;
        let targetVendorId = previewVendorId || vId || null;

        if (role === 'admin' && previewVendorCode) {
          const { data: vendorRow } = await supabase
            .from('vendors')
            .select('id')
            .eq('vendor_code', previewVendorCode)
            .maybeSingle();
          if (vendorRow?.id) {
            targetVendorId = vendorRow.id;
          } else {
            setPreviewMessage("Preview mode: vendor code not found. Please check the code and try again.");
            setApps([]);
            setLoading(false);
            return;
          }
        }

        if (role === 'admin' && !targetVendorId) {
          setPreviewMessage("Preview mode: select a vendor from the Admin Dashboard to view their dashboard.");
          setApps([]);
          setLoading(false);
          return;
        }

        setPreviewMessage(null);
        setVendorId(targetVendorId);

        const appQuery = supabase
          .from('applications')
          .select('id,status,entity_name,finance_amount,pdf_url,created_at,data,agent_id,vendor_id')
          .order('created_at', { ascending: false });
        const [{ data: appRows }, { data: formRows }] = await Promise.all([
          targetVendorId ? appQuery.eq('vendor_id', targetVendorId) : appQuery,
          supabase.from('application_forms').select('id,status,created_at,data'),
        ]);

        const combined: AppRow[] = [];
        if (appRows) combined.push(...(appRows as any[]).map(mapRow));
        if (formRows) {
          formRows
            .map((row: any) =>
              mapRow({
                ...row,
                vendor_id: targetVendorId || row.data?.vendorUuid || row.data?.vendorId || null,
                agent_id: row.data?.agentId || null,
                pdf_url: row.data?.pdfUrl || null,
              })
            )
            .forEach((row: any) => {
              const idx = combined.findIndex((r) => r.id === row.id);
              if (idx >= 0) {
                combined[idx] = { ...combined[idx], ...row, data: row.data || combined[idx].data };
              } else {
                combined.push(row);
              }
            });
        }

        combined.sort(
          (a, b) =>
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
        );
        setApps(combined);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [previewVendorId, previewVendorCode]);

  const blockIfPreview = () => {
    if (isPreviewMode) {
      alert("Preview mode: actions are disabled for safety.");
      return true;
    }
    return false;
  };

  const filteredApps = useMemo(() => {
    let list = apps;
    if (statusFilter !== 'all') list = list.filter(a => a.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(a => a.id.toLowerCase().includes(q) || (a.entity_name || '').toLowerCase().includes(q));
    }
    return list;
  }, [apps, statusFilter, searchTerm]);

  // Agent filter options and state
  const agentOptions = useMemo(() => {
    const set = new Set<string>();
    apps.forEach(a => {
      const d: any = a.data || {}; const name = [d?.agentFirstName, d?.agentLastName].filter(Boolean).join(' ');
      if (name) set.add(name);
    });
    return Array.from(set.values());
  }, [apps]);
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const filteredByAgent = useMemo(() => {
    if (agentFilter === 'all') return filteredApps;
    return filteredApps.filter(a => {
      const d: any = a.data || {}; const name = [d?.agentFirstName, d?.agentLastName].filter(Boolean).join(' ');
      return name === agentFilter;
    });
  }, [filteredApps, agentFilter]);

  const parseFinance = (s?: string | null) => {
    if (!s) return 0;
    const num = parseFloat(String(s).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };
  const formatAUSDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-AU') : '-');
  const currency = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
  const financeTotal = useMemo(() => {
    return filteredByAgent.reduce((sum, a) => sum + parseFinance(a.finance_amount), 0);
  }, [filteredByAgent]);

  const openPdf = (url?: string | null) => {
    const target = url || undefined;
    if (!target) {
      alert('PDF not available yet.');
      return;
    }
    window.open(target, '_blank', 'noopener');
  };

  const stats = useMemo(() => ([
    {
      label: 'Total Applications',
      value: filteredByAgent.length,
      cardBg: 'bg-blue-600',
      textClass: 'text-white',
    },
    {
      label: 'Under Review',
      value: filteredByAgent.filter(a => a.status === 'under_review' || a.status === 'submitted').length,
      cardBg: 'bg-amber-500',
      textClass: 'text-white',
    },
    {
      label: 'Approved',
      value: filteredByAgent.filter(a => a.status === 'approved').length,
      cardBg: 'bg-green-600',
      textClass: 'text-white',
    },
    {
      label: 'Settled',
      value: filteredByAgent.filter(a => a.status === 'funded' || a.status === 'settled').length,
      cardBg: 'bg-emerald-600',
      textClass: 'text-white',
    },
    {
      label: 'Declined',
      value: filteredByAgent.filter(a => a.status === 'declined' || a.status === 'rejected').length,
      cardBg: 'bg-rose-500',
      textClass: 'text-white',
    },
    {
      label: 'Withdrawn',
      value: filteredByAgent.filter(a => a.status === 'withdrawn').length,
      cardBg: 'bg-purple-600',
      textClass: 'text-white',
    },
  ]), [filteredByAgent]);

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
    // Directors
    (d.directors || []).forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`director_${n}_licence_front`) && !d.directors?.[idx]?.licenceFrontUrl) tasks.push(`Upload Director ${n} licence (front)`);
      if (!has(`director_${n}_licence_back`) && !d.directors?.[idx]?.licenceBackUrl) tasks.push(`Upload Director ${n} licence (back)`);
      if (!has(`director_${n}_medicare_front`) && !d.directors?.[idx]?.medicareFrontUrl) tasks.push(`Upload Director ${n} Medicare (front)`);
    });

    // Guarantors
    if (Array.isArray(d.guarantors) && d.guarantors.length) {
      d.guarantors.forEach((g: any, idx: number) => {
        const n = idx + 1;
        const prefix = `guarantor_${n}`;
        if (!has(`${prefix}_licence_front`) && !g?.licenceFrontUrl) tasks.push(`Upload Guarantor ${n} licence (front)`);
        if (!has(`${prefix}_licence_back`) && !g?.licenceBackUrl) tasks.push(`Upload Guarantor ${n} licence (back)`);
        if (!has(`${prefix}_medicare_front`) && !g?.medicareFrontUrl) tasks.push(`Upload Guarantor ${n} Medicare (front)`);
      });
    }

    // Property docs
    if ((d.premisesType || '').toLowerCase() === 'rented') {
      if (!has('lease_agreement')) tasks.push('Upload Lease Agreement');
      if (!has('landlord_waiver')) tasks.push('Upload Landlord Waiver');
    }
    if ((d.premisesType || '').toLowerCase() === 'owned') {
      if (!has('rates_notice')) tasks.push('Upload Rates Notice');
    }
    // Trust entity docs
    if ((d.entityType || '').toLowerCase() === 'trust') {
      if (!has('trust_deed')) tasks.push('Upload Trust Deed');
    }
    const invoiceKey = 'invoice_solar_supplier_vendor';
    if (!has(invoiceKey) && !(d?.invoiceUrl || d?.invoice)) {
      tasks.push('Upload invoice from solar supplier/vendor');
    }
    return tasks;
  };

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
    if (blockIfPreview()) return;
    const type = docType || "other";
    setUploadingByApp((cur) => ({ ...cur, [app.id]: true }));
    try {
      const safeName = (file.name || "upload").replace(/[^a-z0-9.\\-_]/gi, "_").slice(0, 80);
      const path = `applications/${app.id}/support_${type}_${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
      const url = urlData?.publicUrl;
      if (!url) throw new Error("Could not get uploaded file URL");

      const existingData = app.data || {};
      const prevFiles: any = existingData.files || {};
      const prevList = Array.isArray(prevFiles[type]) ? prevFiles[type] : prevFiles[type] ? [prevFiles[type]] : [];
      const files = { ...prevFiles, [type]: [...prevList, url] };
      const newData = { ...existingData, files };

      const { error: formErr } = await supabase.from('application_forms').update({ data: newData }).eq('id', app.id);
      if (formErr) throw formErr;
      await supabase.from('applications').update({ data: newData }).eq('id', app.id);

      setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, data: newData } : a)));
      setSelected((cur) => (cur && cur.id === app.id ? { ...cur, data: newData } : cur));
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed; please try again.");
    } finally {
      setUploadingByApp((cur) => ({ ...cur, [app.id]: false }));
    }
  };

  const getAgentName = (row: AppRow) => {
    const d: any = row.data || {};
    return [d?.agentFirstName, d?.agentLastName].filter(Boolean).join(' ').trim();
  };

  const taskItems = useMemo(
    () =>
      apps.flatMap((a) => computeTasks(a).map((task) => ({ id: a.id, task }))),
    [apps]
  );

  const reportRows = useMemo(() => {
    let list = apps;
    if (reportStatus !== 'all') list = list.filter(a => a.status === reportStatus);
    if (reportAgent !== 'all') list = list.filter(a => getAgentName(a) === reportAgent);
    if (reportOutstandingOnly) list = list.filter(a => computeTasks(a).length > 0);
    return list;
  }, [apps, reportStatus, reportAgent, reportOutstandingOnly]);

  const reportTotals = useMemo(() => {
    const outstanding = reportRows.filter(a => computeTasks(a).length > 0).length;
    const submitted = reportRows.filter(a => a.status === 'submitted').length;
    const underReview = reportRows.filter(a => a.status === 'under_review').length;
    const approved = reportRows.filter(a => a.status === 'approved').length;
    const settled = reportRows.filter(a => a.status === 'funded' || a.status === 'settled').length;
    const declined = reportRows.filter(a => a.status === 'declined' || a.status === 'rejected').length;
    const withdrawn = reportRows.filter(a => a.status === 'withdrawn').length;
    const value = reportRows.reduce((sum, a) => sum + parseFinance(a.finance_amount), 0);
    return { outstanding, submitted, underReview, approved, settled, declined, withdrawn, value };
  }, [reportRows]);

  const outstandingApps = useMemo(() => {
    let list = apps
      .map((app) => ({ app, tasks: computeTasks(app) }))
      .filter((x) => x.tasks.length > 0);
    if (taskAgentFilter !== 'all') list = list.filter(({ app }) => getAgentName(app) === taskAgentFilter);
    if (taskSearchTerm) {
      const q = taskSearchTerm.toLowerCase();
      list = list.filter(
        ({ app }) =>
          app.id.toLowerCase().includes(q) ||
          (app.entity_name || '').toLowerCase().includes(q) ||
          (app.data?.businessName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, taskAgentFilter, taskSearchTerm]);

  const sendWithdrawRequest = async () => {
    if (blockIfPreview()) return;
    setWithdrawMsg(null);
    if (!withdrawForm.appId.trim() || !withdrawForm.businessName.trim()) {
      setWithdrawMsg("Please enter Application ID and Business Name.");
      return;
    }
    setWithdrawLoading(true);
    try {
      await fetch("https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: ["john@asls.net.au", "admin@asls.net.au"],
          subject: `Withdraw Application Request - ${withdrawForm.appId}`,
          text: `Application ID: ${withdrawForm.appId}\nBusiness: ${withdrawForm.businessName}\nReason: ${withdrawForm.reason || "Not provided"}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
              <h3>Withdraw Application Request</h3>
              <p><strong>Application ID:</strong> ${withdrawForm.appId}</p>
              <p><strong>Business:</strong> ${withdrawForm.businessName}</p>
              <p><strong>Reason:</strong> ${withdrawForm.reason || "Not provided"}</p>
            </div>
          `,
        }),
      });

      // Mark application as withdrawn (best effort)
      const { error: updateErr } = await supabase
        .from("applications")
        .update({ status: "withdrawn" })
        .eq("id", withdrawForm.appId.trim());
      if (updateErr) {
        console.warn("Could not mark application withdrawn", updateErr);
      } else {
        setApps((cur) =>
          cur.map((a) =>
            a.id === withdrawForm.appId.trim() ? { ...a, status: "withdrawn" } : a
          )
        );
      }

      setWithdrawMsg("Request sent.");
      setWithdrawForm({ appId: "", businessName: "", reason: "" });
    } catch (err: any) {
      console.error("Withdraw request failed", err);
      setWithdrawMsg("Failed to send request. Please try again.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const exportReportCSV = () => {
    if (!reportRows.length) return alert('No data to export');
    const header = ['id','business','status','finance_amount','agent','submitted','tasks'];
    const rows = reportRows.map(a => [
      a.id,
      a.entity_name || '',
      a.status,
      a.finance_amount || '',
      getAgentName(a) || '',
      formatAUSDate(a.created_at),
      computeTasks(a).join(' • ')
    ]);
    const csv = [header.join(' • '), ...rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(' • '))].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vendor_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!filteredApps.length) return alert('No data to export');
    const header = ['id','entity_name','status','finance_amount','submitted'];
    const rows = filteredByAgent.map(a => [a.id, a.entity_name || '', a.status, a.finance_amount || '', formatAUSDate(a.created_at)]);
    const csv = [header.join(' • '), ...rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(' • '))].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `applications_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard allowedRoles={['vendor', 'admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="mb-6 flex items-center">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760324623689_be6a0877.png"
              alt="Australian Solar Lending Solutions"
              className="h-32 md:h-40 w-auto"
            />
          </div>

          {/* Demo banner */}
          {SHOW_DEMO && (
            <div className="mb-4 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 p-3 flex items-center justify-between">
              <div>
                <strong>Demo Mode</strong> — sample data is displayed. Remove <span className="font-mono">?demo=1</span> from the URL to hide.
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('demo');
                    const next = url.pathname + (url.searchParams.toString() ? ('?' + url.searchParams.toString()) : '');
                    window.location.replace(next);
                  } catch {}
                }}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Exit demo
              </button>
            </div>
          )}
          {isPreviewMode && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3">
              Preview mode: read-only. Uploads, invites, and withdrawals are disabled.
            </div>
          )}
          {previewMessage && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 p-3">
              {previewMessage}
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendors Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage and track all your customer applications</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('calculator')}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-blue-600 text-white hover:bg-blue-700 shadow w-full sm:w-auto justify-center"
              >
                <Calculator className="w-5 h-5 mr-2" /> Repayment Calculator
              </button>
              <button
                onClick={() => setActiveTab('solar')}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-yellow-500 text-white hover:bg-yellow-600 shadow w-full sm:w-auto justify-center"
              >
                <Sun className="w-5 h-5 mr-2" /> Solar Savings
              </button>
              <button
                onClick={() => navigate('/application-form')}
                className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center w-full sm:w-auto justify-center"
              >
                <Plus className="w-5 h-5 mr-2" /> New Application
              </button>
            </div>
          </div>

          {/* KPI Tiles */}
          {activeTab === 'applications' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`rounded-lg shadow p-5 text-white ${stat.cardBg || 'bg-gray-800'}`}
                >
                  <p className="text-sm font-medium text-white/90">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-2 ${stat.textClass || 'text-white'}`}>{stat.value}</p>
                </div>
              ))}
              <div className="rounded-lg shadow p-5 text-white bg-green-700">
                <p className="text-sm font-medium text-white/90">Total Finance Value</p>
                <p className="text-2xl font-bold mt-2">{currency(financeTotal)}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { key: 'applications', label: 'Applications' },
              { key: 'tasks', label: 'Outstanding Tasks' },
              { key: 'reports', label: 'Reports' },
              { key: 'agents', label: 'Agents' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-4 py-2 rounded-full border ${activeTab===t.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'applications' && (
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
                <select
                  value={agentFilter}
                  onChange={(e)=>setAgentFilter(e.target.value)}
                  className="px-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Agents</option>
                  {agentOptions.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <button onClick={exportCSV} className="px-4 h-11 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                  <Download className="w-4 h-4 inline mr-2" /> Export CSV
                </button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Application ID"
                    value={withdrawForm.appId}
                    onChange={(e)=>setWithdrawForm({...withdrawForm, appId:e.target.value})}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Business Name"
                    value={withdrawForm.businessName}
                    onChange={(e)=>setWithdrawForm({...withdrawForm, businessName:e.target.value})}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={withdrawForm.reason}
                    onChange={(e)=>setWithdrawForm({...withdrawForm, reason:e.target.value})}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={sendWithdrawRequest}
                    disabled={withdrawLoading || isPreviewMode}
                    className="px-4 h-11 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-60"
                  >
                    {withdrawLoading ? 'Sending...' : 'Withdraw Application Request'}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-red-600 border-gray-300 rounded"
                  checked={hasTasksOnly}
                  onChange={(e)=>setHasTasksOnly(e.target.checked)}
                />
                <span>Has outstanding tasks</span>
              </label>
              {withdrawMsg && <div className="text-sm text-gray-700 mt-2">{withdrawMsg}</div>}
            </div>
          </div>
          )}

          {activeTab === 'applications' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finance Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Required</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredByAgent.filter(a => !hasTasksOnly || (computeTasks(a).length > 0)).map((app) => (
                   <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.entity_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {(() => { const d:any = app.data || {}; const name = [d.agentFirstName, d.agentLastName].filter(Boolean).join(' '); return name || '-'; })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.finance_amount || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex min-w-[120px] justify-center">
                      <StatusBadge status={app.status as any} />
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatAUSDate(app.created_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const t = computeTasks(app);
                      const badge = (
                        <span className={`inline-flex items-center justify-center rounded-full text-xs font-semibold px-2 py-0.5 mr-2 ${t.length ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
                          {t.length}
                        </span>
                      );
                      if (!t.length) {
                        return <span className="text-green-700 inline-flex items-center">{badge}<CheckCircle className="w-4 h-4 mx-1 text-green-600" /> All clear</span>;
                      }
                      return (
                        <div className="text-red-700 flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            {badge}
                            <span className="text-xs font-semibold text-gray-800">Outstanding</span>
                          </div>
                          <TaskChips tasks={t} appId={app.id} />
                        </div>
                      );
                    })()}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openPdf(app.pdf_url || app.data?.pdfUrl || app.data?.contractUrl)}
                            className="text-[#1dad21] hover:text-green-700 flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" /> PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelected(app)}
                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!loading && filteredApps.length === 0) && (
                <div className="p-6 text-center text-gray-500">No applications found.</div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Outstanding Tasks</h3>
                  <p className="text-sm text-gray-600">Upload documents to resolve items.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by customer, business, or ID..."
                      value={taskSearchTerm}
                      onChange={(e) => setTaskSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={taskAgentFilter} onValueChange={(v) => setTaskAgentFilter(v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agentOptions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {(!loading ? outstandingApps : []).map(({ app, tasks }) => (
                    <div key={app.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50">
                      <div className="md:w-1/3 space-y-1">
                        <div className="font-mono text-sm text-gray-700">{app.id}</div>
                        <div className="font-semibold text-gray-900">{app.entity_name || '-'}</div>
                        <div className="text-xs text-gray-500">Agent: {getAgentName(app) || 'Unassigned'}</div>
                        <div className="text-xs text-gray-500">
                          Submitted: {app.created_at ? new Date(app.created_at).toLocaleDateString('en-AU') : '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <StatusBadge status={app.status as any} />
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
                                e.target.value = '';
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
          {activeTab === 'reports' && (
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <select value={reportStatus} onChange={(e)=>setReportStatus(e.target.value)} className="px-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="all">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="settled">Settled</option>
                  <option value="declined">Declined</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
                <select value={reportAgent} onChange={(e)=>setReportAgent(e.target.value)} className="px-4 h-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="all">All agents</option>
                  {agentOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <button onClick={exportReportCSV} className="px-4 h-11 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
                  <Download className="w-4 h-4 inline mr-2" /> Export report
                </button>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="h-4 w-4 text-green-600 border-gray-300 rounded" checked={reportOutstandingOnly} onChange={(e)=>setReportOutstandingOnly(e.target.checked)} />
                  <span>Outstanding tasks only</span>
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Submitted" value={reportTotals.submitted} bgClass="bg-blue-50" textClass="text-blue-800" />
                <Stat label="Under Review" value={reportTotals.underReview} bgClass="bg-amber-50" textClass="text-amber-800" />
                <Stat label="Approved" value={reportTotals.approved} bgClass="bg-green-50" textClass="text-green-800" />
                <Stat label="Settled" value={reportTotals.settled} bgClass="bg-emerald-50" textClass="text-emerald-800" />
                <Stat label="Declined" value={reportTotals.declined} bgClass="bg-red-50" textClass="text-red-800" />
                <Stat label="Withdrawn" value={reportTotals.withdrawn} bgClass="bg-purple-50" textClass="text-purple-800" />
                <Stat label="Outstanding tasks" value={reportTotals.outstanding} bgClass="bg-rose-50" textClass="text-rose-800" />
                <Stat label="Filtered applications" value={reportRows.length} bgClass="bg-slate-50" textClass="text-slate-800" />
                <Stat label="Total value" value={currency(reportTotals.value)} bgClass="bg-purple-50" textClass="text-purple-800" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">ID</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Business</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Agent</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Finance</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Submitted</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase tracking-wide">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportRows.map(app => {
                      const tasks = computeTasks(app);
                      return (
                        <tr key={app.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{app.id}</td>
                          <td className="px-4 py-2">{app.entity_name || '-'}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex min-w-[120px] justify-center"><StatusBadge status={app.status as any} /></span>
                          </td>
                          <td className="px-4 py-2">{getAgentName(app) || '-'}</td>
                          <td className="px-4 py-2">{app.finance_amount || '-'}</td>
                          <td className="px-4 py-2 text-gray-600">{formatAUSDate(app.created_at)}</td>
                          <td className="px-4 py-2 text-xs text-red-700">{tasks.length ? tasks.join(' • ') : 'None'}</td>
                        </tr>
                      );
                    })}
                    {!reportRows.length && (
                      <tr>
                        <td className="px-4 py-4 text-center text-gray-500" colSpan={7}>No rows</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center"><Users className="w-5 h-5 mr-2"/>Register Agent</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="text" placeholder="Agent Name" value={invite.name} onChange={(e)=>setInvite({...invite, name:e.target.value})} className="px-4 py-2 border rounded-lg"/>
                <input type="email" placeholder="Agent Email" value={invite.email} onChange={(e)=>setInvite({...invite, email:e.target.value})} className="px-4 py-2 border rounded-lg"/>
                <button
                  onClick={async ()=>{ 
                    if (blockIfPreview()) return;
                    if(!vendorId) return alert('Missing vendor id'); 
                    if(!invite.name || !invite.email) return alert('Agent name and email required');
                    try {
                      const agentCode = `AG-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
                      const { data: agentRow, error } = await supabase
                        .from('agents')
                        .insert([{ vendor_id: vendorId, name: invite.name, email: invite.email, status: 'active', agent_code: agentCode }])
                        .select()
                        .single();
                      if (error) throw error;
                      if (agentRow?.id) {
                        try {
                          await supabase.functions.invoke('agent-invite', {
                            body: { agent_id: agentRow.id, vendor_id: vendorId, name: invite.name, email: invite.email },
                          });
                          setInviteMessage('Agent recorded and invite sent (check email).');
                        } catch (fnErr: any) {
                          console.error('Invite function failed', fnErr);
                          setInviteMessage('Agent recorded, but invite email may not have been sent. Our team will review.');
                        }
                      }
                      if (!inviteMessage) setInviteMessage('Agent recorded. If possible, a magic-link invite has been sent.');
                      setInvite({name:'',email:''});
                    } catch (err) {
                      console.error(err);
                      setInviteMessage('Failed to register agent. Please try again.');
                    }
                  }}
                  className="bg-[#1dad21] text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
                  disabled={isPreviewMode}
                >
                  Send Invite
                </button>
                {inviteMessage && (
                  <div className="text-sm text-gray-700 bg-gray-50 border rounded px-3 py-2">
                    {inviteMessage}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">Note: Final account provisioning is handled by our team. This records your request.</p>
            </div>
          )}

          {activeTab === 'solar' && (
            <div className="bg-white rounded-lg shadow p-6">
              <SolarSavingsCalculator />
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="bg-white rounded-lg shadow p-6">
              <RepaymentCalculator />
            </div>
          )}
          {/* Detail Drawer */}
          {selected && (
            <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setSelected(null)}>
              <div className="w-full max-w-xl h-full bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b">
                  <h3 className="text-xl font-semibold">Application {selected.id}</h3>
                  <p className="text-sm text-gray-600">{selected.entity_name}</p>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-64px)]">
                  <div>
                    <h4 className="font-semibold mb-2">Outstanding Tasks</h4>
                    {(() => { const t = computeTasks(selected); return t.length ? (
                      <ul className="list-disc pl-5 text-sm">{t.map((x,i)=>(<li key={i}>{x}</li>))}</ul>
                    ) : <p className="text-sm text-gray-500">None</p>; })()}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Task Status</h4>
                    {(() => {
                      const d: any = selected.data || {};
                      const files: Record<string, string[]> = (d.files || {}) as any;
                      const has = (k: string) => {
                        const v = files[k];
                        if (!v) return false;
                        return Array.isArray(v) ? v.length > 0 : true;
                      };
                      const premises = (d.premisesType || '').toLowerCase();
                      const entityType = (d.entityType || '').toLowerCase();
                      const items: Array<{label:string, applies:boolean, resolved:boolean}> = [
                        { label: 'Lease Agreement', applies: premises === 'rented', resolved: has('lease_agreement') },
                        { label: 'Landlord Waiver', applies: premises === 'rented', resolved: has('landlord_waiver') },
                        { label: 'Rates Notice', applies: premises === 'owned', resolved: has('rates_notice') },
                        { label: 'Trust Deed', applies: entityType === 'trust', resolved: has('trust_deed') },
                      ];
                      const toShow = items.filter(it => it.applies);
                      if (!toShow.length) return <p className="text-sm text-gray-500">No applicable tasks for this application.</p>;
                      return (
                        <ul className="text-sm space-y-1">
                          {toShow.map((it, i) => (
                            <li key={i} className="flex items-center">
                              <span className="mr-2">{it.label}</span>
                              {it.resolved ? (
                                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5">Resolved</span>
                              ) : (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5">Outstanding</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Upload Supporting Document</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <select value={docType} onChange={(e)=>setDocType(e.target.value)} className="border rounded px-3 py-2">
                        <option value="">Select type</option>
                        {docTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="file"
                        id="supportUpload"
                        className="hidden"
                        onChange={(e)=>{
                          const file = e.target.files?.[0];
                          if (!file || !selected) return;
                          const type = docType || '';
                          if (!type) { (e.target as HTMLInputElement).value = ''; alert('Select a document type first.'); return; }
                          uploadDoc(selected, file, type);
                          (e.target as HTMLInputElement).value = '';
                        }}
                      />
                      <label htmlFor="supportUpload" className={`px-4 py-2 border rounded text-center cursor-pointer ${!docType ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {selected && uploadingByApp[selected.id] ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      <p className="mb-1">What resolves a task:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        <li><span className="font-semibold">Lease Agreement</span> resolves "Upload Lease Agreement" (Rented)</li>
                        <li><span className="font-semibold">Landlord Waiver</span> resolves "Upload Landlord Waiver" (Rented)</li>
                        <li><span className="font-semibold">Rates Notice</span> resolves "Upload Rates Notice" (Owned)</li>
                        <li><span className="font-semibold">Trust Deed</span> resolves "Upload Trust Deeds" (Trust)</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Files</h4>
                    {selected.data?.files ? (
                      <ul className="text-sm space-y-1">
                        {Object.entries(selected.data.files as Record<string,string[]>).flatMap(([k, arr]) => arr.map((u, i) => (
                          <li key={`${k}-${i}`}>
                            <span className="uppercase tracking-wide text-gray-500 mr-2">{k}</span>
                            <a href={u} target="_blank" rel="noreferrer" className="text-[#1dad21] underline">View</a>
                          </li>
                        )))}
                      </ul>
                    ) : <p className="text-sm text-gray-500">No files uploaded yet.</p>}
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

export default VendorDashboard;
























