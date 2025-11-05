// -------------------------------------------------------------
// ASLS Vendor Intake Form – Full Clean Production Build (Part 1/4)
// -------------------------------------------------------------

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as PDFLib from "pdf-lib";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";

// ✅ Google Maps API Loader
const loadGoogleMapsScript = (callback: () => void) => {
  if (window.google && window.google.maps) return callback();
  const existing = document.getElementById("googleMaps");
  if (existing) return existing.addEventListener("load", callback);

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

interface Props {
  onBack: () => void;
}

const VendorIntakeForm: React.FC<Props> = ({ onBack }) => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [abnLoading, setAbnLoading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [directorCount, setDirectorCount] = useState(1);

  // -------------------- FORM STATE --------------------
  const [formData, setFormData] = useState<any>({
    abnNumber: "",
    businessName: "",
    entityType: "",
    dateOfAbnRegistration: "",
    dateOfIncorporation: "",
    businessAddress: "",
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
        licenceFrontUrl: "",
        licencePhotoUrl: "",
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
        licenceFrontUrl: "",
        licencePhotoUrl: "",
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

  // -------------------- GOOGLE MAPS AUTOCOMPLETE --------------------
  useEffect(() => {
    loadGoogleMapsScript(() => {
      const businessInput = document.getElementById(
        "businessAddress"
      ) as HTMLInputElement | null;
      if (businessInput && !businessInput.hasAttribute("data-autocomplete-initialized")) {
        const autocomplete = new google.maps.places.Autocomplete(businessInput, {
          types: ["address"],
          componentRestrictions: { country: "au" },
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place && place.formatted_address) {
            setFormData((prev: any) => ({
              ...prev,
              businessAddress: place.formatted_address,
            }));
          }
        });

        businessInput.setAttribute("data-autocomplete-initialized", "true");
      }
    });
  }, []);

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

      setFormData((prev: any) => ({
        ...prev,
        abnNumber: abn,
        businessName:
          data.EntityName ||
          data.MainName?.OrganisationName ||
          data.MainTradingName?.OrganisationName ||
          prev.businessName,
        entityType: data.EntityType?.EntityDescription || prev.entityType,
        dateOfAbnRegistration: data.ABNStatusEffectiveFrom
          ? new Date(data.ABNStatusEffectiveFrom).toLocaleDateString("en-AU")
          : prev.dateOfAbnRegistration,
      }));

      console.log("✅ ABN lookup success");
    } catch (err) {
      console.error("❌ ABN lookup failed", err);
    } finally {
      setAbnLoading(false);
    }
  };

  // -------------------- INPUT HANDLERS --------------------
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "abnNumber" && value.replace(/\D/g, "").length === 11) {
      handleAbnLookup(value);
    }
  };

  const handleDirectorChange = (index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const directors = [...prev.directors];
      directors[index - 1][field] = value;
      return { ...prev, directors };
    });
  };

  const formatDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length >= 5) return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const handleDateChange = (e: any) => {
    const { name, value } = e.target;
    const formatted = formatDate(value);
    setFormData((prev: any) => ({ ...prev, [name]: formatted }));
  };
  // -------------------- SUPABASE FILE UPLOADS --------------------
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
    return data.publicUrl;
  };

  const handleFileUpload = async (e: any, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, "vendor_uploads");
      setFormData((prev: any) => ({ ...prev, [field]: url }));
      console.log(`✅ Uploaded ${field}`);
    } catch (err) {
      console.error("❌ Upload error", err);
    }
  };

  const handleDirectorFileUpload = async (e: any, dirIndex: number, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file, "vendor_docs");
      setFormData((prev: any) => {
        const directors = [...prev.directors];
        directors[dirIndex - 1][`${field}Url`] = url;
        return { ...prev, directors };
      });
      console.log(`✅ Uploaded ${field} for Director ${dirIndex}`);
    } catch (err) {
      console.error("❌ Director upload failed", err);
    }
  };

  // -------------------- SAVE FOR LATER --------------------
  const saveFormForLater = async () => {
    setSaving(true);
    try {
      let draft = savedId;
      if (draft) {
        const { error } = await supabase.from("vendor_drafts").update({ formData }).eq("id", draft);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vendor_drafts")
          .insert([{ formData }])
          .select("id")
          .single();
        if (error) throw error;
        draft = data.id;
        setSavedId(draft);
      }

      const resumeLink = `${window.location.origin}/vendor-intake?draftId=${draft}`;
      const emailPayload = {
        to: [formData.email],
        subject: "Your Saved Vendor Application – Resume Anytime",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
            <h2>Your Saved Vendor Application</h2>
            <p>Dear ${formData.businessName || "Vendor"},</p>
            <p>You’ve saved your Vendor Accreditation Application for later.</p>
            <p>Click below to resume:</p>
            <p><a href="${resumeLink}" style="background:#0ac432;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Resume Application</a></p>
            <p>Kind regards,<br><strong>Australian Solar Lending Solutions</strong></p>
          </div>
        `,
      };

      const res = await fetch(
        "https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(emailPayload),
        }
      );

      if (!res.ok) throw new Error("Email failed to send");
      alert(`✅ Progress saved! Check your email for the resume link.`);
    } catch (err) {
      console.error("❌ Save failed", err);
      alert("Error saving progress. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------- PDF GENERATION --------------------
  const generatePDF = async (formData: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.text("ASLS Vendor Intake Form", pageWidth / 2, 20, { align: "center" });

    // Business Details
    doc.setFontSize(14);
    doc.text("Business Details", 14, 30);
    autoTable(doc, {
      startY: 35,
      head: [["Field", "Information"]],
      body: [
        ["ABN", formData.abnNumber],
        ["Business Name", formData.businessName],
        ["Entity Type", formData.entityType],
        ["Email", formData.email],
        ["Phone", formData.phone],
        ["Website", formData.website],
        ["Address", formData.businessAddress],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 196, 50] },
    });

    // Directors
    const directors = formData.directors || [];
    doc.text("Directors", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Name", "DOB", "Address", "Licence #", "State", "Expiry"]],
      body: directors.map((d: any) => [
        `${d.firstName} ${d.middleName} ${d.surname}`,
        d.dob,
        d.address,
        d.licenceNumber,
        d.licenceState,
        d.licenceExpiry,
      ]),
      styles: { fontSize: 10 },
    });

    // Banking
    doc.text("Banking Details", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      body: [
        ["Account Name", formData.accountName],
        ["BSB", formData.bsb],
        ["Account Number", formData.accountNumber],
      ],
      styles: { fontSize: 10 },
    });

    // Agreement
    doc.text("Agreement", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      body: [
        ["Terms Accepted", formData.tcsAccepted ? "Yes" : "No"],
        ["Signed By", formData.signatureName],
        ["Date Signed", formData.signatureDate],
      ],
      styles: { fontSize: 10 },
    });

    const pdfBlob = doc.output("blob");

    // Merge Terms & Conditions
    const termsResponse = await fetch("/terms-and-conditions.pdf");
    const termsBytes = await termsResponse.arrayBuffer();
    const mainPdf = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
    const termsPdf = await PDFLib.PDFDocument.load(termsBytes);
    const copied = await mainPdf.copyPages(termsPdf, termsPdf.getPageIndices());
    copied.forEach((page) => mainPdf.addPage(page));

    const finalBytes = await mainPdf.save();
    return { pdfBlob: new Blob([finalBytes], { type: "application/pdf" }) };
  };

  // -------------------- HELPERS --------------------
  const readAsBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  // -------------------- SUBMIT FORM --------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Generate & Upload PDF
      const { pdfBlob } = await generatePDF(formData);
      const pdfFileName = `vendor_${formData.businessName}_${Date.now()}.pdf`;

      const { error: pdfError } = await supabase.storage
        .from("uploads")
        .upload(`vendor_forms/${pdfFileName}`, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (pdfError) throw pdfError;

      const { data: pdfUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(`vendor_forms/${pdfFileName}`);
      const pdfUrl = pdfUrlData.publicUrl;

      // 2️⃣ Licence URLs
      const licenceSections: string[] = [];
      for (const [index, d] of formData.directors.entries()) {
        const front = d.licenceFrontUrl;
        const back = d.licencePhotoUrl;
        if (front || back) {
          licenceSections.push(`
            <strong>Director ${index + 1}</strong><br>
            ${front ? `<a href="${front}" target="_blank">Licence Front</a><br>` : ""}
            ${back ? `<a href="${back}" target="_blank">Licence Back</a>` : ""}
          `);
        }
      }

      // 3️⃣ Supporting Documents
      const docs: string[] = [];
      if (formData.certificateFiles)
        docs.push(`<a href="${formData.certificateFiles}" target="_blank">Certificate / Trust Deed</a>`);
      if (formData.bankStatement)
        docs.push(`<a href="${formData.bankStatement}" target="_blank">Bank Statement</a>`);
      if (formData.taxInvoiceTemplate)
        docs.push(`<a href="${formData.taxInvoiceTemplate}" target="_blank">Tax Invoice Template</a>`);

      // 4️⃣ Admin Email
      const adminEmailPayload = {
        to: ["john@worldmachine.com.au", "admin@asls.net.au"],
        subject: `New Vendor Submission – ${formData.businessName}`,
        html: `
          <h2>New Vendor Intake Submission</h2>
          <p><strong>Business Name:</strong> ${formData.businessName}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Phone:</strong> ${formData.phone}</p>
          <p><strong>Website:</strong> ${formData.website}</p>
          <p><strong>Address:</strong> ${formData.businessAddress}</p>

          <hr/>
          <h3>📄 Vendor Form PDF</h3>
          <a href="${pdfUrl}" target="_blank">View Vendor Summary</a>

          ${
            licenceSections.length
              ? `<hr/><h3>Driver Licences</h3>${licenceSections.join("<br><br>")}`
              : ""
          }

          ${
            docs.length
              ? `<hr/><h3>Supporting Documents</h3>${docs.join("<br>")}`
              : ""
          }

          <hr/>
          <p><em>Submitted via ASLS Vendor Portal</em></p>
        `,
      };

      const adminRes = await fetch(
        "https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(adminEmailPayload),
        }
      );

      if (!adminRes.ok) throw new Error("Admin email failed to send");

      // 5️⃣ Vendor Confirmation Email (Cleaned + Styled)
      const vendorEmailPayload = {
        to: [formData.email],
        subject: "Thank You for Submitting Your Vendor Accreditation Application",
        text: `
Dear ${formData.businessName},

Thank you for submitting your Vendor Accreditation Application with Australian Solar Lending Solutions.

Your application is now under review. Our Client Services team will contact you within 24 hours on the number provided to guide you through the next steps.

Once accredited, you’ll receive an email inviting you to access our Vendor Portal to submit finance applications and monitor their progress.

We appreciate your partnership and look forward to working with you.

Kind regards,
The Accreditation Team
Australian Solar Lending Solutions
        `,
        html: `
<div style="font-family: Arial, sans-serif; line-height:1.6; color:#222; background:#f9f9f9; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); overflow:hidden;">
    
    <div style="text-align:center; background-color:#0ac432; padding:25px 0; border-bottom:4px solid #06b824ff;">
      <img src="https://portal.asls.net.au/ASLS-logo.png" alt="Australian Solar Lending Solutions" style="max-width:200px; height:auto;" />
    </div>

    <div style="padding:30px;">
      <p>Dear ${formData.businessName},</p>

      <p>Thank you for submitting your <strong>Vendor Accreditation Application</strong> with 
      <strong>Australian Solar Lending Solutions (ASLS)</strong>.</p>

      <p>Your application is now under review. Our Client Services team will be in touch within 
      <strong>24 hours</strong> on the number provided to guide you through the next steps.</p>

      <p>Once accredited, you’ll receive an invitation to access our Vendor Portal to submit and track your finance applications.</p>

      <p>You can visit our portal anytime at 
        <a href="https://portal.asls.net.au" target="_blank" style="color:#00796b; text-decoration:none; font-weight:bold;">
          https://portal.asls.net.au
        </a>.
      </p>

      <p>We appreciate your partnership and look forward to working with you.</p>

      <p style="margin-top:20px;">
        Kind regards,<br/>
        <strong>The Accreditation Team</strong><br/>
        Australian Solar Lending Solutions
      </p>
    </div>

    <div style="text-align:center; font-size:12px; color:#888; padding:15px; background-color:#f1f1f1;">
      © ${new Date().getFullYear()} Australian Solar Lending Solutions. All rights reserved.
    </div>
  </div>
</div>
        `,
      };

      const vendorRes = await fetch(
        "https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(vendorEmailPayload),
        }
      );

      if (!vendorRes.ok) throw new Error("Vendor confirmation email failed to send");

      alert("✅ Submission sent successfully! Thank you.");
    } catch (error: any) {
      console.error("❌ Submission Error:", error);
      alert(`❌ Submission Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  // -------------------- FORM UI --------------------
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
                  onChange={handleDateChange}
                  className="w-full border rounded-lg p-3"
                  required
                />
              </div>
            )}
          </div>

          {/* 📞 Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="font-semibold text-gray-700">Phone Number*</label>
              <input
                type="tel"
                name="phone"
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
                placeholder="e.g. www.businessname.com.au"
                value={formData.website}
                onChange={handleChange}
                className="w-full border-gray-300 rounded-lg p-3"
              />
            </div>
          </div>

          {/* 🏠 Business Address */}
          <div>
            <label className="font-semibold text-gray-700">Business Address*</label>
            <input
              id="businessAddress"
              type="text"
              name="businessAddress"
              placeholder="Start typing to search address..."
              value={formData.businessAddress}
              onChange={handleChange}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          {/* 👤 Directors */}
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
            <div key={d.index} className="border border-gray-200 rounded-xl p-6 bg-green-50 mt-4">
              <h3 className="font-bold text-lg mb-4 text-green-800">Director {d.index}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  placeholder="First Name"
                  value={d.firstName}
                  onChange={(e) => handleDirectorChange(d.index, "firstName", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Middle Name"
                  value={d.middleName}
                  onChange={(e) => handleDirectorChange(d.index, "middleName", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                />
                <input
                  placeholder="Surname"
                  value={d.surname}
                  onChange={(e) => handleDirectorChange(d.index, "surname", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Date of Birth (DD/MM/YYYY)"
                  value={d.dob}
                  onChange={(e) => handleDirectorChange(d.index, "dob", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  id={`address-${d.index}`}
                  placeholder="Residential Address"
                  value={d.address}
                  onChange={(e) => handleDirectorChange(d.index, "address", e.target.value)}
                  className="col-span-1 sm:col-span-2 border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Licence Number"
                  value={d.licenceNumber}
                  onChange={(e) => handleDirectorChange(d.index, "licenceNumber", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <select
                  value={d.licenceState}
                  onChange={(e) => handleDirectorChange(d.index, "licenceState", e.target.value)}
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
                  onChange={(e) => handleDirectorChange(d.index, "licenceExpiry", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
              </div>

              {/* Licence Uploads */}
              <div className="mt-4">
                <label className="block font-semibold text-gray-700 mb-1">Driver’s Licence (Front)*</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDirectorFileUpload(e, d.index, "licenceFront")}
                  className="w-full border-gray-300 rounded-lg p-2"
                  required
                />
                {d.licenceFrontUrl && <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>}

                <label className="block font-semibold text-gray-700 mt-4 mb-1">Driver’s Licence (Back)*</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleDirectorFileUpload(e, d.index, "licencePhoto")}
                  className="w-full border-gray-300 rounded-lg p-2"
                  required
                />
                {d.licencePhotoUrl && <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>}
              </div>
            </div>
          ))}

         {/* 📎 Supporting Documents */}
<div className="space-y-6 mt-10">
  <h3 className="text-lg font-bold text-green-800">Supporting Documents</h3>

  {[
    { label: "Certificate of Business Registration / Trust Deeds*", field: "certificateFiles" },
    { label: "Bank Statement Header*", field: "bankStatement" },
    { label: "Tax Invoice Template*", field: "taxInvoiceTemplate" },
  ].map(({ label, field }) => (
    <div
      key={field}
      className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3 sm:space-y-0 sm:space-x-4"
    >
      <div className="flex-1">
        <label className="block font-semibold text-gray-700 mb-1">{label}</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleFileUpload(e, field)}
          className="w-full border border-gray-300 rounded-lg p-2"
          required
        />
        {formData[field] && (
          <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>
        )}
      </div>
    </div>
  ))}

  {/* 📷 Optional: General photo capture input */}
  <div className="mt-6">
    <label className="block font-semibold text-gray-700 mb-1">Upload Photo</label>
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(e) => handleFileUpload(e, "photoCapture")}
      className="w-full border border-gray-300 rounded-lg p-3"
    />
  </div>
</div>

{/* ☀️ Solar Equipment Brands */}
<div className="mt-10">
  <h3 className="text-lg font-bold text-green-800">Solar Equipment & Supplies (Brand Partnerships)</h3>
  <p className="text-gray-600 mb-4">
    Please select all applicable brands your business currently supplies or installs.
  </p>

  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    {/* Panels */}
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Panels</h4>
      {[
        "Canadian Solar", "Hyundai Solar", "Jinko", "Longi", "QCells", "Risen Solar",
        "REC", "SunPower", "SunTech", "Trina", "Other",
      ].map((brand) => (
        <div key={brand}>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.solarPanels.includes(brand)}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  solarPanels: e.target.checked
                    ? [...prev.solarPanels, brand]
                    : prev.solarPanels.filter((b: string) => b !== brand),
                }))
              }
            />
            <span>{brand}</span>
          </label>
        </div>
      ))}
    </div>

    {/* Inverters */}
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Inverters</h4>
      {[
        "Fronius", "GE", "Goodwe", "Growatt", "Huawei", "Solaredge",
        "SolaX Power", "Solis", "SMA", "Other",
      ].map((brand) => (
        <div key={brand}>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.inverters.includes(brand)}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  inverters: e.target.checked
                    ? [...prev.inverters, brand]
                    : prev.inverters.filter((b: string) => b !== brand),
                }))
              }
            />
            <span>{brand}</span>
          </label>
        </div>
      ))}
    </div>

    {/* Batteries */}
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Batteries</h4>
      {[
        "Alpha ESS", "BYD", "Enphase", "LG", "Sonnen", "Tesla", "Other",
      ].map((brand) => (
        <div key={brand}>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.batteries.includes(brand)}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  batteries: e.target.checked
                    ? [...prev.batteries, brand]
                    : prev.batteries.filter((b: string) => b !== brand),
                }))
              }
            />
            <span>{brand}</span>
          </label>
        </div>
      ))}
    </div>
  </div>
