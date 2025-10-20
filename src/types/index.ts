export type ApplicationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'funded' 
  | 'declined';

export type VendorStatus = 'pending' | 'accredited' | 'suspended';

export interface Vendor {
  id: string;
  businessName: string;
  abn: string;
  email: string;
  phone: string;
  status: VendorStatus;
  apiKey?: string;
  accreditedDate?: string;
  totalApplications: number;
  approvedApplications: number;
  totalFunded: number;
}

export interface Application {
  id: string;
  vendorId: string;
  vendorName: string;
  customerName: string;
  customerEmail: string;
  loanAmount: number;
  loanPurpose: string;
  status: ApplicationStatus;
  submittedDate: string;
  lastUpdated: string;
  actionRequired?: string;
  documents: string[];
}

export interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  applicationCount: number;
  approvalRate: number;
  totalFunded: number;
  avgLoanSize: number;
}
