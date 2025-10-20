import React, { useState } from 'react';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VendorIntakeFormProps {
  onBack: () => void;
  onSubmit: () => void;
}

const VendorIntakeForm: React.FC<VendorIntakeFormProps> = ({ onBack, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [formData, setFormData] = useState({
    abnNumber: '',
    businessName: '',
    entityType: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    zipCode: '',
    email: '',
    phone: '',
    bsb: '',
    accountNumber: '',
    accountName: '',
    bankBranch: '',
    inverters: [] as string[],
    batteries: [] as string[],
    panels: [] as string[],
    otherInverters: '',
    otherBatteries: '',
    otherPanels: ''
  });
  const [files, setFiles] = useState<File[]>([]);

  const inverterBrands = ['Canadian Solar', 'Energizer', 'Enphase', 'Eveready', 'Fronius', 'Goodwe/GE', 'Growatt', 'Huawei', 'Solis', 'SMA', 'Sungrow', 'Tesla', 'Other'];
  const batteryBrands = ['Goodwe', 'Growatt', 'Huwaei', 'Jinko', 'LG', 'SolaX', 'SMA', 'Sungrow', 'Tesla', 'Other'];
  const panelBrands = ['Goodwe', 'Jinko', 'Sungrow', 'Sunpro', 'Trina', 'Other'];

 // ---------- ABN LOOKUP (Vendor Form) ----------
const handleAbnLookup = async (rawAbn: string) => {
  const abn = rawAbn.replace(/\D/g, "");
  if (!/^\d{11}$/.test(abn)) return;

  setAbnLoading(true);
  try {
    const response = await fetch(
      `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=7fa83c92-adf9-4560-9709-b4517841d97f`
    );
    const text = await response.text();

    // 👇 safely extract JSON
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Invalid ABR response format");
    const jsonString = text.substring(start, end + 1);
    const data = JSON.parse(jsonString);

    if (!data?.Abn) {
      console.warn("No ABN data found:", abn);
      return;
    }

    // map ABR data to your existing form field names
    const entityName =
      data.EntityName ||
      data.MainName?.OrganisationName ||
      data.MainTradingName?.OrganisationName ||
      "";
    const entityType = data.EntityType?.EntityDescription || "";
    const address = data.MainBusinessPhysicalAddress || {};

    setFormData((prev) => ({
      ...prev,
      businessName: entityName || prev.businessName,
      entityType: entityType || prev.entityType,
      streetAddress:
        address.StreetNumber || address.StreetName
          ? `${address.StreetNumber ?? ""} ${address.StreetName ?? ""}`.trim()
          : prev.streetAddress,
      city: address.Suburb || prev.city,
      state: address.StateCode || prev.state,
      zipCode: address.Postcode || prev.zipCode,
    }));
  } catch (err) {
    console.error("ABN lookup error →", err);
  } finally {
    setAbnLoading(false);
  }
};


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'abnNumber' && value.length === 11) {
      handleAbnLookup(value);
    }
  };

  const handleCheckbox = (category: 'inverters' | 'batteries' | 'panels', brand: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: prev[category].includes(brand) 
        ? prev[category].filter(b => b !== brand)
        : [...prev[category], brand]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const referenceNumber = `VI-${Date.now()}`;
    const applicationData = { ...formData, referenceNumber, files: files.map(f => f.name) };
    
    try {
      await supabase.functions.invoke('send-email', {
        body: { type: 'application_received', to: formData.email, applicationData }
      });
      
      await supabase.functions.invoke('send-email', {
        body: { type: 'admin_notification', applicationData }
      });
      
      console.log('Vendor application submitted:', applicationData);
      onSubmit();
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Vendor Intake Form</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">
                ABN Number*
                {abnLoading && <span className="ml-2 text-sm text-gray-500">(Looking up...)</span>}
              </label>
              <input type="text" name="abnNumber" value={formData.abnNumber} onChange={handleChange} 
                className="w-full p-3 border rounded-lg" required maxLength={11} />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Business Name*</label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange}
                className="w-full p-3 border rounded-lg" required />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Entity Type</label>
              <select name="entityType" value={formData.entityType} onChange={handleChange}
                className="w-full p-3 border rounded-lg">
                <option value="">Please Select</option>
                <option value="Sole Trader">Sole Trader</option>
                <option value="Company">Company</option>
                <option value="Trust">Trust</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Registered Address of Business*</label>
              <input type="text" name="streetAddress" placeholder="Street Address" 
                value={formData.streetAddress} onChange={handleChange} className="w-full p-3 border rounded-lg mb-3" required />
              <input type="text" name="streetAddress2" placeholder="Street Address Line 2"
                value={formData.streetAddress2} onChange={handleChange} className="w-full p-3 border rounded-lg mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="city" placeholder="City" value={formData.city} 
                  onChange={handleChange} className="p-3 border rounded-lg" />
                <input type="text" name="state" placeholder="State" value={formData.state}
                  onChange={handleChange} className="p-3 border rounded-lg" />
              </div>
              <input type="text" name="zipCode" placeholder="Zip Code" value={formData.zipCode}
                onChange={handleChange} className="w-full p-3 border rounded-lg mt-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full p-3 border rounded-lg" placeholder="example@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full p-3 border rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Bank Details for Commission Payments*</label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm">BSB</label>
                    <input type="text" name="bsb" value={formData.bsb} onChange={handleChange}
                      className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="text-sm">Account Number</label>
                    <input type="text" name="accountNumber" value={formData.accountNumber} 
                      onChange={handleChange} className="w-full p-2 border rounded" />
                  </div>
                </div>
                <div>
                  <label className="text-sm">Account Name</label>
                  <input type="text" name="accountName" value={formData.accountName}
                    onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="text-sm">Bank and Branch</label>
                  <input type="text" name="bankBranch" value={formData.bankBranch}
                    onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Must Provide Certificate of Business and Trust Deeds if applicable*
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">Drag and drop files here</p>
                <input type="file" multiple onChange={handleFileChange} className="hidden" id="fileUpload" />
                <label htmlFor="fileUpload" className="cursor-pointer text-blue-600 hover:underline">
                  Choose files
                </label>
                {files.length > 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    {files.map((file, i) => <div key={i}>{file.name}</div>)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Brands of Inverters You Provide*</label>
              <div className="grid grid-cols-3 gap-3">
                {inverterBrands.map(brand => (
                  <label key={brand} className="flex items-center">
                    <input type="checkbox" checked={formData.inverters.includes(brand)}
                      onChange={() => handleCheckbox('inverters', brand)} className="mr-2" />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))}
              </div>
              {formData.inverters.includes('Other') && (
                <div className="mt-3">
                  <input 
                    type="text" 
                    name="otherInverters" 
                    placeholder="Please specify other inverter brands" 
                    value={formData.otherInverters}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Brands of Batteries You Provide*</label>
              <div className="grid grid-cols-3 gap-3">
                {batteryBrands.map(brand => (
                  <label key={brand} className="flex items-center">
                    <input type="checkbox" checked={formData.batteries.includes(brand)}
                      onChange={() => handleCheckbox('batteries', brand)} className="mr-2" />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))}
              </div>
              {formData.batteries.includes('Other') && (
                <div className="mt-3">
                  <input 
                    type="text" 
                    name="otherBatteries" 
                    placeholder="Please specify other battery brands" 
                    value={formData.otherBatteries}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Brands of Modules/Panels You Provide*</label>
              <div className="grid grid-cols-3 gap-3">
                {panelBrands.map(brand => (
                  <label key={brand} className="flex items-center">
                    <input type="checkbox" checked={formData.panels.includes(brand)}
                      onChange={() => handleCheckbox('panels', brand)} className="mr-2" />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))}
              </div>
              {formData.panels.includes('Other') && (
                <div className="mt-3">
                  <input 
                    type="text" 
                    name="otherPanels" 
                    placeholder="Please specify other panel/module brands" 
                    value={formData.otherPanels}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6">
              <button type="button" onClick={onBack} className="px-6 py-3 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="inline w-5 h-5 mr-2" />Back
              </button>
              <button type="submit" disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? <Loader2 className="inline w-5 h-5 animate-spin mr-2" /> : null}
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorIntakeForm;