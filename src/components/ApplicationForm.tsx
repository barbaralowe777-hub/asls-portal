import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BusinessDetailsSection from "./forms/BusinessDetailsSection";
import AddressDetailsSection from "./forms/AddressDetailsSection";
import SupplierSection from "./forms/SupplierSection";
import BrokerageSection from "./forms/BrokerageSection";
import EquipmentDetailsSection from "./forms/EquipmentDetailsSection";

// ✅ Load Google Maps API once
const loadGoogleMapsScript = (callback: () => void) => {
  if (window.google && window.google.maps) {
    callback();
    return;
  }
  const existingScript = document.getElementById("googleMaps");
  if (existingScript) {
    existingScript.addEventListener("load", callback);
    return;
  }
  const script = document.createElement("script");
  script.id = "googleMaps";
  script.src = `https://maps.googleapis.com/maps/api/js?key=${
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  }&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.body.appendChild(script);
};

interface ApplicationFormProps {
  onBack?: () => void;
  onSubmit?: () => void;
}

const digitsOnly = (v: string) => v.replace(/\D/g, "");

const ApplicationForm: React.FC<ApplicationFormProps> = ({ onBack, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [supplierAbnLoading, setSupplierAbnLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  const [files, setFiles] = useState({
    driversLicenseFront: null as File | null,
    driversLicenseBack: null as File | null,
    medicareCard: null as File | null,
    supportingDocs: [] as File[],
  });

  const [equipmentItems, setEquipmentItems] = useState([
    {
      category: "",
      asset: "",
      quantity: "",
      unitPrice: "",
      manufacturer: "",
      serialNumber: "As per Dealer Invoice/Annexure",
      description: "",
    },
  ]);

  const [formData, setFormData] = useState({
    abnNumber: "",
    entityName: "",
    abnStatus: "",
    entityType: "",
    gstFrom: "",
    product: "",
    industryType: "",
    website: "",
    additionalInfo: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
    premisesType: "",
    leaseExpiryDate: "",
    email: "",
    phone: "",
    supplierAccredited: "",
    agentFirstName: "",
    agentLastName: "",
    supplierAbn: "",
    supplierBusinessName: "",
    supplierAddress: "",
    supplierCity: "",
    supplierState: "",
    supplierPostcode: "",
    supplierEmail: "",
    supplierPhone: "",
    invoiceAmount: "",
    term: "",
  });

  const abnDebounceRef = useRef<number | null>(null);
  const supplierAbnDebounceRef = useRef<number | null>(null);

  // ---------- ABN LOOKUP ----------
const handleAbnLookup = async (rawAbn: string) => {
  const abn = rawAbn.replace(/\D/g, "");
  if (!/^\d{11}$/.test(abn)) return;

  setAbnLoading(true);
  try {
    const response = await fetch(
      `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=7fa83c92-adf9-4560-9709-b4517841d97f`
    );
    const text = await response.text();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Invalid ABR response");
    const data = JSON.parse(text.substring(start, end + 1));

    setFormData((prev) => ({
      ...prev,
      abnNumber: abn,
      entityName:
        data.EntityName ||
        data.MainName?.OrganisationName ||
        data.MainTradingName?.OrganisationName ||
        prev.entityName,
      entityType: data.EntityType?.EntityDescription || prev.entityType,
      abnStatus: data.AbnStatus || prev.abnStatus,
      gstFrom: data.Gst?.EffectiveFrom
        ? new Date(data.Gst.EffectiveFrom).toLocaleDateString("en-AU")
        : prev.gstFrom,
    }));
    console.log("✅ ABN lookup successful", data);
  } catch (err) {
    console.error("❌ ABN lookup failed", err);
  } finally {
    setAbnLoading(false);
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const referenceNumber = `ASLS-${Date.now()}`;
    const total = equipmentItems.reduce(
      (sum, it) =>
        sum + (parseFloat(it.unitPrice) || 0) * (parseInt(it.quantity) || 0),
      0
    );

    const payload = {
      ...formData,
      equipmentItems,
      total,
      referenceNumber,
    };

    try {
      console.log("Submitting:", payload);
      onSubmit?.();
    } catch (err) {
      console.error("Submit failed", err);
      onSubmit?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <button
          onClick={onBack}
          className="flex items-center text-[#1dad21] hover:text-green-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Commercial Solar Application Form
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <BusinessDetailsSection
            formData={formData}
            handleChange={() => {}}
            abnLoading={abnLoading}
          />
          <AddressDetailsSection
            formData={formData}
            handleChange={() => {}}
            addressLoading={addressLoading}
            addressSuggestions={addressSuggestions}
            selectAddress={() => {}}
            handleAddressVerify={() => {}}
          />
          <SupplierSection
            formData={formData}
            handleChange={() => {}}
            supplierAbnLoading={supplierAbnLoading}
          />
          <BrokerageSection
            formData={formData}
            handleChange={() => {}}
            files={files}
            handleFileChange={() => {}}
            handleMultipleFiles={() => {}}
            removeSupportingDocAt={() => {}}
          />
          <EquipmentDetailsSection
            equipmentItems={equipmentItems}
            addEquipmentItem={() => {}}
            removeEquipmentItem={() => {}}
            updateEquipmentItem={() => {}}
          />

          <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex justify-between items-center">
            <span className="text-lg font-medium text-gray-800">
              Total Amount (Ex GST):
            </span>
            <span className="text-2xl font-bold text-green-600">
              $
              {equipmentItems.reduce(
                (sum, it) =>
                  sum +
                  (parseFloat(it.unitPrice) || 0) * (parseInt(it.quantity) || 0),
                0
              )}
            </span>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-full bg-[#1dad21] text-white hover:bg-green-700 flex items-center"
            >
              {loading && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
              )}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
