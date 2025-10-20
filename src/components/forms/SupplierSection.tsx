import React from 'react';
import { Loader2 } from 'lucide-react';

interface SupplierSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  supplierAbnLoading: boolean;
}

const SupplierSection: React.FC<SupplierSectionProps> = ({ 
  formData, 
  handleChange,
  supplierAbnLoading 
}) => {
  return (
    <div className="border-b pb-8">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">SUPPLIER IDENTIFICATION</h2>
      <div className="grid md:grid-cols-2 gap-6">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
          <input
            type="text"
            name="supplierBusinessName"
            value={formData.supplierBusinessName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
            readOnly={supplierAbnLoading}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
          <input
            type="text"
            name="supplierCity"
            value={formData.supplierCity}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
          <select
            name="supplierState"
            value={formData.supplierState}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="">Please Select</option>
            <option value="NSW">New South Wales</option>
            <option value="VIC">Victoria</option>
            <option value="QLD">Queensland</option>
            <option value="WA">Western Australia</option>
            <option value="SA">South Australia</option>
            <option value="TAS">Tasmania</option>
            <option value="ACT">Australian Capital Territory</option>
            <option value="NT">Northern Territory</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
          <input
            type="text"
            name="supplierPostcode"
            value={formData.supplierPostcode}
            onChange={handleChange}
            maxLength={4}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
    </div>
  );
};

export default SupplierSection;