</div>

{/* 🏦 Banking Details */}
<div className="mt-10">
  <h3 className="text-lg font-bold text-green-800 mb-2">Banking Details</h3>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <div>
      <label className="block font-semibold text-gray-700 mb-1">Account Name*</label>
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
      <label className="block font-semibold text-gray-700 mb-1">BSB*</label>
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
      <label className="block font-semibold text-gray-700 mb-1">Account Number*</label>
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

{/* 📜 Terms & Conditions */}
<div className="mt-10 border-t pt-6">
  <h3 className="text-lg font-bold text-green-800 mb-3">Terms & Conditions</h3>
  <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 mb-4">
    <p className="text-gray-700 mb-2">
      By submitting this form, you agree to the ASLS Vendor Terms & Conditions.
    </p>
    <a
      href="/terms-and-conditions.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-700 underline"
    >
      View full Terms & Conditions (PDF)
    </a>
  </div>

  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      name="tcsAccepted"
      checked={formData.tcsAccepted}
      onChange={handleChange}
      className="h-5 w-5 text-green-600"
      required
    />
    <span className="text-gray-700">
      I have read and agree to the Terms & Conditions
    </span>
  </label>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
    <div>
      <label className="block font-semibold text-gray-700 mb-1">
        Signature (Full Name)*
      </label>
      <input
        type="text"
        name="signatureName"
        value={formData.signatureName}
        onChange={handleChange}
        placeholder="Type Full Name"
        className="w-full border rounded-lg p-3"
        required
      />
    </div>
    <div>
      <label className="block font-semibold text-gray-700 mb-1">
        Date Signed*
      </label>
      <input
        type="text"
        name="signatureDate"
        placeholder="DD/MM/YYYY"
        value={formData.signatureDate}
        onChange={handleDateChange}
        className="w-full border rounded-lg p-3"
        required
      />
    </div>
  </div>
</div>

{/* 🔘 Buttons */}
<div className="flex justify-between items-center mt-10 border-t pt-6">
  <button
    type="button"
    onClick={onBack}
    className="flex items-center text-gray-600 font-medium hover:text-green-700"
  >
    <ArrowLeft className="w-5 h-5 mr-1" /> Back
  </button>

  <div className="flex space-x-3">
    <button
      type="button"
      onClick={saveFormForLater}
      disabled={saving}
      className="bg-yellow-400 hover:bg-yellow-500 text-white font-medium px-6 py-3 rounded-lg flex items-center"
    >
      {saving ? (
        <Loader2 className="animate-spin w-5 h-5 mr-2" />
      ) : (
        <Save className="w-5 h-5 mr-2" />
      )}
      Save for Later
    </button>

    <button
      type="submit"
      disabled={loading || !formData.tcsAccepted}
      className={`px-6 py-3 rounded-lg font-medium text-white ${
        loading
          ? "bg-gray-400 cursor-not-allowed"
          : formData.tcsAccepted
          ? "bg-green-600 hover:bg-green-700"
          : "bg-gray-300 cursor-not-allowed"
      }`}
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