import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BusinessDetailsSection from "./forms/BusinessDetailsSection";
import AddressDetailsSection from "./forms/AddressDetailsSection";
import SupplierSection from "./forms/SupplierSection";
import BrokerageSection from "./forms/BrokerageSection";
import EquipmentDetailsSection from "./forms/EquipmentDetailsSection";
import DirectorsSection, {
  DirectorInfo,
  createBlankDirector,
} from "./forms/DirectorsSection";
import GuarantorsSection, {
  GuarantorInfo,
  createBlankGuarantor,
} from "./forms/GuarantorsSection";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as PDFLib from "pdf-lib";
/* global google */

// Load Google Maps API once
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
  try { (script as any).loading = 'async'; } catch {}
  script.onload = callback;
  document.body.appendChild(script);
};

interface ApplicationFormProps {
  onBack?: () => void;
  onSubmit?: () => void;
}

const digitsOnly = (v: string) => v.replace(/\D/g, "");
const normalizeVendorCode = (value: string) =>
  (value || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
const AU_STATE_CODES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const splitAustralianAddress = (address?: string | null) => {
  const base = { street: "", city: "", state: "", postcode: "" };
  if (!address) return base;
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const street = parts[0] || "";
  let city = "";
  let state = "";
  let postcode = "";
  for (const part of parts) {
    if (!postcode) {
      const postMatch = part.match(/\b(\d{4})\b/);
      if (postMatch) postcode = postMatch[1];
    }
    if (!state) {
      const found = AU_STATE_CODES.find((code) =>
        part.toUpperCase().includes(code)
      );
      if (found) state = found;
    }
  }
  if (parts.length >= 3) {
    city = parts[parts.length - 3];
  } else if (parts.length >= 2) {
    city = parts[parts.length - 2];
  }
  return {
    street,
    city,
    state,
    postcode,
  };
};
const extractVendorAddress = (metadata?: any) => {
  if (metadata?.address_components && typeof metadata.address_components === "object") {
    const parts = metadata.address_components;
    return {
      street: parts.street || parts.address || "",
      city: parts.city || "",
      state: parts.state || "",
      postcode: parts.postcode || "",
    };
  }
  if (metadata?.address) return splitAustralianAddress(metadata.address);
  return splitAustralianAddress();
};

const ApplicationForm: React.FC<ApplicationFormProps> = ({ onBack, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [docuSignLoading, setDocuSignLoading] = useState(false);
  const [docuSignError, setDocuSignError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [createdAppId, setCreatedAppId] = useState<string | null>(null);
  const [abnLoading, setAbnLoading] = useState(false);
  const [supplierAbnLoading, setSupplierAbnLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [vendorPrefillLoading, setVendorPrefillLoading] = useState(false);
  const [vendorPrefillError, setVendorPrefillError] = useState<string | null>(null);
  const [vendorPrefillLocked, setVendorPrefillLocked] = useState(false);

  const [files, setFiles] = useState({
    supportingDocs: [] as Array<{ file: File; type?: string; name?: string }>,
  });

  // Demo mode disabled for application form
  const isDemoFlag = false;

  const clearVendorPrefillFields = useCallback(() => {
    setVendorPrefillLocked(false);
    setVendorPrefillError(null);
    setFormData((prev) => ({
      ...prev,
      vendorName: "",
      supplierBusinessName: "",
      supplierAbn: "",
      supplierAddress: "",
      supplierCity: "",
      supplierState: "",
      supplierPostcode: "",
      supplierEmail: "",
      supplierPhone: "",
    }));
  }, []);

  const fetchVendorDetails = useCallback(
    async (code: string) => {
      const normalized = normalizeVendorCode(code);
      if (!normalized) {
        clearVendorPrefillFields();
        return;
      }
      if (isDemoFlag) {
        setVendorPrefillLocked(false);
        setVendorPrefillError("Vendor lookup is disabled in demo mode.");
        return;
      }
      setVendorPrefillLoading(true);
      setVendorPrefillError(null);
      try {
        const { data, error } = await supabase
          .from("vendors")
          .select("vendor_code,name,contact_name,contact_email,abn,metadata,vendor_address,vendor_phone")
          .eq("vendor_code", normalized)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          clearVendorPrefillFields();
          setVendorPrefillError("Vendor ID not found");
          return;
        }
        const metadata = (data.metadata ?? {}) as Record<string, any>;
        const addressParts = extractVendorAddress(metadata);
        const streetLine =
          data.vendor_address ||
          addressParts.street ||
          metadata.address ||
          "";
        setFormData((prev) => ({
          ...prev,
          vendorId: data.vendor_code || normalized,
          vendorName: data.name || prev.vendorName,
          supplierBusinessName: data.name || prev.supplierBusinessName,
          supplierAbn: data.abn || prev.supplierAbn,
          supplierAddress: streetLine || prev.supplierAddress,
          supplierCity: addressParts.city || prev.supplierCity,
          supplierState: addressParts.state || prev.supplierState,
          supplierPostcode: addressParts.postcode || prev.supplierPostcode,
          supplierEmail: data.contact_email || prev.supplierEmail,
          supplierPhone:
            data.vendor_phone || metadata.phone || metadata.mobile || prev.supplierPhone,
          supplierAccredited: prev.supplierAccredited || "Yes",
        }));
        // Only lock fields if we actually populated an address; otherwise keep editable
        setVendorPrefillLocked(!!streetLine);
        setVendorPrefillError(null);
      } catch (err: any) {
        console.error("Vendor lookup failed", err);
        setVendorPrefillLocked(false);
        setVendorPrefillError(err?.message || "Unable to load vendor details");
      } finally {
        setVendorPrefillLoading(false);
      }
    },
    [clearVendorPrefillFields, isDemoFlag]
  );

  const scheduleVendorLookup = useCallback(
    (code: string) => {
      if (vendorLookupTimeoutRef.current) {
        window.clearTimeout(vendorLookupTimeoutRef.current);
      }
      const normalized = normalizeVendorCode(code);
      if (!normalized) {
        clearVendorPrefillFields();
        return;
      }
      vendorLookupTimeoutRef.current = window.setTimeout(() => {
        fetchVendorDetails(normalized);
      }, 400) as any;
    },
    [fetchVendorDetails, clearVendorPrefillFields]
  );

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
    abnRegisteredFrom: "",
    abnRegisteredDate: "",
    abnUnder2Years: false,
    product: "",
    industryType: "",
    website: "",
    email: "",
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

  // Repayments estimate (demo and live)
  const [repaymentIndustry, setRepaymentIndustry] = useState<string>("General");
  const [monthlyRepayment, setMonthlyRepayment] = useState<number | null>(null);

  const [directors, setDirectors] = useState<DirectorInfo[]>([
    createBlankDirector(),
  ]);
  const [directorsAreGuarantors, setDirectorsAreGuarantors] = useState(true);
  const [guarantors, setGuarantors] = useState<GuarantorInfo[]>([
    createBlankGuarantor(),
  ]);
  const directorAddressRefs = useRef<Array<HTMLInputElement | null>>([]);
  const vendorLookupTimeoutRef = useRef<number | null>(null);

  const DOC_FEE = 385; // kept for info; not used in calc below
  const UPLIFT_INDUSTRIES = ["Beauty", "Gym", "Hospitality"]; // +1% uplift
  const getBaseRate = (amount: number): number => {
    if (amount <= 20000) return 11.9;
    if (amount <= 35000) return 10.9;
    if (amount <= 50000) return 9.9;
    return 9.5;
  };
  const recalcRepayment = (amountStr?: string, termStr?: string, industryStr?: string) => {
    const amountSource = (amountStr ?? formData.financeAmount ?? "0");
    const amount = parseFloat(String(amountSource)) || 0;
    const monthsSource = (termStr ?? formData.term ?? "0");
    const months = parseInt(String(monthsSource), 10) || 0;
    const industry = (industryStr ?? repaymentIndustry) ?? "General";
    if (!amount || !months) { setMonthlyRepayment(null); return; }
    let rate = getBaseRate(amount);
    if (UPLIFT_INDUSTRIES.includes(industry)) rate += 1;
    const monthlyRate = rate / 100 / 12;
    const monthly = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    setMonthlyRepayment(monthly);
  };

  useEffect(() => {
    recalcRepayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.financeAmount, formData.term, repaymentIndustry]);

  const abnDebounceRef = useRef<number | null>(null);
  const supplierAbnDebounceRef = useRef<number | null>(null);
  const navigate = useNavigate();

  // Derive repayment industry from selected industryType when available
  useEffect(() => {
    const t = (formData.industryType || "").toLowerCase();
    const map: Record<string, string> = {
      beauty: "Beauty",
      gym: "Gym",
      hospitality: "Hospitality",
      retail: "Retail",
      transport: "Transport",
      construction: "Construction",
    };
    for (const key of Object.keys(map)) {
      if (t.includes(key)) { setRepaymentIndustry(map[key]); recalcRepayment(); return; }
    }
    setRepaymentIndustry("General");
    recalcRepayment();
  }, [formData.industryType]);
  
  // Load vendor_id from the logged-in profile
  useEffect(() => {
    (async () => {
    if (isDemoFlag) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        setAgentId(session.user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        const profileVendorId =
          (profile as any)?.vendor_id || (profile as any)?.vendorId || null;
        const profileAgentCode =
          (profile as any)?.agent_code ||
          (profile as any)?.agentCode ||
          (profile as any)?.agent_id ||
          session.user.user_metadata?.agent_code ||
          null;
        setVendorId(profileVendorId);
        setAgentId(profileAgentCode || session.user.id);
        setProfileRole((profile as any)?.role || null);
      } catch (e) {
        console.warn('Failed to load vendor_id', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!vendorId || isDemoFlag) return;
    const normalized = normalizeVendorCode(vendorId);
    setFormData((prev) => ({ ...prev, vendorId: normalized }));
    fetchVendorDetails(normalized);
  }, [vendorId, isDemoFlag, fetchVendorDetails]);

  useEffect(
    () => () => {
      if (vendorLookupTimeoutRef.current) {
        window.clearTimeout(vendorLookupTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const bindAutocomplete = () => {
      directorAddressRefs.current.forEach((input, idx) => {
        if (!input || (input as any)._acBound) return;
        const ac = new google.maps.places.Autocomplete(input as any, {
          types: ["address"],
          componentRestrictions: { country: "au" },
        });
        (input as any)._acBound = true;
        ac.addListener("place_changed", () => {
          const place = ac.getPlace() as google.maps.places.PlaceResult;
          const formatted =
            place?.formatted_address || place?.name || input.value || "";
          setDirectors((prev) =>
            prev.map((d, i) => (i === idx ? { ...d, address: formatted } : d))
          );
        });
      });
    };
    if (window.google?.maps?.places) {
      bindAutocomplete();
    } else {
      loadGoogleMapsScript(bindAutocomplete);
    }
  }, [directors.length]);

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
    let valueToStore = value;
    if (name === "vendorId") {
      valueToStore = normalizeVendorCode(value);
    }
    setFormData((prev) => {
      const next = { ...prev, [name]: valueToStore } as any;
      if (name === 'invoiceAmount' || name === 'depositPaid') {
        const inv = parseFloat(name === 'invoiceAmount' ? valueToStore : next.invoiceAmount || '0') || 0;
        const dep = parseFloat(name === 'depositPaid' ? valueToStore : next.depositPaid || '0') || 0;
        next.financeAmount = Math.max(inv - dep, 0).toFixed(2);
      }
      return next;
    });
    // repayment recalculation is handled by useEffect on financeAmount/term/repaymentIndustry
    if (name === "abnNumber" && digitsOnly(valueToStore).length === 11) {
      if (abnDebounceRef.current) window.clearTimeout(abnDebounceRef.current);
      abnDebounceRef.current = window.setTimeout(() => handleAbnLookup(valueToStore), 300) as any;
    }
    if (name === "vendorId") {
      setVendorPrefillLocked(false);
      setVendorPrefillError(null);
      scheduleVendorLookup(valueToStore);
    }
  };

  // File handlers
  const handleFileChange = (key: string, file: File | null, docType?: string) => {
    setFiles((prev: any) => {
      if (key === "supportingDocs" && file) {
        const docs = Array.isArray(prev.supportingDocs) ? prev.supportingDocs : [];
        if (docs.length >= 4) return prev;
        return {
          ...prev,
          supportingDocs: [...docs, { file, type: docType, name: file.name }],
        };
      }
      return { ...prev };
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

  const extractAbrDateValue = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const resolved = extractAbrDateValue(item);
        if (resolved) return resolved;
      }
      return undefined;
    }
    if (typeof value === "object") {
      if ("EffectiveFrom" in value) return extractAbrDateValue((value as any).EffectiveFrom);
      if ("c" in value) return extractAbrDateValue((value as any).c);
      if ("$" in value) return extractAbrDateValue((value as any).$);
    }
    return undefined;
  };

const formatAbrDate = (value: any): string | undefined => {
  const raw = extractAbrDateValue(value);
  if (!raw) return undefined;
  const match = raw.match(/Date\((\d+)/);
  const date = match ? new Date(Number(match[1])) : new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-AU");
};

const formatAbrDateIso = (value: any): string | undefined => {
  const raw = extractAbrDateValue(value);
  if (!raw) return undefined;
  const match = raw.match(/Date\((\d+)/);
  const date = match ? new Date(Number(match[1])) : new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
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

    const gstSource =
      data.Gst ||
      data.GST ||
      data.GoodsAndServicesTax ||
      data.GoodsAndServicesTaxRegistration;
    const gstFormatted = formatAbrDate(gstSource);
    const abnStartSource =
      data.ABNStatusEffectiveFrom ||
      data.AbnStatusEffectiveFrom ||
      data.AbnStatusFrom ||
      data.ABNStatusFrom ||
      data.ABNStatus?.EffectiveFrom ||
      data.AbnStatus?.EffectiveFrom ||
      data.ABNStatus ||
      data.AbnStatus;
    const abnRegisteredFrom = formatAbrDate(abnStartSource);
    const abnRegisteredDate = formatAbrDateIso(abnStartSource) || "";

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
      gstFrom: gstFormatted || prev.gstFrom,
      abnRegisteredFrom: abnRegisteredFrom || prev.abnRegisteredFrom,
      abnRegisteredDate: abnRegisteredDate || prev.abnRegisteredDate,
      abnUnder2Years: false,
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
    files.supportingDocs.forEach((d) =>
      uploaded.push({ label: d.type || "Supporting Doc", name: d.file?.name })
    );
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

  const stripDirectorFiles = (list: DirectorInfo[]) =>
    list.map(({ licenceFrontFile, licenceBackFile, medicareFrontFile, ...rest }) => rest);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDemo = isDemoFlag;
    setLoading(true);
    const referenceNumber = `APP-${Date.now()}`;
    const total = equipmentItems.reduce(
      (sum, it) =>
        sum + (parseFloat(it.unitPrice) || 0) * (parseInt(it.quantity) || 0),
      0
    );

    let payload: any = {
      ...formData,
      equipmentItems,
      total,
      referenceNumber,
      directors: stripDirectorFiles(directors),
      directorsAreGuarantors,
      guarantors: directorsAreGuarantors ? [] : guarantors,
    };

    try {
      // Demo mode: persist a demo copy of the application so ContractPage can prefill
      if (isDemo) {
        try {
          const demoCopy = { ...payload };
          sessionStorage.setItem(`demo_app_${referenceNumber}`, JSON.stringify(demoCopy));
        } catch {}
        // Skip backend, show modal + navigate to contract
        setCreatedAppId(referenceNumber);
        setSuccessId(referenceNumber);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
        setShowApprovalModal(true);
        return;
      }
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
        const safeName = (file.name || "upload")
          .replace(/[^a-z0-9.\-_]/gi, "_")
          .slice(0, 80);
        const path = `applications/${referenceNumber}/${key}_${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, { upsert: true });
        if (error) throw error;
        return supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
      };
      const links: string[] = [];
      for (const d of files.supportingDocs) {
        const url = await uploadOne(`support_${d.type || "doc"}`, d.file);
        if (url) links.push(`${d.type || "Doc"}: ${url}`);
      }

      const directorsWithUploads = await Promise.all(
        directors.map(async (director, idx) => {
          const { licenceFrontFile, licenceBackFile, medicareFrontFile, ...rest } = director;
          const uploads: Partial<DirectorInfo> = {};
          const prefix = `director_${idx + 1}`;
          const frontUrl = await uploadOne(
            `${prefix}_licence_front`,
            licenceFrontFile || null
          );
          if (frontUrl) {
            uploads.licenceFrontUrl = frontUrl;
            links.push(`Director ${idx + 1} Licence Front: ${frontUrl}`);
          }
          const backUrl = await uploadOne(
            `${prefix}_licence_back`,
            licenceBackFile || null
          );
          if (backUrl) {
            uploads.licenceBackUrl = backUrl;
            links.push(`Director ${idx + 1} Licence Back: ${backUrl}`);
          }
          const medFrontUrl = await uploadOne(
            `${prefix}_medicare_front`,
            medicareFrontFile || null
          );
          if (medFrontUrl) {
            uploads.medicareFrontUrl = medFrontUrl;
            links.push(`Director ${idx + 1} Medicare: ${medFrontUrl}`);
          }
          return { ...rest, ...uploads };
        })
      );

      payload = {
        ...payload,
        directors: directorsWithUploads,
      };

      // 3. Persist minimal record for dashboard (best-effort) with vendor_id from profile
      try {
        await supabase.from('application_forms').insert([
          {
            id: referenceNumber,
            status: 'submitted',
            entity_name: formData.entityName || null,
            abn_number: formData.abnNumber || null,
            vendor_id: formData.vendorId || vendorId || null,
            agent_id: agentId || null,
            vendor_name: formData.vendorName || null,
            finance_amount: formData.financeAmount || null,
            pdf_url: pdfUrl || null,
            data: payload,
          },
        ] as any);
      } catch (e) {
        console.warn('Applications insert failed (ensure applications table & RLS).', e);
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

      // Success UI + Conditional approval modal
      setCreatedAppId(referenceNumber);
      setSuccessId(referenceNumber);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      const isConditionallyApproved = Number(formData.financeAmount || total || 0) <= 150000;
      if (isConditionallyApproved) {
        setShowApprovalModal(true);
      } else {
        onSubmit?.();
      }
    } catch (err) {
      console.error("Submit failed", err);
      onSubmit?.();
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDocuSign = async () => {
    if (!createdAppId) return;
    const params = new URLSearchParams(window.location.search);
    const demoMode =
      params.get("demo") === "1" || import.meta.env.VITE_DEMO_NO_BACKEND === "1";
    setDocuSignError(null);
    setDocuSignLoading(true);
    try {
      const suffix = demoMode ? "?demo=1" : "";
      navigate(`/contract/${createdAppId}${suffix}`);
    } catch (err: any) {
      console.error("Navigation failed", err);
      setDocuSignError(err?.message || "Unable to open contract page.");
    } finally {
      setDocuSignLoading(false);
    }
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    const fallback =
      profileRole === "admin"
        ? "/admin-dashboard"
        : profileRole === "vendor"
        ? "/vendor-dashboard"
        : "/agent-dashboard";
    navigate(fallback);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        {/* Conditional Approval Modal */}
        {showApprovalModal && createdAppId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Congratulations!</h2>
              <p className="text-gray-700 mb-3">
                You have been conditionally approved subject to the terms below. This is not a formal or unconditional offer of finance until the lender confirms all details.
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 text-[#1dad21] border-gray-300 rounded"
                  />
                  <span>I acknowledge this is a conditional approval only.</span>
                </label>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Final approval requires a satisfactory credit score and history.</li>
                  <li>The lender must verify all information and documents provided.</li>
                  <li>My personal and business circumstances must not worsen before settlement.</li>
                  <li>The lender must be satisfied with identification, compliance and AML/CTF requirements.</li>
                  <li>The asset and loan structure must meet the lender's credit policy.</li>
                  <li>The lender will confirm the final loan amount, term, interest rate and repayment details.</li>
                </ul>
                {docuSignError && (
                  <p className="text-sm text-red-600">{docuSignError}</p>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleLaunchDocuSign}
                  disabled={docuSignLoading}
                  className="bg-[#1dad21] text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-60"
                >
                  {docuSignLoading ? "Preparing DocuSign..." : "Continue to Lenders Agreement"}
                </button>
              </div>
            </div>
          </div>
        )}
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
            className="h-24 md:h-28 object-contain"
          />
        </div>
        <button
          onClick={handleBackClick}
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
          <DirectorsSection
            directors={directors}
            setDirectors={setDirectors}
            directorsAreGuarantors={directorsAreGuarantors}
            setDirectorsAreGuarantors={setDirectorsAreGuarantors}
            registerAddressRef={(idx, el) => {
              directorAddressRefs.current[idx] = el;
            }}
          />
          {!directorsAreGuarantors && (
            <GuarantorsSection
              guarantors={guarantors}
              setGuarantors={setGuarantors}
            />
          )}
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
            vendorPrefillLoading={vendorPrefillLoading}
            vendorPrefillError={vendorPrefillError}
            vendorPrefillLocked={vendorPrefillLocked}
            agentId={agentId}
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

          {/* Monthly Repayments (estimate) */}
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-gray-800">Monthly Repayments (est.):</span>
              <span className="text-2xl font-bold text-green-700">
                {monthlyRepayment ? monthlyRepayment.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }) : '$0.00'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Repayment Industry</label>
              <select
                value={repaymentIndustry}
                onChange={(e) => { setRepaymentIndustry(e.target.value); recalcRepayment(undefined, undefined, e.target.value); }}
                className="border rounded-lg p-2"
              >
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
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleBackClick}
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

