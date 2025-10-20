 import React, { useState, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BusinessDetailsSection from './forms/BusinessDetailsSection';
import AddressDetailsSection from './forms/AddressDetailsSection';
import SupplierSection from './forms/SupplierSection';
import BrokerageSection from './forms/BrokerageSection';
import EquipmentDetailsSection from './forms/EquipmentDetailsSection';

interface ApplicationFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

const digitsOnly = (v: string) => v.replace(/\D/g, '');

const ApplicationForm: React.FC<ApplicationFormProps> = ({ onBack, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [supplierAbnLoading, setSupplierAbnLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  // Single files + multi for supporting docs (kept in parent state)
  const [files, setFiles] = useState<{
    driversLicenseFront: File | null;
    driversLicenseBack: File | null;
    medicareCard: File | null;
    supportingDocs: File[]; // multiple
  }>({
    driversLicenseFront: null,
    driversLicenseBack: null,
    medicareCard: null,
    supportingDocs: [],
  });

  const [equipmentItems, setEquipmentItems] = useState([{
    category: '',
    asset: '',
    quantity: '',
    unitPrice: '',
    manufacturer: '',
    serialNumber: 'As per Dealer Invoice/Annexure',
    description: ''
  }]);

  const [formData, setFormData] = useState({
    // Business Details
    abnNumber: '',
    entityName: '',
    abnStatus: '',
    entityType: '',
    gstFrom: '',
    product: '',
    industryType: '',
    website: '',
    additionalInfo: '',
    // Address Details
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    premisesType: '',
    leaseExpiryDate: '',
    email: '',
    phone: '',
    // Supplier
    supplierAccredited: '',
    agentFirstName: '',
    agentLastName: '',
    supplierAbn: '',
    supplierBusinessName: '',
    supplierAddress: '',
    supplierCity: '',
    supplierState: '',
    supplierPostcode: '',
    supplierEmail: '',
    supplierPhone: '',
    // Finance
    invoiceAmount: '',
    term: ''
  });

  // Debouncers for ABNs
  const abnDebounceRef = useRef<number | null>(null);
  const supplierAbnDebounceRef = useRef<number | null>(null);

  // ---------- ABN LOOKUP (direct call to ABR API) ----------
const handleAbnLookup = async (rawAbn: string) => {
  const abn = digitsOnly(rawAbn);
  if (!/^\d{11}$/.test(abn)) return;

  setAbnLoading(true);
  try {
    const response = await fetch(
      `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=7fa83c92-adf9-4560-9709-b4517841d97f`
    );

    const text = await response.text();

    // 👇 Safely extract JSON from JSONP
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Invalid ABR response format");
    const jsonString = text.substring(start, end + 1);

    const data = JSON.parse(jsonString);

    if (!data?.Abn) {
      console.warn("No valid ABN data", data);
      return;
    }

    const entityName =
      data.EntityName ||
      data.MainName?.OrganisationName ||
      data.MainTradingName?.OrganisationName ||
      "";
    const entityType = data.EntityType?.EntityDescription || "";
    const abnStatus = data.AbnStatus || "";
    const gstFrom = data.Gst?.EffectiveFrom || "";
    const address = data.MainBusinessPhysicalAddress || {};

    setFormData((prev) => ({
      ...prev,
      entityName,
      abnStatus,
      entityType,
      gstFrom: gstFrom
        ? `Registered from ${gstFrom}`
        : data.Gst
        ? "Registered"
        : "Not Registered",
      streetAddress:
        address.StreetName || address.StreetNumber
          ? `${address.StreetNumber ?? ""} ${address.StreetName ?? ""}`.trim()
          : prev.streetAddress,
      city: address.Suburb || prev.city,
      state: address.StateCode || prev.state,
      postcode: address.Postcode || prev.postcode,
    }));
  } catch (err) {
    console.error("ABN fetch error →", err);
  } finally {
    setAbnLoading(false);
  }
};



  // ---------- Address Verify ----------
  const handleAddressVerify = async () => {
    if (formData.streetAddress.length < 5) return;
    setAddressLoading(true);
    try {
      const fullAddress = `${formData.streetAddress} ${formData.city} ${formData.state} ${formData.postcode}`;
      const { data } = await supabase.functions.invoke('address-verify', { body: { address: fullAddress } });
      if (data?.suggestions) setAddressSuggestions(data.suggestions);
    } finally {
      setAddressLoading(false);
    }
  };

  const selectAddress = (s: any) => {
    setFormData(prev => ({
      ...prev,
      streetAddress: `${s.streetNumber} ${s.streetName} ${s.streetType}`,
      city: s.suburb,
      state: s.state,
      postcode: s.postcode
    }));
    setAddressSuggestions([]);
  };

  // ---------- File handlers (only functions here; inputs live in BrokerageSection) ----------
  const handleFileChange = (key: string, file: File | null, docType?: string) => {
    setFiles(prev => {
      if (key === 'supportingDocs') {
        const next = { ...prev, supportingDocs: [...prev.supportingDocs] };
        if (file) next.supportingDocs.push(file);
        return next;
      }
      return { ...prev, [key]: file } as any;
    });
    if (docType && file) console.log(`Uploaded: ${docType} - ${file.name}`);
  };

  const handleMultipleFiles = (key: string, incoming: File[], docType?: string) => {
    setFiles(prev => {
      if (key === 'supportingDocs') {
        return { ...prev, supportingDocs: [...prev.supportingDocs, ...incoming] };
      }
      return prev;
    });
    if (docType && incoming?.length) console.log(`Uploaded: ${docType} x${incoming.length}`);
  };

  const removeSupportingDocAt = (index: number) => {
    setFiles(prev => {
      const next = [...prev.supportingDocs];
      next.splice(index, 1);
      return { ...prev, supportingDocs: next };
    });
  };

  // ---------- Equipment ----------
  const addEquipmentItem = () => {
    setEquipmentItems(prev => ([...prev, {
      category: '', asset: '', quantity: '', unitPrice: '', manufacturer: '',
      serialNumber: 'As per Dealer Invoice/Annexure', description: ''
    }]));
  };
  const removeEquipmentItem = (i: number) => setEquipmentItems(prev => prev.filter((_, idx) => idx !== i));
  const updateEquipmentItem = (i: number, field: string, value: string) => {
    setEquipmentItems(prev => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; });
  };
  const calculateTotal = () =>
    equipmentItems.reduce((t, it) => t + ((parseFloat(it.unitPrice) || 0) * (parseInt(it.quantity) || 0)), 0);

  // ---------- Unified change handler with ABN debounce ----------
  const abnDebounce = (value: string, fn: (v: string) => void, ref: React.MutableRefObject<number | null>) => {
    const cleaned = digitsOnly(value);
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(() => {
      if (/^\d{11}$/.test(cleaned)) fn(cleaned);
    }, 400);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'abnNumber') abnDebounce(value, handleAbnLookup, abnDebounceRef);
    if (name === 'supplierAbn') abnDebounce(value, handleSupplierAbnLookup, supplierAbnDebounceRef);
  };

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const referenceNumber = `ASLS-${Date.now()}`;
    const filesSummary = {
      driversLicenseFront: files.driversLicenseFront?.name || null,
      driversLicenseBack: files.driversLicenseBack?.name || null,
      medicareCard: files.medicareCard?.name || null,
      supportingDocs: files.supportingDocs.map((f) => f.name),
    };

    const applicationData = {
      ...formData,
      equipmentItems,
      files: filesSummary,
      totalAmount: calculateTotal().toFixed(2),
      referenceNumber
    };

    try {
      if (formData.email) {
        await supabase.functions.invoke('send-email', {
          body: { type: 'application_received', to: formData.email, applicationData }
        });
      }
      console.log('Application submitted:', applicationData);
      onSubmit();
    } catch (e) {
      console.error('Error submitting application:', e);
      onSubmit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center text-[#1dad21] mb-6 hover:text-green-700">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Commercial Solar Application Form</h1>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Business Details</span>
              <span>Address</span>
              <span>Supplier</span>
              <span>Finance</span>
              <span>Equipment</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <BusinessDetailsSection
              formData={formData}
              handleChange={handleChange}
              abnLoading={abnLoading}
            />

            <AddressDetailsSection
              formData={formData}
              handleChange={handleChange}
              addressLoading={addressLoading}
              addressSuggestions={addressSuggestions}
              selectAddress={selectAddress}
              handleAddressVerify={handleAddressVerify}
            />

            <SupplierSection
              formData={formData}
              handleChange={handleChange}
              supplierAbnLoading={supplierAbnLoading}
            />

            <BrokerageSection
              formData={formData}
              handleChange={handleChange}
              files={files}
              handleFileChange={handleFileChange}
              handleMultipleFiles={handleMultipleFiles}
              removeSupportingDocAt={removeSupportingDocAt}
            />

            <EquipmentDetailsSection
              equipmentItems={equipmentItems}
              addEquipmentItem={addEquipmentItem}
              removeEquipmentItem={removeEquipmentItem}
              updateEquipmentItem={updateEquipmentItem}
            />

            {/* Total Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total Equipment Amount (Ex GST):</span>
                <span className="text-2xl font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={onBack} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-6 py-3 bg-[#1dad21] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;
 