import React, { useState } from "react";
import { Loader2, ArrowLeft, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { PDFDocument } from "pdf-lib";

interface Props {
  onBack: () => void;
  onSubmit: () => void;
}

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
    state: "",
    postcode: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    directors: [
      {
        index: 1,
        firstName: "",
        middleName: "",
        surname: "",
        dob: "",
        address: "",
        licenceNumber: "",
        licenceState: "",
        licenceExpiry: "",
        licenceFront: "",
        licencePhoto: "",
      },
      {
        index: 2,
        firstName: "",
        middleName: "",
        surname: "",
        dob: "",
        address: "",
        licenceNumber: "",
        licenceState: "",
        licenceExpiry: "",
        licenceFront: "",
        licencePhoto: "",
      },
    ],
    certificateFiles: [],
    bankStatement: "",
    taxInvoiceTemplate: "",
    installerCertifications: [],
    accountName: "",
    bsb: "",
    accountNumber: "",
    tcsAccepted: false,
    signatureName: "",
    signatureDate: "",
  });

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

      const addressData = data.MainBusinessPhysicalAddress || {};
      setFormData((prev: any) => ({
        ...prev,
        businessName:
          data.EntityName ||
          data.MainName?.OrganisationName ||
          data.MainTradingName?.OrganisationName ||
          prev.businessName,
        entityType: data.EntityType?.EntityDescription || prev.entityType,
        dateOfAbnRegistration: data.ABNStatusEffectiveFrom
          ? new Date(data.ABNStatusEffectiveFrom).toLocaleDateString("en-AU")
          : prev.dateOfAbnRegistration,
        streetNumber: addressData.Flat || "",
        streetName: `${addressData.StreetName || ""} ${addressData.StreetType || ""}`.trim(),
        suburb: addressData.Suburb || "",
        state: addressData.StateCode || "",
        postcode: addressData.Postcode || "",
      }));
    } catch (err) {
      console.error("ABN lookup error →", err);
    } finally {
      setAbnLoading(false);
    }
  };

  // ---------- HANDLERS ----------
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "abnNumber" && value.length >= 11) handleAbnLookup(value);
  };

  const handleDirectorChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const directors = [...prev.directors];
      directors[index - 1][field] = value;
      return { ...prev, directors };
    });
  };

  // Upload any picked file (image/pdf) to the `uploads` bucket with proper headers
const uploadFile = async (file: File, folder: string) => {
  const fileName = `${folder}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(fileName, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    console.error("uploadFile error:", error);
    throw error;
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
  return data.publicUrl;
};


  const handleFileUpload = async (e: any, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, "vendor_uploads");
      setFormData((prev: any) => ({ ...prev, [field]: url }));
    } catch (err) {
      console.error("Upload error", err);
    }
  };

  const handleDirectorFileUpload = async (e: any, dirIndex: number, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, `director_${dirIndex}`);
      handleDirectorChange(dirIndex, field, url);
    } catch (err) {
      console.error("Director upload error", err);
    }
  };
  // ---------- PDF GENERATION ----------
  const generatePDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ASLS Vendor Intake Form", 14, 20);
    doc.setFontSize(12);

    doc.text(`Business Name: ${formData.businessName}`, 14, 35);
    doc.text(`ABN: ${formData.abnNumber}`, 14, 43);
    doc.text(`Entity Type: ${formData.entityType}`, 14, 51);
    doc.text(`Date of ABN Registration: ${formData.dateOfAbnRegistration}`, 14, 59);
    doc.text(
      `Address: ${formData.streetNumber} ${formData.streetName}, ${formData.suburb}, ${formData.state} ${formData.postcode}`,
      14,
      67
    );

    let y = 80;
    doc.text("Directors:", 14, y);
    y += 8;
    formData.directors.forEach((d: any, i: number) => {
      doc.text(`Director ${i + 1}: ${d.firstName} ${d.middleName} ${d.surname}`, 14, y);
      y += 8;
      doc.text(`DOB: ${d.dob} | Licence: ${d.licenceNumber} (${d.licenceState})`, 14, y);
      y += 8;
      doc.text(`Address: ${d.address}`, 14, y);
      y += 10;
    });

    doc.text(`Account Name: ${formData.accountName}`, 14, y + 5);
    doc.text(`BSB: ${formData.bsb} | Account Number: ${formData.accountNumber}`, 14, y + 13);

    const mainFormPdf = doc.output("arraybuffer");

    let termsUrl = "/terms-and-conditions.pdf";
    if (import.meta.env.MODE === "development") {
      termsUrl = `${window.location.protocol}//${window.location.host}/terms-and-conditions.pdf`;
    }

    const response = await fetch(termsUrl);
    if (!response.ok) throw new Error("Failed to load Terms & Conditions");
    const termsBytes = await response.arrayBuffer();

    const [formDoc] = await Promise.all([PDFDocument.load(mainFormPdf)]);
    const termsDoc = await PDFDocument.load(termsBytes);
    const pages = await formDoc.copyPages(termsDoc, termsDoc.getPageIndices());
    pages.forEach((p) => formDoc.addPage(p));

    const lastPage = formDoc.getPage(formDoc.getPageCount() - 1);
    lastPage.drawText(`Signed by: ${formData.signatureName}`, { x: 50, y: 60, size: 12 });
    lastPage.drawText(`Date: ${formData.signatureDate}`, { x: 50, y: 45, size: 12 });

    const mergedPdf = await formDoc.save();
    return new Blob([mergedPdf], { type: "application/pdf" });
  };

  // ---------- SUBMIT ----------
const handleSubmit = async (e: any) => {
  e.preventDefault();
  setLoading(true);
  try {
    console.log("[submit] start");

    // 1) Generate merged PDF
    const pdfBlob = await generatePDF();
    console.log("[submit] PDF generated", pdfBlob?.size);

    // 2) Upload the PDF to Supabase Storage (bucket: uploads)
    const pdfFileName = `vendor_form_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(pdfFileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[submit] uploadError", uploadError);
      throw new Error(`Upload failed: ${uploadError.message || uploadError}`);
    }

    const { data: pub } = supabase.storage.from("uploads").getPublicUrl(pdfFileName);
    const signedUrl = pub?.publicUrl;
    console.log("[submit] publicUrl", signedUrl);

    // 3) Email John via Edge Function (SendGrid)
    const subject = `ASLS Vendor Intake - ${formData.businessName || "New submission"}`;
    const html = `
      <h2>New Vendor Intake Submission</h2>
      <p><strong>Business Name:</strong> ${formData.businessName || ""}</p>
      <p><strong>ABN:</strong> ${formData.abnNumber || ""}</p>
      <p><strong>Entity Type:</strong> ${formData.entityType || ""}</p>
      <p><strong>Signed By:</strong> ${formData.signatureName || ""} on ${formData.signatureDate || ""}</p>
      <p><strong>PDF:</strong> <a href="${signedUrl}" target="_blank" rel="noreferrer">${signedUrl}</a></p>
    `;

    const { data: fnData, error: fnErr } = await supabase.functions.invoke("send-email", {
      body: {
        subject,
        html,
        text: `PDF: ${signedUrl}\n\n${JSON.stringify(formData, null, 2)}`,
      },
    });

    if (fnErr) {
      console.error("[submit] send-email error", fnErr);
      throw new Error(`Email failed: ${fnErr.message || JSON.stringify(fnErr)}`);
    }

    console.log("[submit] send-email ok", fnData);
    alert("Thank you for your vendor submission. Your application has been submitted to our lender for approval.");
    onSubmit();
  } catch (err: any) {
    console.error("[submit] FAILED", err);
    alert(`Error submitting form. ${err?.message || "Please try again."}`);
  } finally {
    setLoading(false);
  }
};

  // ---------- FORM JSX ----------
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-10 border-t-4 border-green-600">
        <div className="text-center mb-8">
          <img src="/ASLS-logo.png" alt="ASLS" className="mx-auto w-56 mb-4" />
          <h1 className="text-4xl font-bold text-gray-800">
            Solar Vendor Intake Form
          </h1>
          <p className="text-gray-500 mt-2">
            Please complete all required details below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Business Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="font-semibold text-gray-700">ABN Number*</label>
              <input
                type="text"
                name="abnNumber"
                value={formData.abnNumber}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
              {abnLoading && (
                <p className="text-sm text-gray-500">Fetching ABN info...</p>
              )}
            </div>
            <div>
              <label className="font-semibold text-gray-700">Business Name*</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Entity Type*</label>
              <select
                name="entityType"
                value={formData.entityType}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              >
                <option value="">Select</option>
                <option>Sole Trader</option>
                <option>Company</option>
                <option>Trust</option>
              </select>
            </div>

            {(formData.entityType === "Company" ||
              formData.entityType === "Trust") && (
              <div>
                <label className="font-semibold text-gray-700">
                  Date of Incorporation
                </label>
                <input
                  type="date"
                  name="dateOfIncorporation"
                  value={formData.dateOfIncorporation}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                />
                <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</p>
              </div>
            )}
          </div>

          {/* Physical Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="font-semibold text-gray-700">Street Number</label>
              <input
                type="text"
                name="streetNumber"
                value={formData.streetNumber}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Street Name</label>
              <input
                type="text"
                name="streetName"
                value={formData.streetName}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Suburb</label>
              <input
                type="text"
                name="suburb"
                value={formData.suburb}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Postcode</label>
              <input
                type="text"
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>
          </div>

          {/* Installer Certifications */}
          <div className="mt-6">
            <label className="font-semibold text-gray-700">
              Installer Certifications (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                "NETCC Certified Installer",
                "CEC Certified Installer",
                "CAA Certified Installer",
              ].map((cert) => (
                <label key={cert} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={cert}
                    checked={formData.installerCertifications.includes(cert)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev: any) => {
                        const current = prev.installerCertifications.includes(value)
                          ? prev.installerCertifications.filter((c: string) => c !== value)
                          : [...prev.installerCertifications, value];
                        return { ...prev, installerCertifications: current };
                      });
                    }}
                    className="accent-green-700"
                  />
                  <span className="text-gray-700">{cert}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Directors Section */}
          {formData.directors.map((d: any) => (
            <div
              key={d.index}
              className="border border-gray-200 rounded-xl p-6 shadow-sm bg-green-50"
            >
              <h3 className="font-bold text-lg mb-4 text-green-800">
                Director {d.index}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="First Name"
                  value={d.firstName}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "firstName", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  placeholder="Middle Name"
                  value={d.middleName}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "middleName", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  placeholder="Surname"
                  value={d.surname}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "surname", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={d.dob}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "dob", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  placeholder="Residential Address"
                  value={d.address}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "address", e.target.value)
                  }
                  className="col-span-2 border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  placeholder="Licence Number"
                  value={d.licenceNumber}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceNumber", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <input
                  placeholder="Licence State (e.g. NSW, VIC)"
                  value={d.licenceState}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceState", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />

                {/* Licence Expiry Date */}
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    Licence Expiry Date (DD/MM/YYYY)
  </label>
  <input
    type="date"
    value={d.licenceExpiry}
    onChange={(e) =>
      handleDirectorChange(d.index, "licenceExpiry", e.target.value)
    }
    className="border-gray-300 rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
  />
  <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</p>
</div>

              </div>

              {/* File Uploads */}
              <div className="mt-5 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Upload Driver’s Licence (Front)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleDirectorFileUpload(e, d.index, "licenceFront")
                      }
                      className="w-full border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500"
                    />
                    <Camera className="w-5 h-5 text-green-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Capture Photo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handleDirectorFileUpload(e, d.index, "licencePhoto")
                      }
                      className="w-full border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-green-500"
                    />
                    <Camera className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Supporting Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-green-800">Supporting Documents</h3>

            {[
              {
                label: "Certificate of Business Registration / Trust Deeds (if applicable)",
                field: "certificateFiles",
              },
              { label: "Bank Statement Header", field: "bankStatement" },
              { label: "Tax Invoice Template", field: "taxInvoiceTemplate" },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block font-semibold text-gray-700 mb-1">
                  {label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, field)}
                    className="w-full border-gray-300 rounded-lg p-2"
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
              </div>
            ))}
          </div>

          {/* Solar Equipment */}
          <div>
            <h3 className="text-lg font-bold text-green-800 mb-2">
              Solar Equipment & Supplies (Brand Partnerships)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Please select all applicable brands your business currently supplies or installs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Panels", options: ["Jinko", "Trina", "REC", "Canadian Solar", "Longi", "Other"] },
                { label: "Inverters", options: ["Fronius", "Sungrow", "Huawei", "Solaredge", "GoodWe", "Other"] },
                { label: "Batteries", options: ["Tesla", "BYD", "Alpha ESS", "Sonnen", "Enphase", "Other"] },
              ].map(({ label, options }) => (
                <div key={label} className="border rounded-lg p-4 bg-gray-50 shadow-sm">
                  <h4 className="font-semibold mb-2 text-gray-700">{label}</h4>
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <label key={opt} className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" className="accent-green-700" />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banking Details */}
          <div>
            <h3 className="text-lg font-bold text-green-800 mb-3">
              Banking Details for Invoice Payments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">BSB</label>
                <input
                  type="text"
                  name="bsb"
                  value={formData.bsb}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t pt-8 mt-10">
            <h3 className="text-lg font-bold text-green-800 mb-2">
              Terms & Conditions
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Please review the{" "}
              <a
                href={`${window.location.origin}/terms-and-conditions.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline hover:text-green-800"
              >
                Terms and Conditions
              </a>{" "}
              before proceeding.
            </p>

            <label className="flex items-start space-x-3 mt-3">
              <input
                type="checkbox"
                name="tcsAccepted"
                checked={formData.tcsAccepted}
                onChange={handleChange}
                required
                className="mt-1 accent-green-700"
              />
              <span className="text-gray-700">
                I have read and agree to the Grenke/ASLS Terms and Conditions.
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Signature (Full Name)
                </label>
                <input
                  type="text"
                  name="signatureName"
                  placeholder="Type Full Name"
                  value={formData.signatureName}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date Signed
                </label>
                <input
                  type="date"
                  name="signatureDate"
                  value={formData.signatureDate}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-between pt-8 mt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-400 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="inline w-5 h-5 animate-spin mr-2" /> Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorIntakeForm;
