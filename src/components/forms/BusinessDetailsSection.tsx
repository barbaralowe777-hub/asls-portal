import React from "react";
import { Loader2 } from "lucide-react";

interface BusinessDetailsSectionProps {
  formData: any;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  abnLoading: boolean;
}

const BusinessDetailsSection: React.FC<BusinessDetailsSectionProps> = ({
  formData,
  handleChange,
  abnLoading,
}) => {
  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Business Details
      </h2>

      {/* ABN Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="font-semibold text-gray-700">
            ABN Number<span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="abnNumber"
              value={formData.abnNumber}
              onChange={handleChange}
              placeholder="Enter ABN (11 digits)"
              className="w-full border rounded-lg p-3"
              required
            />
            {abnLoading && (
              <Loader2 className="animate-spin w-5 h-5 text-green-600" />
            )}
          </div>
        </div>

        <div>
          <label className="font-semibold text-gray-700">
            Entity Name
          </label>
          <input
            type="text"
            name="entityName"
            value={formData.entityName}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 bg-gray-100"
            readOnly
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">Entity Type</label>
          <select
            name="entityType"
            value={formData.entityType}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
          >
            <option value="">Please Select</option>
            <option value="Sole Trader">Sole Trader</option>
            <option value="Company">Company</option>
            <option value="Trust">Trust</option>
          </select>
        </div>

        {(formData.entityType === 'Company' || formData.entityType === 'Trust') && (
          <div>
            <label className="font-semibold text-gray-700">Date of Incorporation</label>
            <input
              type="date"
              name="dateOfIncorporation"
              value={formData.dateOfIncorporation || ''}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
            />
          </div>
        )}

        <div>
          <label className="font-semibold text-gray-700">
            ABN Status
          </label>
          <input
            type="text"
            name="abnStatus"
            value={formData.abnStatus}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 bg-gray-100"
            readOnly
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">
            GST Registered From
          </label>
          <input
            type="text"
            name="gstFrom"
            value={formData.gstFrom}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 bg-gray-100"
            readOnly
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@example.com"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">Website</label>
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="e.g. www.businessname.com.au"
            className="w-full border rounded-lg p-3"
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">Industry Type</label>
          <select
            name="industryType"
            value={formData.industryType}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
          >
            <option value="">Please Select</option>
            <option>Agriculture, Forestry and Fishing</option>
            <option>Mining and Quarrying</option>
            <option>Food and Beverage Manufacturing</option>
            <option>Fabricated Metal Product Manufacturing</option>
            <option>Machinery and Equipment Manufacturing</option>
            <option>Wood, Paper and Printing</option>
            <option>Plastics, Rubber and Chemical Manufacturing</option>
            <option>Building Construction</option>
            <option>Civil Construction and Earthmoving</option>
            <option>Electrical, Plumbing and Air Conditioning Services</option>
            <option>Landscaping and Fencing</option>
            <option>Painting, Plastering and Other Finishing Trades</option>
            <option>Road Freight Transport</option>
            <option>Passenger Transport (Bus, Taxi, Charter, Rideshare)</option>
            <option>Warehousing and Storage</option>
            <option>Courier and Delivery Services</option>
            <option>Transport Support Services (Tow, Pilot, etc.)</option>
            <option>Motor Vehicle and Parts Retailing</option>
            <option>Hardware and Building Supplies</option>
            <option>Fuel Retailing</option>
            <option>Electrical and Electronic Goods Retailing</option>
            <option>Wholesale Trade (Machinery, Industrial Equipment, Food, etc.)</option>
            <option>Accounting and Bookkeeping</option>
            <option>Legal Services</option>
            <option>Management Consulting</option>
            <option>Real Estate and Property Management</option>
            <option>Engineering and Architecture</option>
            <option>Medical, Dental and Allied Health</option>
            <option>Aged Care and Disability Services</option>
            <option>Childcare and Early Education</option>
            <option>Community and Social Assistance</option>
            <option>Accommodation (Hotels, Motels, Caravan Parks)</option>
            <option>Food and Beverage (Restaurants, Cafés, Takeaway)</option>
            <option>Events and Entertainment Services</option>
            <option>Travel Agencies and Tour Operators</option>
            <option>IT Services and Software Development</option>
            <option>Telecommunications</option>
            <option>Internet and Data Services</option>
            <option>Digital Marketing and Media</option>
            <option>Primary and Secondary Education</option>
            <option>Vocational and Tertiary Education</option>
            <option>Training and Certification Providers</option>
            <option>Government Administration</option>
            <option>Religious and Charitable Organisations</option>
            <option>Emergency and Security Services</option>
            <option>Farming and Livestock</option>
            <option>Agricultural Machinery Sales and Service</option>
            <option>Veterinary Services</option>
            <option>Produce and Feed Supply</option>
            <option>Financial Services (Brokers, Advisors, Lenders)</option>
            <option>Insurance Agencies and Underwriting</option>
            <option>Superannuation and Investment Firms</option>
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2">
          <label className="font-semibold text-gray-700">Narrative of Customer</label>
          <textarea
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg p-3"
            placeholder="ie family business, industry experience, extenuating circumstances that may affect this loan etc"
          />
        </div>
      </div>

      {/* ✅ Optional ABN Verification Summary */}
      {formData.entityName && (
        <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold mb-2 flex items-center">
            ABN Verified ✅
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
            <p>
              <strong>Entity Name:</strong> {formData.entityName || "—"}
            </p>
            <p>
              <strong>ABN Status:</strong> {formData.abnStatus || "—"}
            </p>
            <p>
              <strong>Entity Type:</strong> {formData.entityType || "—"}
            </p>
            <p>
              <strong>GST Registered From:</strong>{" "}
              {formData.gstFrom || "Not Registered"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetailsSection;
