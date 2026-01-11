import React from 'react';
import { Loader2 } from 'lucide-react';

interface SupplierSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  supplierAbnLoading: boolean;
  vendorPrefillLoading?: boolean;
  vendorPrefillError?: string | null;
  vendorPrefillLocked?: boolean;
  agentId?: string | null;
}

const SupplierSection: React.FC<SupplierSectionProps> = ({ 
  formData, 
  handleChange,
  supplierAbnLoading,
  vendorPrefillLoading = false,
  vendorPrefillError = null,
  vendorPrefillLocked = false,
  agentId = null,
}) => {
  const lockClass = vendorPrefillLocked ? "bg-gray-50 cursor-not-allowed" : "";
  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">SUPPLIER IDENTIFICATION</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:col-span-2 grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent ID</label>
            <input
              type="text"
              value={agentId || ""}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent First Name</label>
            <input
              type="text"
              name="agentFirstName"
              value={formData.agentFirstName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent Last Name</label>
            <input
              type="text"
              name="agentLastName"
              value={formData.agentLastName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor ID
              {vendorPrefillLoading && <Loader2 className="inline w-4 h-4 ml-2 animate-spin text-green-600" />}
            </label>
            <input
              type="text"
              name="vendorId"
              value={formData.vendorId || ''}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            {vendorPrefillError ? (
              <p className="text-sm text-red-600 mt-1">{vendorPrefillError}</p>
            ) : (
              vendorPrefillLocked &&
              formData.vendorName && (
                <p className="text-sm text-green-600 mt-1">
                  Prefilled for {formData.vendorName}
                </p>
              )
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name</label>
            <input
              type="text"
              name="vendorName"
              value={formData.vendorName || ''}
              onChange={handleChange}
              readOnly={vendorPrefillLocked}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${lockClass}`}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Is The Supplier Accredited with the Lender? *
          </label>
          <select
            name="supplierAccredited"
            value={formData.supplierAccredited}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier ABN Number
            {supplierAbnLoading && <Loader2 className="inline w-4 h-4 ml-2 animate-spin" />}
          </label>
          <input
            type="text"
            name="supplierAbn"
            value={formData.supplierAbn}
            onChange={handleChange}
            maxLength={11}
            readOnly={vendorPrefillLocked}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${lockClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
          <input
            type="text"
            name="supplierBusinessName"
            value={formData.supplierBusinessName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${vendorPrefillLocked ? "bg-gray-50 cursor-not-allowed" : ""}`}
            readOnly={vendorPrefillLocked || supplierAbnLoading}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Address *</label>
          <input
            type="text"
            name="supplierAddress"
            value={formData.supplierAddress}
            onChange={handleChange}
            required
            placeholder="Street Address"
            readOnly={vendorPrefillLocked}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${lockClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
          <input
            type="email"
            name="supplierEmail"
            value={formData.supplierEmail}
            onChange={handleChange}
            required
            placeholder="example@example.com"
            readOnly={vendorPrefillLocked}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${lockClass}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <input
            type="tel"
            name="supplierPhone"
            value={formData.supplierPhone}
            onChange={handleChange}
            required
            readOnly={vendorPrefillLocked}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 ${lockClass}`}
          />
        </div>
      </div>
    </div>
  );
};

export default SupplierSection;
