import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BusinessDetailsSection from "./forms/BusinessDetailsSection";
import AddressDetailsSection from "./forms/AddressDetailsSection";
import SupplierSection from "./forms/SupplierSection";
import BrokerageSection from "./forms/BrokerageSection";
import EquipmentDetailsSection from "./forms/EquipmentDetailsSection";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as PDFLib from "pdf-lib";
/* global google */

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
  const [successId, setSuccessId] = useState<string | null>(null);
  const [abnLoading, setAbnLoading] = useState(false);
  const [supplierAbnLoading, setSupplierAbnLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  const [files, setFiles] = useState({
    driversLicenseFront: null as File | null,
    driversLicenseBack: null as File | null,
    medicareCard: null as File | null,
    supportingDocs: [] as Array<{ file: File; type?: string; name?: string }>,
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
    email: "",
    dateOfIncorporation: "",
    additionalInfo: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "",
    postcode: "",
    country: "Australia",
    premisesType: "",
    leaseExpiryDate: "",
    phone: "",
    supplierAccredited: "",
    vendorName: "",
    vendorId: "",
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
    depositPaid: "",
    financeAmount: "",
    term: "",
  });

  const abnDebounceRef = useRef<number | null>(null);
  const supplierAbnDebounceRef = useRef<number | null>(null);

  // Attach Google Places Autocomplete to installation address
  useEffect(() => {
    loadGoogleMapsScript(() => {
      const input = document.getElementById('streetAddress') as HTMLInputElement | null;
      if (input && !(input as any)._acBound) {
        const ac = new google.maps.places.Autocomplete(input as any, { types: ['address'], componentRestrictions: { country: 'au' } });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace() as any;
          if (place?.formatted_address) {
            const comps = (place.address_components || []) as Array<{ long_name: string; short_name: string; types: string[] }>;
            const find = (type: string) => comps.find(c => c.types.includes(type));
            const city = (find('locality') || find('postal_town') || find('sublocality'))?.long_name || '';
            const state = (find('administrative_area_level_1'))?.short_name || '';
            const postcode = (find('postal_code'))?.short_name || '';
            const country = (find('country'))?.long_name || '';
            setFormData((prev) => ({
              ...prev,
              streetAddress: place.formatted_address,
              city: city || prev.city,
              state: state || prev.state,
              postcode: postcode || prev.postcode,
              country: country || prev.country,
            }));
          }
        });
        (input as any)._acBound = true;
      }
    });
  }, []);

  // Basic change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prev) => {
      const next = { ...prev, [name]: value } as any;
      if (name === 'invoiceAmount' || name === 'depositPaid') {
        const inv = parseFloat(name === 'invoiceAmount' ? value : next.invoiceAmount || '0') || 0;
        const dep = parseFloat(name === 'depositPaid' ? value : next.depositPaid || '0') || 0;
        next.financeAmount = Math.max(inv - dep, 0).toFixed(2);
      }
      return next;
    });
    if (name === "abnNumber" && digitsOnly(value).length === 11) {
      if (abnDebounceRef.current) window.clearTimeout(abnDebounceRef.current);
      abnDebounceRef.current = window.setTimeout(() => handleAbnLookup(value), 300) as any;
    }
  };

  // File handlers
  const handleFileChange = (key: string, file: File | null, docType?: string) => {
    setFiles((prev: any) => {
      if (key === "supportingDocs" && file) {
        return { ...prev, supportingDocs: [...prev.supportingDocs, { file, type: docType, name: file.name }] };
      }
      return { ...prev, [key]: file };
    });
  };

  // Equipment handlers
  const addEquipmentItem = () => {
    setEquipmentItems((prev) => [
      ...prev,
      {
        category: '',
        asset: '',
        quantity: '',
        unitPrice: '',
        manufacturer: '',
        serialNumber: 'As per Dealer Invoice/Annexure',
        description: '',
      },
    ]);
  };
  const removeEquipmentItem = (index: number) => {
    setEquipmentItems((prev) => prev.filter((_, i) => i !== index));
  };
  const updateEquipmentItem = (index: number, field: string, value: string) => {
    setEquipmentItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

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


  const readAsBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    try {
      const aslsLogo = await fetch("/ASLS-logo.png").then((r) => r.blob());
      const wmmLogo = await fetch("/World-Machine-Money-Logo.png").then((r) => r.blob());
      const aslsImg = await readAsBase64(aslsLogo);
      const wmmImg = await readAsBase64(wmmLogo);
      const lw = 40;
      const sp = 15;
      const total = lw * 2 + sp;
      const startX = (pageWidth - total) / 2;
      doc.addImage(aslsImg, "PNG", startX, 10, lw, 20);
      doc.addImage(wmmImg, "PNG", startX + lw + sp, 10, lw, 20);
    } catch {}
    doc.setFontSize(16);
    doc.text("ASLS Application Summary", pageWidth / 2, 40, { align: "center" });

    // Business Details
    doc.setFontSize(14);
    doc.text("Business Details", 14, 55);
    autoTable(doc, {
      startY: 60,
      head: [["Field", "Information"]],
      body: [
        ["ABN", formData.abnNumber || ""],
        ["Entity Name", formData.entityName || ""],
        ["Entity Type", formData.entityType || ""],
        ["Email", formData.email || ""],
        ["Phone", formData.phone || ""],
        ["Website", formData.website || ""],
        ["Industry Type", formData.industryType || ""],
      ],
      styles: { fontSize: 10 },
    });

    // Installation Address
    doc.text("Installation Address", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      body: [
        ["Street Address", formData.streetAddress || ""],
        ["Address Line 2", formData.streetAddress2 || ""],
        ["City", formData.city || ""],
        ["State", formData.state || ""],
        ["Postcode", formData.postcode || ""],
        ["Country", formData.country || ""],
        ["Premises Type", formData.premisesType || ""],
        ["Lease Expiry Date", formData.leaseExpiryDate || ""],
      ],
      styles: { fontSize: 10 },
    });

    // Supplier
    doc.text("Supplier Identification", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      body: [
        ["Vendor Name", formData.vendorName || ""],
        ["Vendor ID", formData.vendorId || ""],
        ["Agent First Name", formData.agentFirstName || ""],
        ["Agent Last Name", formData.agentLastName || ""],
        ["Supplier Accredited", formData.supplierAccredited || ""],
        ["Supplier ABN", formData.supplierAbn || ""],
        ["Supplier Business Name", formData.supplierBusinessName || ""],
        ["Supplier Address", `${formData.supplierAddress || ""} ${formData.supplierCity || ""} ${formData.supplierState || ""} ${formData.supplierPostcode || ""}`.trim()],
        ["Supplier Email", formData.supplierEmail || ""],
        ["Supplier Phone", formData.supplierPhone || ""],
      ],
      styles: { fontSize: 10 },
    });

    // Equipment
    doc.text("Equipment Items", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["Category", "Asset", "Qty", "Unit Price", "Manufacturer", "Serial #", "Description"]],
      body: equipmentItems.map((it) => [it.category, it.asset, it.quantity, it.unitPrice, it.manufacturer, it.serialNumber, it.description]),
      styles: { fontSize: 9 },
    });

    // Brokerage & Term
    doc.text("Brokerage & Term", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      body: [["Invoice Amount (Incl GST)", formData.invoiceAmount || ""], ["Term (months)", formData.term || ""]],
      styles: { fontSize: 10 },
    });

    // Uploaded Docs summary
    const uploaded: { label: string; name?: string }[] = [];
    if (files.driversLicenseFront) uploaded.push({ label: "Drivers Licence Front", name: files.driversLicenseFront.name });
    if (files.driversLicenseBack) uploaded.push({ label: "Drivers Licence Back", name: files.driversLicenseBack.name });
    if (files.medicareCard) uploaded.push({ label: "Medicare Card", name: files.medicareCard.name });
    files.supportingDocs.forEach((d) => uploaded.push({ label: d.type || "Supporting Doc", name: d.file?.name }));
    doc.text("Uploaded Documents", 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [["Type", "File"]],
      body: uploaded.map((u) => [u.label, u.name || ""]),
      styles: { fontSize: 10 },
    });

    const pdfBlob = doc.output("blob");
    const termsResp = await fetch("/terms-and-conditions.pdf");
    const termsBytes = await termsResp.arrayBuffer();
    const main = await PDFLib.PDFDocument.load(await pdfBlob.arrayBuffer());
    const terms = await PDFLib.PDFDocument.load(termsBytes);
    const pages = await main.copyPages(terms, terms.getPageIndices());
    pages.forEach((p) => main.addPage(p));
    const finalBytes = await main.save();
    return new Blob([finalBytes], { type: "application/pdf" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const referenceNumber = `APP-${Date.now()}`;
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
      // 1. Generate PDF
      const pdfBlob = await generatePDF();
      const pdfPath = `applications/${referenceNumber}.pdf`;
      const { error: pdfErr } = await supabase.storage
        .from("uploads")
        .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
      if (pdfErr) throw pdfErr;
      const { data: pdfUrlData } = supabase.storage.from("uploads").getPublicUrl(pdfPath);
      const pdfUrl = pdfUrlData?.publicUrl;

      // 2. Upload supporting files
      const uploadOne = async (key: string, file: File | null) => {
        if (!file) return null;
        const path = `applications/${referenceNumber}/${key}_${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
        if (error) throw error;
        return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
      };
      const links: string[] = [];
      const dlF = await uploadOne("drivers_front", files.driversLicenseFront);
      const dlB = await uploadOne("drivers_back", files.driversLicenseBack);
      const med = await uploadOne("medicare", files.medicareCard);
      if (dlF) links.push(`DL Front: ${dlF}`);
      if (dlB) links.push(`DL Back: ${dlB}`);
      if (med) links.push(`Medicare: ${med}`);
      for (const d of files.supportingDocs) {
        const url = await uploadOne(`support_${d.type || "doc"}`, d.file);
        if (url) links.push(`${d.type || "Doc"}: ${url}`);
      }

      // 3. Persist minimal record for dashboard (best-effort)
      try {
        await supabase.from('applications').insert([
          {
            id: referenceNumber,
            status: 'submitted',
            entity_name: formData.entityName || null,
            abn_number: formData.abnNumber || null,
            vendor_id: formData.vendorId || null,
            vendor_name: formData.vendorName || null,
            finance_amount: formData.financeAmount || null,
            pdf_url: pdfUrl || null,
            data: payload,
          },
        ] as any);
      } catch (e) {
        console.warn('Applications table insert failed (create table and RLS policy to enable):', e);
      }

      // 4. Email admins
      const subject = `ASLS Application ${referenceNumber} - ${formData.entityName || formData.abnNumber}`;
      const html = `
        <h2>New Application Submitted</h2>
        <p><strong>Application ID:</strong> ${referenceNumber}</p>
        <p><strong>Business:</strong> ${formData.entityName || ""}</p>
        <p><strong>ABN:</strong> ${formData.abnNumber || ""}</p>
        <p><a href="${pdfUrl}" target="_blank">View PDF Summary</a></p>
        ${links.length ? `<p><strong>Uploaded Files:</strong><br>${links.map((l) => `<div>${l}</div>`).join("")}</p>` : ""}
      `;
      await fetch("https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ to: ["john@asls.net.au", "admin@asls.net.au"], subject, text: `PDF: ${pdfUrl}`, html }),
      });

      // Success UI: inline banner with Application ID
      setSuccessId(referenceNumber);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
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
        {successId && (
          <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 flex items-start justify-between">
            <div>
              <p className="font-semibold">Application Submitted Successfully</p>
              <p className="text-sm">Your Application ID is <span className="font-mono font-bold">{successId}</span>. Keep this for your records.</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(successId)}
              className="ml-4 inline-flex items-center rounded-md border border-green-400 px-3 py-1 text-sm hover:bg-green-100"
            >
              Copy ID
            </button>
          </div>
        )}
        <div className="w-full flex justify-center mb-6">
          <img
            src="/ASLS-logo.png"
            alt="ASLS"
            className="h-36 sm:h-48 object-contain max-w-[420px]"
          />
        </div>
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
            handleChange={handleChange}
            abnLoading={abnLoading}
          />
          <AddressDetailsSection
            formData={formData}
            handleChange={handleChange}
            addressLoading={addressLoading}
            addressSuggestions={addressSuggestions}
            selectAddress={() => {}}
            handleAddressVerify={() => {}}
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
          />
          <EquipmentDetailsSection
            equipmentItems={equipmentItems}
            addEquipmentItem={addEquipmentItem}
            removeEquipmentItem={removeEquipmentItem}
            updateEquipmentItem={updateEquipmentItem}
          />

          <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex justify-between items-center">
            <span className="text-lg font-medium text-gray-800">
              Total Amount (Incl GST):
            </span>
            <span className="text-2xl font-bold text-green-600">
              ${formData.financeAmount || '0.00'}
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
