import React, { useState } from 'react';
import { Upload } from 'lucide-react';

interface BrokerageSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  files: any;
  handleFileChange: (key: string, file: File | null, docType?: string) => void;
}

const documentTypes = [
  'Lease Agreement',
  'Landlords Waiver', 
  'Rates Notice',
  'Trust Deeds',
  'Financial Statements',
  'Other'
];

const BrokerageSection: React.FC<BrokerageSectionProps> = ({ 
  formData, 
  handleChange,
  files,
  handleFileChange 
}) => {
  const [selectedDocType, setSelectedDocType] = useState('');
  
  const handleSupportingDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && selectedDocType) {
      if (Array.isArray(files.supportingDocs) && files.supportingDocs.length >= 4) {
        alert("You can upload up to 4 supporting documents.");
        e.target.value = "";
        return;
      }
      handleFileChange('supportingDocs', file, selectedDocType);
    } else if (file) {
      alert('Please select a document type first');
      e.target.value = '';
    }
  };

  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">PURCHASE PRICE AND TERMS</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (Incl GST) $ *</label>
          <input
            type="number"
            name="invoiceAmount"
            value={formData.invoiceAmount}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Choose Term *</label>
          <select
            name="term"
            value={formData.term}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="24">24 months</option>
            <option value="36">36 months</option>
            <option value="48">48 months</option>
            <option value="60">60 months</option>
            <option value="72">72 months</option>
            <option value="84">84 months</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Paid $</label>
          <input
            type="number"
            name="depositPaid"
            value={formData.depositPaid || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount of Finance Requested (Incl GST) $</label>
          <input
            type="number"
            name="financeAmount"
            value={formData.financeAmount || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
            readOnly
          />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Supporting Documents</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Documents</label>
            <div className="space-y-3">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Document Type</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  id="supportingDocs"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleSupportingDocUpload}
                  className="hidden"
                />
                <label htmlFor="supportingDocs" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Upload Documents</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Select type above, then upload (max 4 files)
                  </p>
                </label>
              </div>
            </div>
            {Array.isArray(files.supportingDocs) && files.supportingDocs.length > 0 && (
              <ul className="mt-3 text-sm text-gray-700 list-disc pl-5">
                {files.supportingDocs.map((d: any, idx: number) => (
                  <li key={idx}>{d.type ? `${d.type}: ` : ''}{d.name || d.file?.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerageSection;
