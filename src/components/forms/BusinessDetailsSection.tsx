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
          <label className="font-semibold text-gray-700">Entity Name</label>
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

        <div>
          <label className="font-semibold text-gray-700">ABN Registered From</label>
          <input
            type="text"
            name="abnRegisteredFrom"
            value={formData.abnRegisteredFrom || ""}
            onChange={handleChange}
            className="w-full border rounded-lg p-3 bg-gray-100"
            readOnly
            placeholder="Prefilled from ABR"
          />
        </div>

        <div>
          <label className="font-semibold text-gray-700">ABN Status</label>
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
          <label className="font-semibold text-gray-700">GST Registered From</label>
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
            <option value="General">General</option>
            <option value="Beauty">Beauty</option>
            <option value="Gym">Gym</option>
            <option value="Hospitality">Hospitality</option>
            <option value="Retail">Retail</option>
            <option value="Transport">Transport</option>
            <option value="Construction">Construction</option>
            <option value="Other">Other</option>
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

      {/* ABN Verification Summary */}
      {formData.entityName && (
        <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
          <h3 className="text-green-800 font-semibold mb-2 flex items-center">
            ABN Verified
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
            <p>
              <strong>Entity Name:</strong> {formData.entityName || "-"}
            </p>
            <p>
              <strong>ABN Status:</strong> {formData.abnStatus || "-"}
            </p>
            <p>
              <strong>Entity Type:</strong> {formData.entityType || "-"}
            </p>
            <p>
              <strong>ABN Registered From:</strong> {formData.abnRegisteredFrom || "-"}
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
