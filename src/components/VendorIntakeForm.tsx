import React, { useState } from "react";
import { Loader2, ArrowLeft, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  onBack: () => void;
  onSubmit: () => void;
}

/* ----------------------------------------------------------
   🇦🇺 AUSTRALIAN DATE INPUT  (DD/MM/YYYY format)
---------------------------------------------------------- */
const AUDateInput = ({
  label,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const formatDisplay = (v: string) => {
    if (!v) return "";
    if (v.includes("/")) return v; // already formatted
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d/]/g, "");
    onChange(val);
  };

  return (
    <div>
      {label && (
        <label className="text-sm font-semibold text-gray-700 mb-1 block">
          {label}
        </label>
      )}
      <input
        type="text"
        value={formatDisplay(value)}
        onChange={handleInput}
        placeholder={placeholder}
        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
      />
      <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</p>
    </div>
  );
};

const VendorIntakeForm: React.FC<Props> = ({ onBack, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    abnNumber: "",
    businessName: "",
    entityType: "",
    dateOfAbnRegistration: "",
    dateOfIncorporation: "",
    streetNumber: "",
    streetName: "",
    suburb: "",
    businessState: "",
    postcode: "",
    phone: "",
    email: "",
    directors: [
      {
        index: 1,
        title: "",
        firstName: "",
        middleName: "",
        surname: "",
        dob: "",
        address: "",
        licenceNumber: "",
        licenceState: "",
        licenceExpiry: "",
        medicareNumber: "",
        medicareExpiry: "",
        licenceFront: "",
        licenceBack: "",
        medicareFront: "",
      },
      {
        index: 2,
        title: "",
        firstName: "",
        middleName: "",
        surname: "",
        dob: "",
        address: "",
        licenceNumber: "",
        licenceState: "",
        licenceExpiry: "",
        medicareNumber: "",
        medicareExpiry: "",
        licenceFront: "",
        licenceBack: "",
        medicareFront: "",
      },
    ],
    certificateFiles: [],
    inverters: [],
    invertersOther: "",
    batteries: [],
    batteriesOther: "",
    panels: [],
    panelsOther: "",
    banking: {
      bsb: "",
      accountNumber: "",
      accountName: "",
      bankBranch: "",
    },
  });

  /* ---------- ABN LOOKUP ---------- */
  /* ---------- ABN LOOKUP (Enhanced) ---------- */
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

    // Extract core ABR data
    const physical = data.MainBusinessPhysicalAddress || {};
    const addressParts = [
      physical?.StreetName || "",
      physical?.Suburb || "",
      physical?.StateCode || "",
      physical?.Postcode || "",
    ]
      .filter(Boolean)
      .join(", ");

    // Determine entity type cleanly
    const entityTypeRaw =
      data.EntityType?.EntityDescription ||
      data.MainEntity?.EntityDescription ||
      "";

    const entityType = /company/i.test(entityTypeRaw)
      ? "Company"
      : /trust/i.test(entityTypeRaw)
      ? "Trust"
      : /sole/i.test(entityTypeRaw)
      ? "Sole Trader"
      : entityTypeRaw;

    // Auto toggle incorporation field logic
    const showIncorporation =
      entityType === "Company" || entityType === "Trust";

    setFormData((prev: any) => ({
      ...prev,
      businessName:
        data.EntityName ||
        data.MainName?.OrganisationName ||
        data.MainTradingName?.OrganisationName ||
        prev.businessName,
      entityType,
      dateOfAbnRegistration: data.ABNStatusEffectiveFrom
        ? new Date(data.ABNStatusEffectiveFrom).toISOString().split("T")[0]
        : prev.dateOfAbnRegistration,
      dateRegisteredForGST: data.Gst?.EffectiveFrom
        ? new Date(data.Gst.EffectiveFrom).toISOString().split("T")[0]
        : prev.dateRegisteredForGST,
      registeredAddress: addressParts || prev.registeredAddress,
      showIncorporation,
    }));
  } catch (err) {
    console.error("ABN lookup error →", err);
  } finally {
    setAbnLoading(false);
  }
};


  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (name === "abnNumber" && value.length >= 11) handleAbnLookup(value);
  };

  const handleDirectorChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const directors = [...prev.directors];
      directors[index - 1][field] = value;
      return { ...prev, directors };
    });
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFileUpload = async (e: any, dirIndex: number, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, `director_${dirIndex}`);
      handleDirectorChange(dirIndex, field, url);
    } catch (err) {
      console.error("Upload error", err);
    }
  };

  const handleCertUpload = async (e: any) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "certificates");
      uploadedUrls.push(url);
    }
    setFormData((prev: any) => ({ ...prev, certificateFiles: uploadedUrls }));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 flex justify-center">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-2xl p-10 border-t-4 border-[#0d7b4f]">
        {/* HEADER */}
        <div className="text-center mb-10">
          <img
            src="/ASLS-logo.png"
            alt="Australian Solar Lending Solutions"
            className="mx-auto mb-6 w-52"
          />
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
            Solar Vendor Intake Form
          </h1>
          <p className="text-gray-500 mt-2">
            Please complete all required fields and upload relevant documentation.
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
{/* ---------- BUSINESS DETAILS ---------- */}
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
  <h2 className="text-2xl font-semibold text-[#0d7b4f] mb-6">
    Business Details
  </h2>

  {/* ABN + Business Name */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <div>
      <label className="font-semibold text-gray-700">ABN Number*</label>
      <input
        type="text"
        name="abnNumber"
        value={formData.abnNumber}
        onChange={handleChange}
        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
        required
      />
      {abnLoading && (
        <p className="text-sm text-gray-500 mt-1">Fetching ABN info…</p>
      )}
    </div>

    <div>
      <label className="font-semibold text-gray-700">Business Name*</label>
      <input
        type="text"
        name="businessName"
        value={formData.businessName}
        onChange={handleChange}
        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
        required
      />
    </div>
  </div>

  {/* Entity Type */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <div>
      <label className="font-semibold text-gray-700">Entity Type</label>
      <select
        name="entityType"
        value={formData.entityType}
        onChange={handleChange}
        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
      >
        <option value="">Select</option>
        <option value="Sole Trader">Sole Trader</option>
        <option value="Company">Company</option>
        <option value="Trust">Trust</option>
      </select>
    </div>
  </div>

  {/* ABN Registration Date + Date of Incorporation */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <AUDateInput
      label="Date of ABN Registration"
      value={formData.dateOfAbnRegistration}
      onChange={(val) =>
        setFormData((p: any) => ({
          ...p,
          dateOfAbnRegistration: val,
        }))
      }
    />
    {["Company", "Trust"].includes(formData.entityType) && (
      <AUDateInput
        label="Date of Incorporation"
        value={formData.dateOfIncorporation}
        onChange={(val) =>
          setFormData((p: any) => ({
            ...p,
            dateOfIncorporation: val,
          }))
        }
      />
    )}
  </div>

  {/* Date Registered for GST */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <AUDateInput
      label="Date Registered for GST"
      value={formData.dateRegisteredForGST}
      onChange={(val) =>
        setFormData((p: any) => ({
          ...p,
          dateRegisteredForGST: val,
        }))
      }
    />
  </div>

  {/* Registered Address */}
  <div className="mb-6">
    <label className="font-semibold text-gray-700">
      Registered Address of Business
    </label>
    <input
      type="text"
      name="registeredAddress"
      value={formData.registeredAddress}
      onChange={handleChange}
      placeholder="Street, Suburb, State, Postcode"
      className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
    />
  </div>

  {/* Contact Info */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <input
      type="text"
      name="phone"
      value={formData.phone}
      onChange={handleChange}
      placeholder="Business Phone"
      className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
    />
    <input
      type="email"
      name="email"
      value={formData.email}
      onChange={handleChange}
      placeholder="Business Email"
      className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
    />
  </div>
</div>


          {/* ---------- DIRECTORS SECTION ---------- */}
          {formData.directors.map((d: any) => (
            <div
              key={d.index}
              className={`${
                d.index % 2 === 0 ? "bg-white" : "bg-gray-50"
              } border border-gray-200 rounded-xl p-6 shadow-sm mb-8`}
            >
              <h3 className="text-xl font-semibold text-[#0d7b4f] mb-6">
                Director {d.index}
              </h3>

              {/* Row 1 — Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {["firstName", "middleName", "surname"].map((field, i) => (
                  <input
                    key={field}
                    placeholder={["First Name", "Middle Name", "Surname"][i]}
                    value={d[field]}
                    onChange={(e) =>
                      handleDirectorChange(d.index, field, e.target.value)
                    }
                    className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308] w-full"
                  />
                ))}
              </div>

              {/* Row 2 — DOB + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <AUDateInput
                  label="Date of Birth"
                  value={d.dob}
                  onChange={(val) =>
                    handleDirectorChange(d.index, "dob", val)
                  }
                />
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Residential Address
                  </label>
                  <input
                    placeholder="Street, Suburb, State, Postcode"
                    value={d.address}
                    onChange={(e) =>
                      handleDirectorChange(d.index, "address", e.target.value)
                    }
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
                  />
                </div>
              </div>

              {/* Row 3 — Licence Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <input
                  placeholder="Licence Number"
                  value={d.licenceNumber}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceNumber", e.target.value)
                  }
                  className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
                />
                <select
                  value={d.licenceState}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceState", e.target.value)
                  }
                  className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
                >
                  <option value="">State of Issue</option>
                  {["NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <AUDateInput
                  label="Licence Expiry"
                  value={d.licenceExpiry}
                  onChange={(val) =>
                    handleDirectorChange(d.index, "licenceExpiry", val)
                  }
                />
              </div>

              {/* Row 4 — Medicare */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <input
                  placeholder="Medicare Number"
                  value={d.medicareNumber}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "medicareNumber", e.target.value)
                  }
                  className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
                />
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Medicare Expiry (mm/yyyy)
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={d.medicareExpiry}
                    onChange={(e) =>
                      handleDirectorChange(d.index, "medicareExpiry", e.target.value)
                    }
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: MM/YYYY</p>
                </div>
              </div>

              {/* Row 5 — Uploads */}
              <div className="mt-4 space-y-3">
                {[
                  { label: "Driver's Licence Front", field: "licenceFront" },
                  { label: "Driver's Licence Back", field: "licenceBack" },
                  { label: "Medicare Card Front", field: "medicareFront" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {label}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileUpload(e, d.index, field)}
                        className="w-full border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#eab308]"
                      />
                      <Camera className="w-5 h-5 text-[#0d7b4f]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* ---------- CERTIFICATE UPLOAD ---------- */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <label className="font-semibold block mb-2 text-gray-700">
              Certificate of Business Registration / Trust Deeds (if applicable)
            </label>
            <input
              type="file"
              multiple
              onChange={handleCertUpload}
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-[#eab308]"
            />
          </div>

          {/* ---------- SOLAR EQUIPMENT SECTION ---------- */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#0d7b4f] mb-6">
              Solar Equipment & Supplies
            </h2>

            {/* Inverters */}
            <div className="mb-6">
              <label className="block font-semibold text-gray-700 mb-2">
                Inverters Supplied
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "Canadian Solar",
                  "Energizer",
                  "Enphase",
                  "Eveready",
                  "Fronius",
                  "Goodwe/GE",
                  "Growatt",
                  "Huawei",
                  "Solis",
                  "SMA",
                  "Sungrow",
                  "Tesla",
                ].map((brand) => (
                  <label key={brand} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.inverters.includes(brand)}
                      onChange={() =>
                        setFormData((p: any) => ({
                          ...p,
                          inverters: p.inverters.includes(brand)
                            ? p.inverters.filter((b: string) => b !== brand)
                            : [...p.inverters, brand],
                        }))
                      }
                      className="accent-[#0d7b4f]"
                    />
                    {brand}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other (please specify)"
                value={formData.invertersOther}
                onChange={(e) =>
                  setFormData((p: any) => ({ ...p, invertersOther: e.target.value }))
                }
                className="mt-3 w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
            </div>

            {/* Batteries */}
            <div className="mb-6">
              <label className="block font-semibold text-gray-700 mb-2">
                Batteries Supplied
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  "Goodwe",
                  "Growatt",
                  "Huawei",
                  "Jinko",
                  "LG",
                  "SolaX",
                  "SMA",
                  "Sungrow",
                  "Tesla",
                ].map((brand) => (
                  <label key={brand} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.batteries.includes(brand)}
                      onChange={() =>
                        setFormData((p: any) => ({
                          ...p,
                          batteries: p.batteries.includes(brand)
                            ? p.batteries.filter((b: string) => b !== brand)
                            : [...p.batteries, brand],
                        }))
                      }
                      className="accent-[#0d7b4f]"
                    />
                    {brand}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other (please specify)"
                value={formData.batteriesOther}
                onChange={(e) =>
                  setFormData((p: any) => ({ ...p, batteriesOther: e.target.value }))
                }
                className="mt-3 w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
            </div>

            {/* Panels */}
            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                Panels Supplied
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Goodwe", "Jinko", "Sungrow", "Sunpro", "Trina"].map((brand) => (
                  <label key={brand} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.panels.includes(brand)}
                      onChange={() =>
                        setFormData((p: any) => ({
                          ...p,
                          panels: p.panels.includes(brand)
                            ? p.panels.filter((b: string) => b !== brand)
                            : [...p.panels, brand],
                        }))
                      }
                      className="accent-[#0d7b4f]"
                    />
                    {brand}
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other (please specify)"
                value={formData.panelsOther}
                onChange={(e) =>
                  setFormData((p: any) => ({ ...p, panelsOther: e.target.value }))
                }
                className="mt-3 w-full border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
            </div>
          </div>

          {/* ---------- BANK DETAILS ---------- */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-[#0d7b4f] mb-6">
              Bank Details for Commission Payments
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <input
                type="text"
                placeholder="BSB"
                value={formData.banking.bsb}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    banking: { ...p.banking, bsb: e.target.value },
                  }))
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={formData.banking.accountNumber}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    banking: { ...p.banking, accountNumber: e.target.value },
                  }))
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
              <input
                type="text"
                placeholder="Account Name"
                value={formData.banking.accountName}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    banking: { ...p.banking, accountName: e.target.value },
                  }))
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
              <input
                type="text"
                placeholder="Bank & Branch"
                value={formData.banking.bankBranch}
                onChange={(e) =>
                  setFormData((p: any) => ({
                    ...p,
                    banking: { ...p.banking, bankBranch: e.target.value },
                  }))
                }
                className="border rounded-lg p-3 focus:ring-2 focus:ring-[#eab308]"
              />
            </div>
          </div>

          {/* ---------- ACTION BUTTONS ---------- */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>

            <button
              type="submit"
              onClick={async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                  const doc = new jsPDF();
                  doc.setFontSize(16);
                  doc.text("Solar Vendor Intake Form", 14, 20);
                  doc.setFontSize(12);
                  doc.text(`Business: ${formData.businessName}`, 14, 30);
                  doc.text(`ABN: ${formData.abnNumber}`, 14, 38);

                  autoTable(doc, {
                    head: [["#", "Name", "DOB", "Licence", "State", "Medicare"]],
                    body: formData.directors.map((d: any) => [
                      d.index,
                      `${d.firstName} ${d.middleName} ${d.surname}`,
                      d.dob,
                      d.licenceNumber,
                      d.licenceState,
                      d.medicareNumber,
                    ]),
                    startY: 46,
                  });

                  const blob = doc.output("blob");
                  const fileName = `vendor_${Date.now()}.pdf`;
                  const { error } = await supabase.storage
                    .from("uploads")
                    .upload(fileName, blob);
                  if (error) throw error;
                  const { data } = supabase.storage
                    .from("uploads")
                    .getPublicUrl(fileName);

                  await supabase.functions.invoke("send-email", {
                    body: {
                      to: "john@worldmachine.com.au",
                      type: "vendor_intake_submission",
                      pdfUrl: data.publicUrl,
                      applicationData: formData,
                    },
                  });

                  alert("Form submitted successfully!");
                  onSubmit();
                } catch (err) {
                  console.error(err);
                  alert("Error submitting form. Please try again.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 rounded-lg bg-[#0d7b4f] text-white hover:bg-[#09653e] transition disabled:opacity-50 shadow-md"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />} Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorIntakeForm;
