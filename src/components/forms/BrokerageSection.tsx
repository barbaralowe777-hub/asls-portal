import React from 'react';

interface BrokerageSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const BrokerageSection: React.FC<BrokerageSectionProps> = ({
  formData,
  handleChange,
}) => {
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
    </div>
  );
};

export default BrokerageSection;
