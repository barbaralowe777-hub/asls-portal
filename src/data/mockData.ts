import { Application, Vendor, VendorMetrics } from '@/types';

export const mockVendor: Vendor = {
  id: 'v1',
  businessName: 'Premier Auto Sales',
  abn: '12345678901',
  email: 'contact@premierauto.com',
  phone: '1300 555 001',
  status: 'accredited',
  apiKey: 'pk_live_abc123xyz789',
  accreditedDate: '2024-01-15',
  totalApplications: 156,
  approvedApplications: 142,
  totalFunded: 4250000,
};

export const mockApplications: Application[] = [
  {
    id: 'app001',
    vendorId: 'v1',
    vendorName: 'Premier Auto Sales',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    loanAmount: 45000,
    loanPurpose: 'Vehicle Purchase',
    status: 'approved',
    submittedDate: '2024-10-01',
    lastUpdated: '2024-10-03',
    documents: ['driver_license.pdf', 'payslip.pdf'],
  },
  {
    id: 'app002',
    vendorId: 'v1',
    vendorName: 'Premier Auto Sales',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.j@email.com',
    loanAmount: 32000,
    loanPurpose: 'Vehicle Purchase',
    status: 'under_review',
    submittedDate: '2024-10-02',
    lastUpdated: '2024-10-05',
    actionRequired: 'Additional income verification required',
    documents: ['driver_license.pdf'],
  },
  // Add more applications...
].concat(
  Array.from({ length: 28 }, (_, i) => ({
    id: `app${String(i + 3).padStart(3, '0')}`,
    vendorId: 'v1',
    vendorName: 'Premier Auto Sales',
    customerName: `Customer ${i + 3}`,
    customerEmail: `customer${i + 3}@email.com`,
    loanAmount: Math.floor(Math.random() * 80000) + 20000,
    loanPurpose: 'Vehicle Purchase',
    status: (['submitted', 'under_review', 'approved', 'funded', 'declined'] as const)[
      Math.floor(Math.random() * 5)
    ],
    submittedDate: `2024-${String(Math.floor(Math.random() * 3) + 8).padStart(2, '0')}-${String(
      Math.floor(Math.random() * 28) + 1
    ).padStart(2, '0')}`,
    lastUpdated: '2024-10-05',
    documents: ['driver_license.pdf', 'payslip.pdf'],
  }))
);

export const mockVendorMetrics: VendorMetrics[] = [
  { vendorId: 'v1', vendorName: 'Premier Auto Sales', applicationCount: 156, approvalRate: 91, totalFunded: 4250000, avgLoanSize: 27244 },
  { vendorId: 'v2', vendorName: 'Elite Motors', applicationCount: 134, approvalRate: 88, totalFunded: 3890000, avgLoanSize: 29029 },
  { vendorId: 'v3', vendorName: 'City Car Dealership', applicationCount: 98, approvalRate: 85, totalFunded: 2450000, avgLoanSize: 25000 },
  { vendorId: 'v4', vendorName: 'Luxury Automotive', applicationCount: 87, approvalRate: 92, totalFunded: 3120000, avgLoanSize: 35862 },
  { vendorId: 'v5', vendorName: 'Budget Autos', applicationCount: 76, approvalRate: 79, totalFunded: 1520000, avgLoanSize: 20000 },
];
