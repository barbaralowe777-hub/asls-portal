import React, { useState } from 'react';
import { Upload, Camera, ChevronDown } from 'lucide-react';

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
      handleFileChange('supportingDocs', file, selectedDocType);
    } else if (file) {
      alert('Please select a document type first');
      e.target.value = '';
    }
  };

  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">SELECT BROKERAGE AND TERM</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Amount (Ex GST) $ *</label>
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
          </select>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Document Upload</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Drivers Licence Front</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                id="driversLicenseFront"
                accept="image/*"
                onChange={(e) => handleFileChange('driversLicenseFront', e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="driversLicenseFront" className="cursor-pointer">
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {files.driversLicenseFront ? files.driversLicenseFront.name : 'Take Photo or Upload'}
                </p>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Drivers Licence Back</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                id="driversLicenseBack"
                accept="image/*"
                onChange={(e) => handleFileChange('driversLicenseBack', e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="driversLicenseBack" className="cursor-pointer">
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {files.driversLicenseBack ? files.driversLicenseBack.name : 'Take Photo or Upload'}
                </p>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medicare Card</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                id="medicareCard"
                accept="image/*"
                onChange={(e) => handleFileChange('medicareCard', e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="medicareCard" className="cursor-pointer">
                <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {files.medicareCard ? files.medicareCard.name : 'Take Photo or Upload'}
                </p>
              </label>
            </div>
          </div>

          <div>
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
                  <p className="text-sm text-gray-600">
                    {files.supportingDocs ? `${selectedDocType}: ${files.supportingDocs.name}` : 'Upload Documents'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Select type above, then upload
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerageSection;