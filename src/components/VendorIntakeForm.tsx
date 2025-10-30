// -----------------------------------------------
// ASLS Vendor Intake Form (FINAL PRODUCTION)
// Version: Stable — with Upload Feedback, Google Autocomplete, Save-for-Later, PDF Email
// -----------------------------------------------

import React, { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Camera, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { useSearchParams } from "react-router-dom";
// ✅ Load Google Maps API script only once if not already loaded
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


console.log("✅ Loaded VendorIntakeForm.tsx (Final Production Build)");

interface Props {
  onBack: () => void;
  onSubmit: () => void;
}

const VendorIntakeForm: React.FC<Props> = ({ onBack, onSubmit }) => {
  // -------------------- STATE SETUP --------------------
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [directorCount, setDirectorCount] = useState(1);

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
        phone: "",
        mobile: "",
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
        phone: "",
        mobile: "",
        licenceNumber: "",
        licenceState: "",
        licenceExpiry: "",
        licenceFront: "",
        licencePhoto: "",
      },
    ],
    certificateFiles: "",
    bankStatement: "",
    taxInvoiceTemplate: "",
    accountName: "",
    bsb: "",
    accountNumber: "",
    tcsAccepted: false,
    signatureName: "",
    signatureDate: "",
    solarPanels: [] as string[],
    inverters: [] as string[],
    batteries: [] as string[],
  });

  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("id");

  // -------------------- LOAD EXISTING DRAFT --------------------
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) return;
      const { data, error } = await supabase
        .from("vendor_drafts")
        .select("formData")
        .eq("id", draftId)
        .single();

      if (error) {
        console.error("❌ Failed to load draft", error);
        return;
      }

      if (data?.formData) {
        setFormData((prev) => ({
          ...prev,
          ...data.formData,
          directors: data.formData.directors || prev.directors,
        }));
        setSavedId(draftId);
        console.log("✅ Draft loaded successfully, including uploaded files");
      }
    };

    loadDraft();
  }, [draftId]);

  // -------------------- GOOGLE ADDRESS AUTOCOMPLETE --------------------
  // -------------------- GOOGLE ADDRESS LOOKUP --------------------
useEffect(() => {
  loadGoogleMapsScript(() => {
    formData.directors.forEach((d: any) => {
      const input = document.getElementById(`address-${d.index}`) as HTMLInputElement;
      if (input && window.google && window.google.maps?.places) {
        const autocomplete = new google.maps.places.Autocomplete(input, {
          types: ["address"],
          componentRestrictions: { country: "au" },
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          handleDirectorChange(d.index, "address", place.formatted_address || "");
        });
      }
    });
  });
}, [formData.directors]);


  // -------------------- ABN LOOKUP --------------------
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
      console.log("✅ ABN lookup completed successfully");
    } catch (err) {
      console.error("❌ ABN lookup failed", err);
    } finally {
      setAbnLoading(false);
    }
  };
  // -------------------- DATE & INPUT HANDLERS --------------------
const formatDate = (value: string) => {
  // Strip all non-numeric and limit to 8 digits
  const cleaned = value.replace(/\D/g, "").slice(0, 8);

  // Add slashes automatically as user types
  if (cleaned.length >= 5) return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
  if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return cleaned;
};

const handleChange = (e: any) => {
  const { name, value, type, checked } = e.target;

  let newValue = value;

  // 🟢 Automatically format any field containing date-like text
  if (
    name.toLowerCase().includes("date") ||
    name.toLowerCase().includes("dob") ||
    name.toLowerCase().includes("expiry")
  ) {
    newValue = formatDate(value);
  }

  setFormData((prev: any) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : newValue,
  }));

  // Trigger ABN lookup when 11 digits are entered
  if (name === "abnNumber" && value.replace(/\D/g, "").length === 11) {
    handleAbnLookup(value);
  }
};

