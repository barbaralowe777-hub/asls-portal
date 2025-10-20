import React, { useMemo, useState } from "react";
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
import { Search, Download, X, Filter } from "lucide-react";
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

// ----------------------------
// Helpers
// ----------------------------
const currency = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  funded: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
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
// Mock Data
// ----------------------------
const mockApplications = [
  {
    id: "app001",
    customerName: "John Smith",
    customerEmail: "john.smith@email.com",
    loanAmount: 45000,
    status: "approved",
    submittedDate: "2025-10-01",
    vendor: "SunVolt Energy",
    agent: "James Park",
  },
  {
    id: "app002",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.j@email.com",
    loanAmount: 32000,
    status: "under_review",
    submittedDate: "2025-10-02",
    vendor: "GreenPeak Solar",
    agent: "Mia Li",
    actionRequired: "Additional income verification required",
  },
  {
    id: "app003",
    customerName: "Michael Brown",
    customerEmail: "michael.b@email.com",
    loanAmount: 28000,
    status: "declined",
    submittedDate: "2025-09-28",
    vendor: "Voltify Renewables",
    agent: "Sophie Tran",
  },
  {
    id: "app004",
    customerName: "Emily Davis",
    customerEmail: "emily.d@email.com",
    loanAmount: 175000,
    status: "funded",
    submittedDate: "2025-09-15",
    vendor: "SunVolt Energy",
    agent: "James Park",
  },
  {
    id: "app005",
    customerName: "David Wilson",
    customerEmail: "david.w@email.com",
    loanAmount: 65000,
    status: "under_review",
    submittedDate: "2025-10-03",
    vendor: "SolarWorks NSW",
    agent: "—",
    actionRequired: "Upload trust deed document",
  },
];

// ----------------------------
// Component
// ----------------------------
const AdminAnalytics: React.FC = () => {
  const [applications] = useState(mockApplications);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // ---------------------------
  // KPI Summary
  // ---------------------------
  const totalApplications = applications.length;
  const totalValue = applications.reduce((sum, a) => sum + a.loanAmount, 0);
  const underReviewValue = applications
    .filter((a) => a.status === "under_review")
    .reduce((sum, a) => sum + a.loanAmount, 0);
  const declinedValue = applications
    .filter((a) => a.status === "declined")
    .reduce((sum, a) => sum + a.loanAmount, 0);
  const settledValue = applications
    .filter((a) => a.status === "funded")
    .reduce((sum, a) => sum + a.loanAmount, 0);
  const approvalRate = (
    (applications.filter((a) => a.status === "approved").length /
      totalApplications) *
    100
  ).toFixed(1);

  // ---------------------------
  // Derived Tables
  // ---------------------------
  const filteredApps = useMemo(() => {
    let filtered = applications;

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

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
  }, [applications, statusFilter, searchTerm, sortBy]);

  const vendors = useMemo(() => {
    const v: Record<string, any> = {};
    applications.forEach((a) => {
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
  }, [applications]);

  const agents = useMemo(() => {
    const a: Record<string, any> = {};
    applications.forEach((app) => {
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
  }, [applications]);

  const outstandingTasks = useMemo(() => {
    const map: Record<string, number> = {};
    applications
      .filter((a) => a.actionRequired)
      .forEach((a) => (map[a.vendor] = (map[a.vendor] || 0) + 1));
    return Object.entries(map).map(([vendor, count]) => ({ vendor, count }));
  }, [applications]);

  const monthlyStats = [
    { month: "July", applications: 5, approvalRate: 60 },
    { month: "August", applications: 6, approvalRate: 70 },
    { month: "September", applications: 8, approvalRate: 80 },
    { month: "October", applications: 5, approvalRate: 75 },
  ];

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-8">
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
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
          </select>

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

        {/* KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card className="text-center p-4">
            <CardTitle>Total Applications</CardTitle>
            <p className="text-2xl font-bold text-green-700">
              {totalApplications}
            </p>
          </Card>
          <Card className="text-center p-4">
            <CardTitle>Total Value</CardTitle>
            <p className="text-2xl font-bold text-blue-700">
              {currency(totalValue)}
            </p>
          </Card>
          <Card className="text-center p-4">
            <CardTitle>Under Review</CardTitle>
            <p className="text-2xl font-bold text-amber-600">
              {currency(underReviewValue)}
            </p>
          </Card>
          <Card className="text-center p-4">
            <CardTitle>Declined</CardTitle>
            <p className="text-2xl font-bold text-red-600">
              {currency(declinedValue)}
            </p>
          </Card>
          <Card className="text-center p-4">
            <CardTitle>Settled</CardTitle>
            <p className="text-2xl font-bold text-emerald-600">
              {currency(settledValue)}
            </p>
          </Card>
          <Card className="text-center p-4">
            <CardTitle>Approval Rate</CardTitle>
            <p className="text-2xl font-bold text-indigo-600">
              {approvalRate}%
            </p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="applications" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="approvalRate"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                  />
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
                  {vendors.map((v, i) => (
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
                onClick={() => downloadCSV(vendors, "Vendor_Report")}
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
                  {agents.map((a, i) => (
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
                onClick={() => downloadCSV(agents, "Agent_Report")}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
