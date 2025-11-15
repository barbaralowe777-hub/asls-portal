import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Eye, Plus, Calculator, Users, CheckCircle, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import AuthGuard from '@/components/AuthGuard';
import RepaymentCalculator from '@/components/RepaymentCalculator';
import SolarSavingsCalculator from '@/components/SolarSavingsCalculator';

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

const VendorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'applications' | 'tasks' | 'reports' | 'calculator' | 'agents' | 'solar'>('applications');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [invite, setInvite] = useState({ name: '', email: '' });
  const [hasTasksOnly, setHasTasksOnly] = useState(false);
  const [selected, setSelected] = useState<AppRow | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      const vId = (profile as any)?.vendor_id || (profile as any)?.vendorId || null;
      setVendorId(vId);
      let query: any = supabase
        .from('applications')
        .select('id,status,entity_name,finance_amount,pdf_url,created_at,data,agent_id,vendor_id')
        .order('created_at', { ascending: false });
      if (vId) query = query.eq('vendor_id', vId);
      const { data, error } = await query;
      if (!error && data) setApps(data as AppRow[]);
      setLoading(false);
    };
    load();
  }, []);

  // Dev-only: populate mock data if none returned so you can preview UI easily
  // Toggle demo data on: set VITE_SHOW_MOCK_DASHBOARD=1 in env or add ?demo=1 to URL
  const SHOW_DEMO = (import.meta.env.VITE_SHOW_MOCK_DASHBOARD === '1') || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo'));
  useEffect(() => {
    if (SHOW_DEMO && !loading && apps.length === 0) {
      const now = new Date();
      const daysAgo = (n: number) => new Date(now.getTime() - n*24*60*60*1000).toISOString();
      const sample: AppRow[] = [
        {
          id: 'APP-100001',
          status: 'approved',
          entity_name: 'SunVolt Energy Pty Ltd',
          finance_amount: '$145,000',
          pdf_url: '#',
          created_at: daysAgo(12),
          data: { premisesType: 'Owned', entityType: 'Company', agentFirstName: 'Emma', agentLastName: 'Gray', files: { rates_notice: ['https://example.com/rates.pdf'] } },
        },
        {
          id: 'APP-100002',
          status: 'under_review',
          entity_name: 'GreenPeak Solar',
          finance_amount: '$82,500',
          pdf_url: '#',
          created_at: daysAgo(7),
          data: { premisesType: 'Rented', entityType: 'Company', agentFirstName: 'Liam', agentLastName: 'Chen' },
        },
        {
          id: 'APP-100003',
          status: 'submitted',
          entity_name: 'Voltify Renewables',
          finance_amount: '$61,200',
          pdf_url: '#',
          created_at: daysAgo(3),
          data: { premisesType: 'Rented', entityType: 'Trust', agentFirstName: 'Amy', agentLastName: 'Singh', files: { lease_agreement: ['https://example.com/lease.pdf'] } },
        },
        {
          id: 'APP-100004',
          status: 'settled',
          entity_name: 'SolarWorks NSW',
          finance_amount: '$210,000',
          pdf_url: '#',
          created_at: daysAgo(30),
          data: { premisesType: 'Owned', entityType: 'Trust', agentFirstName: 'Emma', agentLastName: 'Gray', files: { rates_notice: ['x'], trust_deed: ['y'] } },
        },
        {
          id: 'APP-100005',
          status: 'declined',
          entity_name: 'Apex Solar Co',
          finance_amount: '$39,900',
          pdf_url: '#',
          created_at: daysAgo(18),
          data: { premisesType: 'Rented', entityType: 'Company', agentFirstName: 'Liam', agentLastName: 'Chen' },
        },
        {
          id: 'APP-100006',
          status: 'approved',
          entity_name: 'Bright Future Solar',
          finance_amount: '$125,450',
          pdf_url: '#',
          created_at: daysAgo(1),
          data: { premisesType: 'Owned', entityType: 'Company', agentFirstName: 'Amy', agentLastName: 'Singh' },
        },
      ];
      setApps(sample);
    }
  }, [loading, apps.length, SHOW_DEMO]);

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

  const stats = useMemo(() => ([
    { label: 'Total Applications', value: filteredByAgent.length, bg: 'bg-blue-100', text: 'text-blue-800' },
    { label: 'Under Review', value: filteredByAgent.filter(a => a.status === 'under_review' || a.status === 'submitted').length, bg: 'bg-amber-100', text: 'text-amber-800' },
    { label: 'Approved', value: filteredByAgent.filter(a => a.status === 'approved').length, bg: 'bg-green-100', text: 'text-green-800' },
    { label: 'Settled', value: filteredByAgent.filter(a => a.status === 'funded' || a.status === 'settled').length, bg: 'bg-emerald-100', text: 'text-emerald-800' },
    { label: 'Declined', value: filteredByAgent.filter(a => a.status === 'declined' || a.status === 'rejected').length, bg: 'bg-red-100', text: 'text-red-800' },
  ]), [filteredByAgent]);

  const computeTasks = (row: AppRow) => {
    const d = row.data || {};
    const files = (d.files || {}) as Record<string, string[]>;
    const has = (key: string) => Array.isArray(files[key]) && files[key].length > 0;

    const tasks: string[] = [];
    // Rented premises require a lease agreement
    if (d.premisesType === 'Rented' && !has('lease_agreement')) tasks.push('Upload Lease Agreement');
    // Owned premises require a rates notice
    if (d.premisesType === 'Owned' && !has('rates_notice')) tasks.push('Upload Rates Notice');
    // Trust entities require trust deeds
    if (d.entityType === 'Trust' && !has('trust_deed')) tasks.push('Upload Trust Deeds');
    return tasks;
  };

  const exportCSV = () => {
    if (!filteredApps.length) return alert('No data to export');
    const header = ['id','entity_name','status','finance_amount','submitted'];
    const rows = filteredByAgent.map(a => [a.id, a.entity_name || '', a.status, a.finance_amount || '', formatAUSDate(a.created_at)]);
    const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `applications_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthGuard allowedRoles={['vendor']}>
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

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendors Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage and track all your customer applications</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('solar')}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-yellow-500 text-white hover:bg-yellow-600 shadow"
              >
                <Sun className="w-5 h-5 mr-2" /> Solar Savings
              </button>
              <button
                onClick={() => setActiveTab('calculator')}
                className="px-6 py-3 rounded-lg font-semibold transition flex items-center bg-blue-600 text-white hover:bg-blue-700 shadow"
              >
                <Calculator className="w-5 h-5 mr-2" /> Repayment Calculator
              </button>
              <button
                onClick={() => navigate('/application-form')}
                className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" /> New Application
              </button>
            </div>
          </div>

          {/* KPI Tiles */}
          {activeTab === 'applications' && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <span className={`text-xl font-bold ${stat.text}`}>{stat.value}</span>
                  </div>
                  <p className="text-gray-700 text-sm font-medium">{stat.label}</p>
                </div>
              ))}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-4">
                  $
                </div>
                <p className="text-gray-600 text-sm">Total Finance Value</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{currency(financeTotal)}</p>
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
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={app.status as any} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatAUSDate(app.created_at)}</td>
                      <td className="px-6 py-4 text-sm">
                        {(() => {
                          const t = computeTasks(app);
                  const badge = (
                    <span className={`inline-flex items-center justify-center rounded-full text-xs font-semibold px-2 py-0.5 mr-2 ${t.length ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}`}>
                      {t.length}
                    </span>
                  );
                  return t.length ? (
                    <span className="text-red-700 font-medium inline-flex items-center">{badge}{t.join(', ')}</span>
                  ) : (
                    <span className="text-green-700 inline-flex items-center">{badge}<CheckCircle className="w-4 h-4 mx-1 text-green-600" /> All clear</span>
                  );
                })()}
              </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <a href={app.pdf_url || '#'} target="_blank" rel="noreferrer" className="text-[#1dad21] hover:text-green-700 flex items-center">
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
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Outstanding Tasks</h3>
              {filteredApps.flatMap(a => computeTasks(a).map(task => ({ id: a.id, task }))).length === 0 ? (
                <p className="text-gray-500">No outstanding tasks 🎉</p>
              ) : (
                <ul className="list-disc pl-6 space-y-2">
                  {filteredApps.flatMap(a => computeTasks(a).map(task => ({ id: a.id, task }))).map((t, i) => (
                    <li key={i} className="text-sm"><span className="font-mono font-semibold mr-2">{t.id}</span>{t.task}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Reports</h3>
              <button onClick={exportCSV} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"><Download className="w-4 h-4 inline mr-2"/>Export Applications CSV</button>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center"><Users className="w-5 h-5 mr-2"/>Register Agent</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input type="text" placeholder="Agent Name" value={invite.name} onChange={(e)=>setInvite({...invite, name:e.target.value})} className="px-4 py-2 border rounded-lg"/>
                <input type="email" placeholder="Agent Email" value={invite.email} onChange={(e)=>setInvite({...invite, email:e.target.value})} className="px-4 py-2 border rounded-lg"/>
                <button
                  onClick={async ()=>{ if(!vendorId) return alert('Missing vendor id'); await supabase.from('agent_invitations').insert([{ vendor_id: vendorId, name: invite.name, email: invite.email, status: 'pending' }]); alert('Invitation recorded. We will provision agent access.'); setInvite({name:'',email:''}); }}
                  className="bg-[#1dad21] text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                >
                  Send Invite
                </button>
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
                      const has = (k: string) => Array.isArray(files[k]) && files[k].length > 0;
                      const items: Array<{label:string, applies:boolean, resolved:boolean}> = [
                        { label: 'Lease Agreement', applies: d.premisesType === 'Rented', resolved: has('lease_agreement') },
                        { label: 'Rates Notice', applies: d.premisesType === 'Owned', resolved: has('rates_notice') },
                        { label: 'Trust Deed', applies: d.entityType === 'Trust', resolved: has('trust_deed') },
                      ];
                      const toShow = items.filter(it => it.applies);
                      if (!toShow.length) return <p className="text-sm text-gray-500">No applicable tasks for this application.</p>;
                      return (
                        <ul className="text-sm space-y-1">
                          {toShow.map((it, i) => (
                            <li key={i} className="flex items-center">
                              <span className="mr-2">{it.label}</span>
                              {it.resolved ? (
                                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5">Resolved ✓</span>
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
                        <option value="lease_agreement" title="Resolves 'Upload Lease Agreement' for rented premises">Lease Agreement</option>
                        <option value="rates_notice" title="Resolves 'Upload Rates Notice' for owned premises">Rates Notice</option>
                        <option value="trust_deed" title="Resolves 'Upload Trust Deeds' for trust entities">Trust Deed</option>
                        <option value="other">Other</option>
                      </select>
                      <input type="file" id="supportUpload" className="hidden" onChange={async (e)=>{
                        const file = e.target.files?.[0];
                        if (!file || !docType || !selected) return;
                        setUploading(true);
                        try {
                          const path = `applications/${selected.id}/support_${docType}_${Date.now()}_${file.name}`;
                          const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
                          if (error) throw error;
                          const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
                          const prev: any = selected.data || {};
                          const prevFiles: any = prev.files || {};
                          const list: string[] = Array.isArray(prevFiles[docType]) ? prevFiles[docType] : [];
                          const files = { ...prevFiles, [docType]: [...list, urlData.publicUrl] };
                          const newData = { ...prev, files };
                          await supabase.from('applications').update({ data: newData }).eq('id', selected.id);
                          setSelected({ ...selected, data: newData });
                          // Email notification to admins
                          try {
                            await fetch("https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                              },
                              body: JSON.stringify({
                                to: ["john@asls.net.au", "admin@asls.net.au"],
                                subject: `New document uploaded for ${selected.id}`,
                                text: `Application: ${selected.id}\nType: ${docType}\nURL: ${urlData.publicUrl}`,
                                html: `<p><strong>Application ID:</strong> ${selected.id}</p><p><strong>Document Type:</strong> ${docType}</p><p><a href="${urlData.publicUrl}" target="_blank">View document</a></p>`
                              })
                            });
                          } catch {}
                          alert('File uploaded');
                        } catch (err) {
                          console.error(err);
                          alert('Upload failed');
                        } finally {
                          setUploading(false);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}/>
                      <label htmlFor="supportUpload" className={`px-4 py-2 border rounded text-center cursor-pointer ${!docType ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading ? 'Uploading...' : 'Choose File'}
                      </label>
                    </div>
                    <div className="text-xs text-gray-500 mt-3">
                      <p className="mb-1">What resolves a task:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        <li><span className="font-semibold">Lease Agreement</span> → resolves "Upload Lease Agreement" (Rented)</li>
                        <li><span className="font-semibold">Rates Notice</span> → resolves "Upload Rates Notice" (Owned)</li>
                        <li><span className="font-semibold">Trust Deed</span> → resolves "Upload Trust Deeds" (Trust)</li>
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