// 🧍 Director date + other input handling
const handleDirectorChange = (index: number, field: string, value: any) => {
  setFormData((prev: any) => {
    const directors = [...prev.directors];
    const lowerField = field.toLowerCase();
    directors[index - 1][field] =
      lowerField.includes("date") || lowerField.includes("dob") || lowerField.includes("expiry")
        ? formatDate(value)
        : value;

    return { ...prev, directors };
  });
};

  // -------------------- SUPABASE FILE UPLOAD --------------------
  const uploadFile = async (file: File, folder: string) => {
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (error) throw error;
    const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
    console.log(`📁 Uploaded file to Supabase: ${data.publicUrl}`);
    return data.publicUrl;
  };

  // -------------------- STANDARD FILE UPLOAD --------------------
  const handleFileUpload = async (e: any, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "vendor_uploads");

      const updatedFormData = { ...formData, [field]: url };
      setFormData(updatedFormData);

      if (savedId) {
        await supabase
          .from("vendor_drafts")
          .update({ formData: updatedFormData })
          .eq("id", savedId);
        console.log(`✅ Auto-saved ${field} to draft ${savedId}`);
      }
    } catch (err) {
      console.error("❌ Upload error", err);
    }
  };

  // -------------------- DIRECTOR FILE UPLOAD --------------------
  const handleDirectorFileUpload = async (e: any, dirIndex: number, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, `director_${dirIndex}`);

      setFormData((prev: any) => {
        const directors = [...prev.directors];
        directors[dirIndex - 1][field] = url;
        const updatedFormData = { ...prev, directors };

        if (savedId) {
          supabase
            .from("vendor_drafts")
            .update({ formData: updatedFormData })
            .eq("id", savedId)
            .then(() =>
              console.log(`📸 Auto-saved ${field} for Director ${dirIndex}`)
            );
        }

        return updatedFormData;
      });
    } catch (err) {
      console.error("❌ Director upload error", err);
    }
  };

  // -------------------- SAVE FOR LATER --------------------
  const saveFormForLater = async () => {
    setSaving(true);
    try {
      let draftId = savedId;

      if (draftId) {
        const { error } = await supabase
          .from("vendor_drafts")
          .update({ formData })
          .eq("id", draftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vendor_drafts")
          .insert([{ formData }])
          .select("id")
          .single();
        if (error) throw error;
        draftId = data.id;
        setSavedId(draftId);
      }

      const resumeLink = `${window.location.origin}/vendor-intake?id=${draftId}`;
      const emailTo = formData.email || "";

      if (emailTo) {
        const subject = "Your saved ASLS Vendor Intake Form";
        const html = `
          <p>Hi ${formData.businessName || "there"},</p>
          <p>We've saved your vendor intake form. You can return anytime using the link below:</p>
          <p><a href="${resumeLink}" target="_blank">${resumeLink}</a></p>
          <p>Kind regards,<br>Australian Solar Lending Solutions</p>
        `;

        const { error: emailError } = await supabase.functions.invoke("send-email", {
          body: { to: emailTo, subject, html },
        });
        if (emailError) throw emailError;
        console.log("📧 Save-for-later email sent to user");
      }

      alert("✅ Your progress has been saved! Check your email for the return link.");
    } catch (err) {
      console.error("❌ Save failed", err);
      alert("Error saving progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------- PDF GENERATION --------------------
  const generatePDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ASLS Vendor Intake Form", 14, 20);
    doc.setFontSize(12);

    doc.text(`Business Name: ${formData.businessName}`, 14, 35);
    doc.text(`ABN: ${formData.abnNumber}`, 14, 43);
    doc.text(`Entity Type: ${formData.entityType}`, 14, 51);
    doc.text(`Phone: ${formData.phone}`, 14, 59);
    doc.text(`Mobile: ${formData.mobile}`, 14, 67);
    doc.text(`Email: ${formData.email}`, 14, 75);
    doc.text(
      `Address: ${formData.streetNumber} ${formData.streetName}, ${formData.suburb}, ${formData.state} ${formData.postcode}`,
      14, 83
    );

    let y = 95;
    doc.text("Directors:", 14, y);
    y += 8;

    formData.directors.slice(0, directorCount).forEach((d: any, i: number) => {
      doc.text(`Director ${i + 1}: ${d.firstName} ${d.middleName} ${d.surname}`, 14, y);
      y += 8;
      doc.text(`Phone: ${d.phone} | Mobile: ${d.mobile}`, 14, y);
      y += 8;
      doc.text(`DOB: ${d.dob} | Licence: ${d.licenceNumber} (${d.licenceState})`, 14, y);
      y += 8;
      doc.text(`Address: ${d.address}`, 14, y);
      y += 10;
    });

    doc.text(`Account Name: ${formData.accountName}`, 14, y + 5);
    doc.text(`BSB: ${formData.bsb} | Account Number: ${formData.accountNumber}`, 14, y + 13);

    const mainFormPdf = doc.output("arraybuffer");

    // merge with Terms & Conditions
    let termsUrl = "/terms-and-conditions.pdf";
    if (import.meta.env.MODE === "development") {
      termsUrl = `${window.location.protocol}//${window.location.host}/terms-and-conditions.pdf`;
    }

    const response = await fetch(termsUrl);
    if (!response.ok) throw new Error("Failed to load Terms PDF");
    const termsBytes = await response.arrayBuffer();

    const formDoc = await PDFDocument.load(mainFormPdf);
    const termsDoc = await PDFDocument.load(termsBytes);
    const pages = await formDoc.copyPages(termsDoc, termsDoc.getPageIndices());
    pages.forEach((p) => formDoc.addPage(p));

    const lastPage = formDoc.getPage(formDoc.getPageCount() - 1);
    lastPage.drawText(`Signed by: ${formData.signatureName}`, { x: 50, y: 60, size: 12 });
    lastPage.drawText(`Date: ${formData.signatureDate}`, { x: 50, y: 45, size: 12 });

    const mergedPdf = await formDoc.save();
    return new Blob([mergedPdf], { type: "application/pdf" });
  };

  // -------------------- SUBMIT FORM --------------------
const handleSubmit = async (e: any) => {
  e.preventDefault();
  setLoading(true);

  try {
    console.log("🚀 Starting Vendor Form submission...");

    // 1️⃣ Generate combined PDF (form + T&Cs)
    const pdfBlob = await generatePDF();
    const pdfFileName = `vendor_form_${Date.now()}.pdf`;

    // 2️⃣ Upload PDF to Supabase Storage
    console.log("📤 Uploading PDF to Supabase...");
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(pdfFileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from("uploads").getPublicUrl(pdfFileName);
    const pdfUrl = pub?.publicUrl;
    console.log("✅ PDF uploaded successfully:", pdfUrl);

    // 3️⃣ Compose email
    const subject = `ASLS Vendor Intake - ${formData.businessName || "New submission"}`;
    const html = `
      <h2>New Vendor Intake Submission</h2>
      <p><strong>Business Name:</strong> ${formData.businessName}</p>
      <p><strong>ABN:</strong> ${formData.abnNumber}</p>
      <p><strong>Phone:</strong> ${formData.phone}</p>
      <p><strong>Mobile:</strong> ${formData.mobile}</p>
      <p><strong>Entity Type:</strong> ${formData.entityType}</p>
      <p><strong>Signed By:</strong> ${formData.signatureName} on ${formData.signatureDate}</p>
      <p><strong>PDF:</strong> <a href="${pdfUrl}" target="_blank">${pdfUrl}</a></p>
      <hr />
      <p><em>This email was automatically sent from the ASLS Vendor Portal.</em></p>
    `;

    // 4️⃣ Send email via Supabase Edge Function
    console.log("📧 Sending email to John and Admin...");
    const emailResponse = await fetch(
      "https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
to: "john@worldmachine.com.au, admin@asls.net.au",

  subject,
  text: `PDF: ${pdfUrl}\n\n${JSON.stringify(formData, null, 2)}`,
  html,
}),

      }
    );

    let result;
    try {
      result = await emailResponse.json();
    } catch {
      console.warn("⚠️ Email response not JSON — continuing anyway");
    }

    if (!emailResponse.ok) {
      console.error("❌ Email failed:", result || emailResponse);
      throw new Error(result?.error || "Email function failed");
    }

    console.log("✅ Email successfully sent:", result);

    // 5️⃣ Notify user and trigger form reset / confirmation
    alert("✅ Submission successful! Your vendor application has been emailed for review.");
    console.log("📨 Vendor form submitted for:", formData.businessName);
    console.log("📎 PDF URL:", pdfUrl);

    onSubmit(); // triggers any post-submit navigation or cleanup
  } catch (err: any) {
    console.error("[submit] ❌ FAILED", err);
    alert(`❌ Error submitting form: ${err.message || "Please try again."}`);
  } finally {
    setLoading(false);
  }
};


  // -------------------- FORM JSX --------------------
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-6 sm:p-10 border-t-4 border-green-600">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/ASLS-logo.png" alt="ASLS" className="mx-auto w-40 sm:w-56 mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            Solar Vendor Intake Form
          </h1>
          <p className="text-gray-500 mt-2">Please complete all required details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* 🧾 Business Details */}
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
              {abnLoading && <p className="text-sm text-gray-500">Fetching ABN info...</p>}
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

            {(formData.entityType === "Company" || formData.entityType === "Trust") && (
              <div>
                <label className="font-semibold text-gray-700">Date of Incorporation*</label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY"
                  name="dateOfIncorporation"
                  value={formData.dateOfIncorporation}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
            )}
          </div>

          {/* 📞 Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="font-semibold text-gray-700">Phone Number*</label>
              <input
                type="tel"
                name="phone"
                placeholder="(02) 1234 5678"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Mobile Number*</label>
              <input
                type="tel"
                name="mobile"
                placeholder="0412 345 678"
                value={formData.mobile}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Email*</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Website*</label>
              <input
                type="text"
                name="website"
                placeholder="e.g. www.solarcompany.com.au"
                value={formData.website}
                onChange={(e) => {
                  let value = e.target.value.trim();
                  if (value && !/^https?:\/\//i.test(value)) {
                    value = "https://" + value;
                  }
                  setFormData((prev: any) => ({ ...prev, website: value }));
                }}
                className="w-full border rounded-lg p-3"
                required
              />
            </div>
          </div>

          {/* 🧍 Directors Section */}
          <div>
            <label className="font-semibold text-gray-700">Number of Directors*</label>
            <select
              value={directorCount}
              onChange={(e) => setDirectorCount(parseInt(e.target.value))}
              className="w-full border rounded-lg p-3 mt-2"
              required
            >
              <option value={1}>1 Director</option>
              <option value={2}>2 Directors</option>
            </select>
          </div>

          {formData.directors.slice(0, directorCount).map((d: any) => (
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
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Middle Name"
                  value={d.middleName}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "middleName", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                />
                <input
                  placeholder="Surname"
                  value={d.surname}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "surname", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Phone Number"
                  type="tel"
                  value={d.phone || ""}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "phone", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Mobile Number"
                  type="tel"
                  value={d.mobile || ""}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "mobile", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Date of Birth*
                  </label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={d.dob}
                    onChange={(e) =>
                      handleDirectorChange(d.index, "dob", e.target.value)
                    }
                    className="w-full border-gray-300 rounded-lg p-3 shadow-sm"
                    required
                  />
                </div>

                <input
                  id={`address-${d.index}`}
                  placeholder="Start typing address..."
                  value={d.address}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "address", e.target.value)
                  }
                  className="col-span-1 sm:col-span-2 border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />

                <input
                  placeholder="Licence Number"
                  value={d.licenceNumber}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceNumber", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />

                <select
                  value={d.licenceState}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceState", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                >
                  <option value="">State of Issue</option>
                  <option value="NSW">NSW</option>
                  <option value="QLD">QLD</option>
                  <option value="VIC">VIC</option>
                  <option value="SA">SA</option>
                  <option value="WA">WA</option>
                  <option value="TAS">TAS</option>
                </select>

                <input
                  placeholder="Licence Expiry (DD/MM/YYYY)"
                  value={d.licenceExpiry}
                  onChange={(e) =>
                    handleDirectorChange(d.index, "licenceExpiry", e.target.value)
                  }
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
              </div>

              {/* Licence Uploads */}
              <div className="mt-4">
                <label className="block font-semibold text-gray-700 mb-1">
                  Driver’s Licence (Front)*
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleDirectorFileUpload(e, d.index, "licenceFront")
                    }
                    className="w-full border-gray-300 rounded-lg p-2"
                    required
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                {d.licenceFront && (
                  <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>
                )}

                <label className="block font-semibold text-gray-700 mt-4 mb-1">
                  Driver’s Licence (Back)*
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleDirectorFileUpload(e, d.index, "licencePhoto")
                    }
                    className="w-full border-gray-300 rounded-lg p-2"
                    required
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                {d.licencePhoto && (
                  <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>
                )}
              </div>
            </div>
          ))}
          {/* 📎 Supporting Documents */}
          <div className="space-y-4 mt-10">
            <h3 className="text-lg font-bold text-green-800">Supporting Documents</h3>
            {[
              {
                label: "Certificate of Business Registration / Trust Deeds*",
                field: "certificateFiles",
              },
              { label: "Bank Statement Header*", field: "bankStatement" },
              { label: "Tax Invoice Template*", field: "taxInvoiceTemplate" },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block font-semibold text-gray-700 mb-1">{label}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, field)}
                    className="w-full border-gray-300 rounded-lg p-2"
                    required
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                {formData[field] && (
                  <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>
                )}
              </div>
            ))}
          </div>

          {/* ⚡ Solar Equipment & Supplies */}
          <div className="space-y-4 mt-10">
            <h3 className="text-lg font-bold text-green-800">
              Solar Equipment & Supplies (Brand Partnerships)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Please select all applicable brands your business currently supplies or installs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  label: "Panels",
                  field: "solarPanels",
                  options: [
                    "Canadian Solar",
                    "Hyundai Solar",
                    "Jinko",
                    "Longi",
                    "QCells",
                    "Risen Solar",
                    "REC",
                    "SunPower",
                    "SunTech",
                    "Trina",
                    "Other",
                  ],
                },
                {
                  label: "Inverters",
                  field: "inverters",
                  options: [
                    "Fronius",
                    "GE",
                    "Goodwe",
                    "Growatt",
                    "Huawei",
                    "Solaredge",
                    "SolaX Power",
                    "Solis",
                    "SMA",
                    "Other",
                  ],
                },
                {
                  label: "Batteries",
                  field: "batteries",
                  options: [
                    "Alpha ESS",
                    "BYD",
                    "Enphase",
                    "LG",
                    "Sonnen",
                    "Tesla",
                    "Other",
                  ],
                },
              ].map(({ label, field, options }) => (
                <div
                  key={label}
                  className="border rounded-lg p-4 bg-gray-50 shadow-sm"
                >
                  <h4 className="font-semibold mb-2 text-gray-700">{label}</h4>
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="accent-green-700"
                          checked={formData[field]?.includes(opt)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData((prev: any) => {
                              const current = new Set(prev[field] || []);
                              if (isChecked) current.add(opt);
                              else current.delete(opt);
                              return { ...prev, [field]: Array.from(current) };
                            });
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 💳 Banking Details */}
          <div className="space-y-4 mt-10">
            <h3 className="text-lg font-bold text-green-800">Banking Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="font-semibold text-gray-700">Account Name*</label>
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
                <label className="font-semibold text-gray-700">BSB*</label>
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
                <label className="font-semibold text-gray-700">Account Number*</label>
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

          {/* 📜 Terms & Signature */}
          <div className="space-y-4 mt-10">
            <h3 className="text-lg font-bold text-green-800">
              Terms & Conditions
            </h3>
            <div className="bg-gray-100 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 mb-3">
                By submitting this form, you agree to the ASLS Vendor Terms &
                Conditions. Please ensure all information is accurate before
                submitting.
              </p>
              <a
                href="/terms-and-conditions.pdf"
                target="_blank"
                className="text-green-700 underline text-sm"
              >
                View full Terms & Conditions (PDF)
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Signature (Full Name)*
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
                  Date Signed*
                </label>
                <input
                  type="text"
                  name="signatureDate"
                  placeholder="DD/MM/YYYY"
                  value={formData.signatureDate}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
            </div>
          </div>

          {/* 🔘 Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-8 mt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-400 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Save for Later */}
              <button
                type="button"
                onClick={saveFormForLater}
                disabled={saving}
                className="px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> Save for Later
                  </>
                )}
              </button>

              {/* Submit */}
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorIntakeForm;
