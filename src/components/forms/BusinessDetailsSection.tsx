import React from 'react';
import { Loader2 } from 'lucide-react';

interface BusinessDetailsSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  abnLoading: boolean;
}

const BusinessDetailsSection: React.FC<BusinessDetailsSectionProps> = ({ 
  formData, 
  handleChange, 
  abnLoading 
}) => {
  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">BUSINESS DETAILS</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ABN Number *
            {abnLoading && <span className="ml-2 text-sm text-gray-500">(Looking up business details...)</span>}
          </label>
          <input
            type="text"
            name="abnNumber"
            value={formData.abnNumber}
            onChange={handleChange}
            maxLength={11}
            required
            placeholder="Enter 11-digit ABN"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entity Name</label>
          <input
            type="text"
            name="entityName"
            value={formData.entityName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ABN Status
            {formData.abnStatus === 'Active' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
            {formData.abnStatus === 'Inactive' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </label>
          <input
            type="text"
            name="abnStatus"
            value={formData.abnStatus}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
          <input
            type="text"
            name="entityType"
            value={formData.entityType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GST Registration
            {formData.gstFrom === 'Registered' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ GST Registered
              </span>
            )}
            {formData.gstFrom === 'Not Registered' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Not GST Registered
              </span>
            )}
          </label>
          <input
            type="text"
            name="gstFrom"
            value={formData.gstFrom || ''}
            onChange={handleChange}
            placeholder="GST status will appear here"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
          <select
            name="product"
            value={formData.product}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="Classic Lease">Classic Lease (Rental)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industry Type *</label>
          <select
            name="industryType"
            value={formData.industryType}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="Hospitality">Yes, Hospitality</option>
            <option value="Beauty">Yes, Beauty</option>
            <option value="Fitness">Yes, Fitness</option>
            <option value="No">NO</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website *</label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Information</label>
        <textarea
          name="additionalInfo"
          value={formData.additionalInfo}
          onChange={handleChange}
          rows={3}
          placeholder="Eg: Reason for Investment, Company Background etc"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        />
      </div>
    </div>
  );
};

export default BusinessDetailsSection;