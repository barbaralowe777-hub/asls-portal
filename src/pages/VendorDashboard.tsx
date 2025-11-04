import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Plus } from 'lucide-react';
import { Application } from '@/types';
import { mockApplications } from '@/data/mockData';
import StatusBadge from "@/components/StatusBadge";
import AuthGuard from '@/components/AuthGuard'; // ✅ add this line

interface VendorDashboardProps {
  onNewApplication: () => void;
  onViewApplication: (id: string) => void;
}

const VendorDashboard: React.FC<VendorDashboardProps> = ({
  onNewApplication,
  onViewApplication,
}) => {
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = mockApplications.filter(
      (app) =>
        app.customerName.toLowerCase().includes(value.toLowerCase()) ||
        app.id.toLowerCase().includes(value.toLowerCase())
    );
    setApplications(filtered);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    if (status === 'all') {
      setApplications(mockApplications);
    } else {
      const filtered = mockApplications.filter((app) => app.status === status);
      setApplications(filtered);
    }
  };

  const handleSort = (field: string) => {
    setSortBy(field);
    const sorted = [...applications].sort((a, b) => {
      if (field === 'date')
        return (
          new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        );
      if (field === 'amount') return b.loanAmount - a.loanAmount;
      return a.customerName.localeCompare(b.customerName);
    });
    setApplications(sorted);
  };

  const stats = [
    { label: 'Total Applications', value: mockApplications.length, color: 'bg-[#1dad21]' },
    {
      label: 'Under Review',
      value: mockApplications.filter((a) => a.status === 'under_review').length,
      color: 'bg-amber-500',
    },
    {
      label: 'Approved',
      value: mockApplications.filter((a) => a.status === 'approved').length,
      color: 'bg-green-500',
    },
    {
      label: 'Settled',
      value: mockApplications.filter((a) => a.status === 'funded').length,
      color: 'bg-emerald-500',
    },
    {
      label: 'Declined',
      value: mockApplications.filter((a) => a.status === 'declined').length,
      color: 'bg-red-500',
    },
  ];

  return (
    <AuthGuard allowedRoles={['vendor']}> {/* ✅ Protect this entire dashboard */}
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/68e338ca2cce289ba3b6eac4_1760324623689_be6a0877.png"
              alt="Australian Solar Lending Solutions"
              className="h-12 w-auto"
            />
          </div>

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Applications Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage and track all your customer applications
              </p>
            </div>
            <button
              onClick={onNewApplication}
              className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Application
            </button>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div
                  className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <span className="text-white text-xl font-bold">{stat.value}</span>
                </div>
                <p className="text-gray-600 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filters + Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by customer name or ID..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="funded">Funded</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {app.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.customerName}
                        </div>
                        <div className="text-sm text-gray-500">{app.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${app.loanAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.submittedDate}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {app.actionRequired ? (
                          <span className="text-amber-600 font-medium">
                            {app.actionRequired}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => onViewApplication(app.id)}
                          className="text-[#1dad21] hover:text-green-700 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
              </div>
    </div>
  </AuthGuard>  // ✅ clean close
);
};

export default VendorDashboard;

