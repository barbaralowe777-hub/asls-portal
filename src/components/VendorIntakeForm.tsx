// -----------------------------------------------
// ASLS Vendor Intake Form (FINAL PRODUCTION)
// Includes Google Maps Autocomplete, PDF Attachments, and Supabase Email
// -----------------------------------------------

import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Loader2, ArrowLeft, Camera, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";

// ✅ Load Google Maps API script safely once
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
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draftId");

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
  // -------------------- GOOGLE MAPS AUTOCOMPLETE --------------------
  useEffect(() => {
    loadGoogleMapsScript(() => {
      const businessInput = document.getElementById("businessAddress") as HTMLInputElement | null;
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

  // -------------------- GOOGLE AUTOCOMPLETE FOR DIRECTORS --------------------
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
            if (place.formatted_address) {
              handleDirectorChange(d.index, "address", place.formatted_address);
            }
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
      }));
      console.log("✅ ABN lookup completed successfully");
    } catch (err) {
      console.error("❌ ABN lookup failed", err);
    } finally {
      setAbnLoading(false);
    }
  };

  // -------------------- DATE FORMATTING --------------------
  const formatDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length >= 5) return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  // -------------------- INPUT HANDLERS --------------------
  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;

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

    if (name === "abnNumber" && value.replace(/\D/g, "").length === 11) {
      handleAbnLookup(value);
    }
  };

  const handleDirectorChange = (index: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const directors = [...prev.directors];
      directors[index - 1][field] = value;
      return { ...prev, directors };
    });
  };

  // -------------------- FILE UPLOAD HELPERS --------------------
  const uploadFile = async (file: File, folder: string) => {
    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("uploads").upload(fileName, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);
    console.log(`📁 Uploaded file to Supabase: ${data.publicUrl}`);
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
    // Upload to Supabase Storage
    const filePath = `vendor_docs/director_${dirIndex}_${field}_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from("uploads").upload(filePath, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath);
    const fileUrl = publicUrlData.publicUrl;

    // Update formData with both file and its URL
    setFormData((prev: any) => {
      const directors = [...prev.directors];
      directors[dirIndex - 1][field] = file; // store the file
      directors[dirIndex - 1][`${field}Url`] = fileUrl; // store the public URL
      return { ...prev, directors };
    });

    console.log(`✅ Uploaded ${field} for Director ${dirIndex}:`, fileUrl);
  } catch (err) {
    console.error("❌ Director upload failed:", err);
  }
};


  // -------------------- SAVE FOR LATER --------------------
  const saveFormForLater = async () => {
    setSaving(true);
    try {
      let draftId = savedId;
      if (draftId) {
        await supabase.from("vendor_drafts").update({ formData }).eq("id", draftId);
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

      const resumeLink = `${window.location.origin}/vendor-intake?draftId=${draftId}`;
      alert("✅ Your progress has been saved! You can resume later using the saved link:\n" + resumeLink);
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

    // 🖼️ Logos
    const aslsLogo = await fetch("/ASLS-logo.png").then((res) => res.blob());
    const wmmLogo = await fetch("/World-Machine-Money-Logo.png").then((res) => res.blob());
    const aslsImg = await readAsBase64(aslsLogo);
    const wmmImg = await readAsBase64(wmmLogo);

    const logoWidth = 40;
    const spacing = 15;
    const totalWidth = logoWidth * 2 + spacing;
    const startX = (pageWidth - totalWidth) / 2;

    doc.addImage(aslsImg, "PNG", startX, 10, logoWidth, 20);
    doc.addImage(wmmImg, "PNG", startX + logoWidth + spacing, 10, logoWidth, 20);

    doc.setFontSize(16);
    doc.text("ASLS Vendor Intake Form", pageWidth / 2, 40, { align: "center" });

    // 🧾 Business Details
    doc.setFontSize(14);
    doc.text("Business Details", 14, 55);
    autoTable(doc, {
      startY: 60,
      head: [["Field", "Information"]],
      body: [
        ["ABN Number", formData.abnNumber || ""],
        ["Business Name", formData.businessName || ""],
        ["Entity Type", formData.entityType || ""],
        ["Phone", formData.phone || ""],
        ["Mobile", formData.mobile || ""],
        ["Email", formData.email || ""],
        ["Website", formData.website || ""],
        ["Business Address", formData.businessAddress || ""],
        ["Date of Incorporation", formData.dateOfIncorporation || ""],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [60, 179, 113] },
    });

    // 👥 Directors
    const directors = formData.directors || [];
    doc.setFontSize(14);
    doc.text("Directors", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Name", "Phone", "Mobile", "Licence #", "State", "Expiry"]],
      body: directors.map((d: any) => [
        `${d.firstName} ${d.middleName} ${d.surname}`.trim(),
        d.phone || "",
        d.mobile || "",
        d.licenceNumber || "",
        d.licenceState || "",
        d.licenceExpiry || "",
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [100, 149, 237] },
    });

    // 📎 Uploaded Docs
    doc.setFontSize(14);
    doc.text("Uploaded Documents", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [["Document Type", "File URL"]],
      body: [
        ["Certificate / Trust Deed", formData.certificateFiles ? "Uploaded ✅" : "Not uploaded"],
        ["Bank Statement", formData.bankStatement ? "Uploaded ✅" : "Not uploaded"],
        ["Tax Invoice Template", formData.taxInvoiceTemplate ? "Uploaded ✅" : "Not uploaded"],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [120, 120, 120] },
    });

    // ⚡ Solar Equipment
    const listToString = (list: string[]) => (list?.length ? list.join(", ") : "None");
    doc.setFontSize(14);
    doc.text("Solar Equipment", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      body: [
        ["Panels", listToString(formData.solarPanels)],
        ["Inverters", listToString(formData.inverters)],
        ["Batteries", listToString(formData.batteries)],
      ],
      styles: { fontSize: 10 },
    });

    // 💳 Banking
    doc.setFontSize(14);
    doc.text("Banking Details", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      body: [
        ["Account Name", formData.accountName || ""],
        ["BSB", formData.bsb || ""],
        ["Account Number", formData.accountNumber || ""],
      ],
      styles: { fontSize: 10 },
    });

    // 📜 Terms
    doc.setFontSize(14);
    doc.text("Agreement", 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      body: [
        ["Terms Accepted", formData.tcsAccepted ? "✅ Yes" : "❌ No"],
        ["Signed By", formData.signatureName || ""],
        ["Date Signed", formData.signatureDate || ""],
      ],
      styles: { fontSize: 10 },
    });

    doc.setFontSize(10);
    doc.text("Generated automatically by ASLS Vendor Portal", pageWidth / 2, 285, {
      align: "center",
    });

    const pdfBlob = doc.output("blob");
    const pdfBase64 = await blobToBase64(pdfBlob);
    return { pdfBlob, pdfBase64 };
  };

  // -------------------- BLOB HELPERS --------------------
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

    // 2️⃣ Handle Licence URLs (your current correct version)
    let licenceUrl = null;
    const licenceUrls: string[] = [];

    for (const [index, director] of formData.directors.entries()) {
      const frontUrl = director.licenceFrontUrl || null;
      const backUrl = director.licencePhotoUrl || null;

      if (frontUrl || backUrl) {
        licenceUrls.push(
          `<strong>Director ${index + 1}</strong><br>` +
            `${frontUrl ? `Front: <a href="${frontUrl}" target="_blank">View</a><br>` : ""}` +
            `${backUrl ? `Back: <a href="${backUrl}" target="_blank">View</a>` : ""}`
        );
      }
    }

    if (licenceUrls.length > 0) {
      licenceUrl = licenceUrls.join("<hr>");
    }

// ✅ Collect supporting document URLs (if any exist)
const supportingUrls =
  formData.supportingDocuments?.map((doc: any) => doc.url || doc.publicUrl).filter(Boolean) || [];



    // 4️⃣ Send Email
    const emailPayload = {
      to: ["john@worldmachine.com.au", "admin@asls.net.au"],
      subject: `New Vendor Submission – ${formData.businessName}`,
      text: `A new vendor intake form has been submitted by ${formData.businessName}.`,
      html: `
        <h2>New Vendor Intake Submission</h2>
        <p><strong>Business Name:</strong> ${formData.businessName}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        <p><strong>Website:</strong> ${formData.website}</p>
        <p><strong>Address:</strong> ${formData.businessAddress || "—"}</p>

        <hr/>
        <h3>📄 Documents</h3>
        <p><a href="${pdfUrl}" target="_blank">View Vendor Summary PDF</a></p>
        ${licenceUrl ? `<h4>Driver Licence(s):</h4><p>${licenceUrl}</p>` : ""}
        ${
          supportingUrls.length
            ? `<p>Supporting Documents:<br>${supportingUrls
                .map((url) => `<a href="${url}" target="_blank">${url}</a>`)
                .join("<br>")}</p>`
            : ""
        }
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

    if (!res.ok) throw new Error("Email send failed");

    alert("✅ Submission sent successfully!");
  } catch (error) {
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
                  onChange={handleChange}
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
                placeholder="www.example.com"
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

          {/* 🏠 Address */}
          <div>
            <label className="font-semibold text-gray-700">Business Address*</label>
            <input
              id="businessAddress"
              type="text"
              name="businessAddress"
              placeholder="Start typing to search address..."
              value={formData.businessAddress || ""}
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
                  placeholder="Phone Number"
                  type="tel"
                  value={d.phone || ""}
                  onChange={(e) => handleDirectorChange(d.index, "phone", e.target.value)}
                  className="border-gray-300 rounded-lg p-3 shadow-sm"
                  required
                />
                <input
                  placeholder="Mobile Number"
                  type="tel"
                  value={d.mobile || ""}
                  onChange={(e) => handleDirectorChange(d.index, "mobile", e.target.value)}
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
                    onChange={(e) => handleDirectorChange(d.index, "dob", e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-3 shadow-sm"
                    required
                  />
                </div>

                <input
                  id={`address-${d.index}`}
                  placeholder="Start typing address..."
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
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDirectorFileUpload(e, d.index, "licenceFront")}
                    className="w-full border-gray-300 rounded-lg p-2"
                    required
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                {d.licenceFront && <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>}

                <label className="block font-semibold text-gray-700 mt-4 mb-1">Driver’s Licence (Back)*</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleDirectorFileUpload(e, d.index, "licencePhoto")}
                    className="w-full border-gray-300 rounded-lg p-2"
                    required
                  />
                  <Camera className="w-5 h-5 text-green-600" />
                </div>
                {d.licencePhoto && <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>}
              </div>
            </div>
          ))}

          {/* 📎 Supporting Documents */}
          <div className="space-y-4 mt-10">
            <h3 className="text-lg font-bold text-green-800">Supporting Documents</h3>
            {[
              { label: "Certificate of Business Registration / Trust Deeds*", field: "certificateFiles" },
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
                {formData[field] && <p className="text-xs text-green-600 mt-1">✅ Uploaded successfully</p>}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <label key={opt} className="flex items-center space-x-2 text-sm">
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
            <h3 className="text-lg font-bold text-green-800">Terms & Conditions</h3>
            <div className="bg-gray-100 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 mb-3">
                By submitting this form, you agree to the ASLS Vendor Terms & Conditions.
              </p>
              <a
                href="/terms-and-conditions.pdf"
                target="_blank"
                className="text-green-700 underline text-sm"
              >
                View full Terms & Conditions (PDF)
              </a>
              <div className="mt-4 flex items-center">
                <input
                  id="tcsAccepted"
                  type="checkbox"
                  name="tcsAccepted"
                  checked={formData.tcsAccepted}
                  onChange={handleChange}
                  required
                  className="w-5 h-5 text-green-700 border-gray-300 rounded focus:ring-green-500 accent-green-700"
                />
                <label htmlFor="tcsAccepted" className="ml-2 text-sm text-gray-700 font-medium">
                  I have read and agree to the Terms & Conditions
                </label>
              </div>
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

              <button
                type="submit"
                disabled={loading || !formData.tcsAccepted}
                className={`px-8 py-3 font-semibold rounded-lg transition disabled:opacity-50 ${
                  formData.tcsAccepted
                    ? "bg-green-700 text-white hover:bg-green-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
