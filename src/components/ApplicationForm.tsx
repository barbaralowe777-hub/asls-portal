import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BusinessDetailsSection from "./forms/BusinessDetailsSection";
import AddressDetailsSection from "./forms/AddressDetailsSection";
import SupplierSection from "./forms/SupplierSection";
import SupportingDocumentsSection from "./forms/SupportingDocumentsSection";
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
  const existingScript =
    document.getElementById("googleMaps") ||
    Array.from(document.getElementsByTagName("script")).find((s) =>
      (s.getAttribute("src") || "").includes("maps.googleapis.com/maps/api/js")
    );
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
  const [agentCode, setAgentCode] = useState<string | null>(null);
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [vendorUuid, setVendorUuid] = useState<string | null>(null);
  const [landlordWaiverInfo, setLandlordWaiverInfo] = useState<string | null>(null);

  const [files, setFiles] = useState({
    supportingDocs: [] as Array<{ file: File; type?: string; name?: string }>,
  });

  // Demo mode disabled for application form
  const isDemoFlag = false;

  const clearVendorPrefillFields = useCallback(() => {
    setVendorPrefillLocked(false);
    setVendorPrefillError(null);
    setVendorUuid(null);
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
          .select("id,vendor_code,name,contact_name,contact_email,abn,metadata,vendor_address,vendor_phone")
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
        setVendorUuid((data as any)?.id || null);
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
    { category: "Solar Panels", include: true, asset: "", quantity: "", manufacturer: "", serialNumber: "As Per Invoice/PO", description: "", otherManufacturer: "" },
    { category: "Inverters", include: true, asset: "", quantity: "", manufacturer: "", serialNumber: "As Per Invoice/PO", description: "", otherManufacturer: "" },
    { category: "Batteries", include: true, asset: "", quantity: "", manufacturer: "", serialNumber: "As Per Invoice/PO", description: "", otherManufacturer: "" },
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

  const parseAmount = (value: any) => {
    if (value === null || value === undefined) return 0;
    const num = Number(
      typeof value === "string" ? value.replace(/[^0-9.-]/g, "") : value
    );
    return Number.isFinite(num) ? num : 0;
  };

  const BROKERAGE_MARGIN = 0.055; // 5.5% uplift
  const UPLIFT_INDUSTRIES = ["Beauty", "Gym", "Hospitality"]; // +1% uplift
  const FACTOR_TABLE: Record<number, Array<{ min: number; max: number; factor: number }>> = {
    84: [
      { min: 0, max: 20000, factor: 1.743 },
      { min: 20000.01, max: 35000, factor: 1.692 },
      { min: 35000.01, max: 50000, factor: 1.641 },
      { min: 50000.01, max: 1000000, factor: 1.622 },
    ],
    72: [
      { min: 0, max: 20000, factor: 1.931 },
      { min: 20000.01, max: 35000, factor: 1.881 },
      { min: 35000.01, max: 50000, factor: 1.832 },
      { min: 50000.01, max: 1000000, factor: 1.813 },
    ],
    60: [
      { min: 0, max: 20000, factor: 2.195 },
      { min: 20000.01, max: 35000, factor: 2.15 },
      { min: 35000.01, max: 50000, factor: 2.102 },
      { min: 50000.01, max: 1000000, factor: 2.084 },
    ],
    48: [
      { min: 0, max: 20000, factor: 2.603 },
      { min: 20000.01, max: 35000, factor: 2.556 },
      { min: 35000.01, max: 50000, factor: 2.511 },
      { min: 50000.01, max: 1000000, factor: 2.493 },
    ],
    36: [
      { min: 0, max: 20000, factor: 3.284 },
      { min: 20000.01, max: 35000, factor: 3.24 },
      { min: 35000.01, max: 50000, factor: 3.196 },
      { min: 50000.01, max: 1000000, factor: 3.178 },
    ],
    24: [
      { min: 0, max: 20000, factor: 4.657 },
      { min: 20000.01, max: 35000, factor: 4.614 },
      { min: 35000.01, max: 50000, factor: 4.572 },
      { min: 50000.01, max: 1000000, factor: 4.555 },
    ],
  };
  const getFactor = (amount: number, months: number): number | null => {
    const rows = FACTOR_TABLE[months];
    if (!rows) return null;
    const tier = rows.find((row) => amount >= row.min && amount <= row.max);
    return tier ? tier.factor : null;
  };
  const recalcRepayment = (amountStr?: string, termStr?: string, industryStr?: string) => {
    const amount = parseAmount(amountStr ?? formData.financeAmount ?? "0");
    const months = parseInt(String(termStr ?? formData.term ?? "0"), 10) || 0;
    const industry = (industryStr ?? repaymentIndustry) ?? "General";
    if (!amount || !months) { setMonthlyRepayment(null); return; }
    const factor = getFactor(amount, months);
    if (!factor) { setMonthlyRepayment(null); return; }
    const upliftMultiplier =
      1 +
      (UPLIFT_INDUSTRIES.includes(industry) ? 0.01 : 0) +
      (formData.abnUnder2Years ? 0.01 : 0);
    const adjustedFactor = factor * upliftMultiplier;
    const monthly = (adjustedFactor / 100) * amount * (1 + BROKERAGE_MARGIN);
    setMonthlyRepayment(monthly);
  };

  useEffect(() => {
    recalcRepayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.financeAmount, formData.term, repaymentIndustry, formData.abnUnder2Years]);

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
      industrial: "Industrial",
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const profileRole = (profile as any)?.role || (session.user.user_metadata as any)?.role || null;
        setProfileRole(profileRole);

        const profileVendorId =
          (profile as any)?.vendor_id || (profile as any)?.vendorId || null;
        const profileAgentCode =
          (profile as any)?.agent_code ||
          (profile as any)?.agentCode ||
          (profile as any)?.agent_id ||
          (session.user.user_metadata as any)?.agent_code ||
          null;
        const profileFirstName =
          (profile as any)?.first_name ||
          (profile as any)?.firstName ||
          (session.user.user_metadata as any)?.first_name ||
          (session.user.user_metadata as any)?.firstName ||
          "";
        const profileLastName =
          (profile as any)?.last_name ||
          (profile as any)?.lastName ||
          (session.user.user_metadata as any)?.last_name ||
          (session.user.user_metadata as any)?.lastName ||
          "";

        // Decide agentId based on role
        // Always remember agent code for emails; stamp agent_id with Supabase user id for agents
        setAgentCode(profileAgentCode || null);
        if (profileRole === 'agent') {
          setAgentId(session.user.id);
        } else {
          // vendors/admins won't be filtered by agent dashboards
          setAgentId(null);
        }

        // Seed vendor details from profile if available
        setFormData((prev) => ({
          ...prev,
          agentFirstName: prev.agentFirstName || profileFirstName,
          agentLastName: prev.agentLastName || profileLastName,
          vendorId: prev.vendorId || (profileVendorId ? normalizeVendorCode(profileVendorId) : ""),
          vendorName: prev.vendorName || (profile as any)?.vendor_name || (profile as any)?.vendorName || prev.vendorName,
          supplierBusinessName:
            prev.supplierBusinessName ||
            (profile as any)?.vendor_name ||
            (profile as any)?.vendorName ||
            prev.supplierBusinessName,
          supplierEmail:
            prev.supplierEmail ||
            (profile as any)?.vendor_email ||
            (profile as any)?.vendorEmail ||
            "",
          supplierPhone:
            prev.supplierPhone ||
            (profile as any)?.vendor_phone ||
            (profile as any)?.vendorPhone ||
            "",
          supplierAbn:
            prev.supplierAbn ||
            (profile as any)?.vendor_abn ||
            (profile as any)?.vendorAbn ||
            "",
          supplierAddress:
            prev.supplierAddress ||
            (profile as any)?.vendor_address ||
            "",
        }));

        // Trigger vendor lookup if profile has a vendor id
        setVendorId(profileVendorId);
        setVendorUuid(profileVendorId || null);
      } catch (e) {
        console.warn('Failed to load vendor_id', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!vendorId || isDemoFlag) return;
    // Only attempt lookup when it looks like a vendor code (e.g., V00123)
    if (!/^v/i.test(vendorId)) return;
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
  const updateEquipmentItem = (index: number, field: string, value: any) => {
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
        ["Agent Code/ID", agentId || (formData as any)?.agentId || (formData as any)?.agentCode || ""],
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

    // Directors
    const directorsForPdf = (directors && directors.length ? directors : (formData as any)?.directors || []) as any[];
    const directorRows = directorsForPdf.filter((d) =>
      [d.firstName, d.lastName, d.email, d.phone, d.licenceNumber, d.address, d.dob].some(Boolean)
    ).map((d) => [
      [d.title, d.firstName, d.lastName].filter(Boolean).join(" ").trim(),
      d.email || "",
      d.phone || "",
      d.dob || "",
      d.address || "",
      d.licenceNumber || "",
      d.licenceState || "",
      d.licenceExpiry || "",
      d.medicareNumber || "",
      d.medicareExpiry || "",
    ]);
    if (directorRows.length) {
      doc.text("Directors", 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [["Name", "Email", "Phone", "DOB", "Address", "Licence #", "State", "Expiry", "Medicare #", "Medicare Expiry"]],
        body: directorRows,
        styles: { fontSize: 8 },
      });
    }

    // Guarantors (if not using directors as guarantors)
    if (!directorsAreGuarantors) {
      const guarantorsForPdf = (guarantors && guarantors.length ? guarantors : (formData as any)?.guarantors || []) as any[];
      const guarantorRows = guarantorsForPdf.filter((g) =>
        [g.firstName, g.lastName, g.email, g.phone, g.licenceNumber, g.address, g.dob].some(Boolean)
      ).map((g) => [
        [g.title, g.firstName, g.lastName].filter(Boolean).join(" ").trim(),
        g.email || "",
        g.phone || "",
        g.dob || "",
        g.address || "",
        g.licenceNumber || "",
        g.licenceState || "",
        g.licenceExpiry || "",
      ]);
      if (guarantorRows.length) {
        doc.text("Guarantors", 14, (doc as any).lastAutoTable.finalY + 10);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: [["Name", "Email", "Phone", "DOB", "Address", "Licence #", "State", "Expiry"]],
          body: guarantorRows,
          styles: { fontSize: 8 },
        });
      }
    }

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

  const buildFileFlags = (payload: any) => {
    const flags: Record<string, boolean> = {};
    const normalizeKey = (label: string) =>
      String(label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const mark = (key: string, present: any) => {
      if (present) flags[normalizeKey(key)] = true;
    };
    // Directors
    (payload.directors || []).forEach((d: any, idx: number) => {
      const n = idx + 1;
      mark(`director_${n}_licence_front`, d.licenceFrontUrl);
      mark(`director_${n}_licence_back`, d.licenceBackUrl);
      mark(`director_${n}_medicare_front`, d.medicareFrontUrl);
    });
    // Guarantors
    (payload.guarantors || []).forEach((g: any, idx: number) => {
      const n = idx + 1;
      mark(`guarantor_${n}_licence_front`, g.licenceFrontUrl);
      mark(`guarantor_${n}_licence_back`, g.licenceBackUrl);
      mark(`guarantor_${n}_medicare_front`, g.medicareFrontUrl);
    });
    // Supporting docs keyed by type
    if (payload.files && typeof payload.files === "object") {
      Object.entries(payload.files).forEach(([k, v]) => {
        if (v) flags[normalizeKey(k)] = true;
      });
    }
    return flags;
  };

  const computeMissingDocs = (payload: any, flags: Record<string, boolean>) => {
    const tasks: string[] = [];
    const has = (key: string) => !!flags[key];
    const directorsList = payload.directors || [];
    const guarantorsList = payload.guarantors || [];

    directorsList.forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`director_${n}_licence_front`)) tasks.push(`Upload Director ${n} licence (front)`);
      if (!has(`director_${n}_licence_back`)) tasks.push(`Upload Director ${n} licence (back)`);
      if (!has(`director_${n}_medicare_front`)) tasks.push(`Upload Director ${n} Medicare (front)`);
    });

    guarantorsList.forEach((_: any, idx: number) => {
      const n = idx + 1;
      if (!has(`guarantor_${n}_licence_front`)) tasks.push(`Upload Guarantor ${n} licence (front)`);
      if (!has(`guarantor_${n}_licence_back`)) tasks.push(`Upload Guarantor ${n} licence (back)`);
      if (!has(`guarantor_${n}_medicare_front`)) tasks.push(`Upload Guarantor ${n} Medicare (front)`);
    });

    if ((payload.premisesType || "").toLowerCase() === "rented") {
      if (!has("lease_agreement")) tasks.push("Upload Lease Agreement");
      if (!has("landlord_waiver")) tasks.push("Upload Landlord Waiver");
    }
    if ((payload.premisesType || "").toLowerCase() === "owned") {
      if (!has("rates_notice")) tasks.push("Upload Rates Notice");
    }
    if ((payload.entityType || "").toLowerCase() === "trust") {
      if (!has("trust_deed")) tasks.push("Upload Trust Deed");
    }
    const invoiceKey = "invoice_solar_supplier_vendor";
    if (!has(invoiceKey)) tasks.push("Upload invoice from solar supplier/vendor");
    return tasks;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDemo = isDemoFlag;
    setLoading(true);
    setSubmitError(null);
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
      const fileFlags: Record<string, boolean> = {};
      const normalizeKey = (label: string) =>
        String(label || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      const markFlag = (key: string, present: any) => {
        if (present) fileFlags[key] = true;
      };
      for (const d of files.supportingDocs) {
        const url = await uploadOne(`support_${d.type || "doc"}`, d.file);
        if (url) links.push(`${d.type || "Doc"}: ${url}`);
        if (url && d.type) {
          const normalizedKey = normalizeKey(d.type);
          markFlag(normalizedKey, true);
        }
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
            markFlag(`${prefix}_licence_front`, true);
          }
          const backUrl = await uploadOne(
            `${prefix}_licence_back`,
            licenceBackFile || null
          );
          if (backUrl) {
            uploads.licenceBackUrl = backUrl;
            links.push(`Director ${idx + 1} Licence Back: ${backUrl}`);
            markFlag(`${prefix}_licence_back`, true);
          }
          const medFrontUrl = await uploadOne(
            `${prefix}_medicare_front`,
            medicareFrontFile || null
          );
          if (medFrontUrl) {
            uploads.medicareFrontUrl = medFrontUrl;
            links.push(`Director ${idx + 1} Medicare: ${medFrontUrl}`);
            markFlag(`${prefix}_medicare_front`, true);
          }
          return { ...rest, ...uploads };
        })
      );

      const guarantorsWithUploads = await Promise.all(
        guarantors.map(async (g, idx) => {
          const { licenceFrontFile, licenceBackFile, medicareFrontFile, ...rest } = g;
          const uploads: Partial<GuarantorInfo> = {};
          const prefix = `guarantor_${idx + 1}`;
          const frontUrl = await uploadOne(
            `${prefix}_licence_front`,
            licenceFrontFile || null
          );
          if (frontUrl) {
            uploads.licenceFrontUrl = frontUrl;
            links.push(`Guarantor ${idx + 1} Licence Front: ${frontUrl}`);
            markFlag(`${prefix}_licence_front`, true);
          }
          const backUrl = await uploadOne(
            `${prefix}_licence_back`,
            licenceBackFile || null
          );
          if (backUrl) {
            uploads.licenceBackUrl = backUrl;
            links.push(`Guarantor ${idx + 1} Licence Back: ${backUrl}`);
            markFlag(`${prefix}_licence_back`, true);
          }
          const medFrontUrl = await uploadOne(
            `${prefix}_medicare_front`,
            medicareFrontFile || null
          );
          if (medFrontUrl) {
            uploads.medicareFrontUrl = medFrontUrl;
            links.push(`Guarantor ${idx + 1} Medicare: ${medFrontUrl}`);
            markFlag(`${prefix}_medicare_front`, true);
          }
          return { ...rest, ...uploads };
        })
      );

      payload = {
        ...payload,
        directors: directorsWithUploads,
        guarantors: guarantorsWithUploads,
        agentId,
        agentCode,
        vendorUuid,
        pdfUrl,
      };

      // Build flags + missing docs/tasks to drive status
      const fileFlagsFromUploads = { ...fileFlags };
      payload.files = fileFlagsFromUploads;
      const missingDocs = computeMissingDocs(payload, buildFileFlags(payload));

      // Quick completeness check: core fields + equipment + supplier + no missing docs => under_review
      const isCompleteCore =
        !!(formData.entityName || formData.abnNumber) &&
        !!formData.email &&
        !!formData.phone &&
        !!formData.streetAddress &&
        !!(formData.invoiceAmount || formData.financeAmount) &&
        !!formData.term &&
        !!formData.supplierBusinessName &&
        !!formData.supplierAddress &&
        equipmentItems.length > 0 &&
        !!(equipmentItems[0].category || equipmentItems[0].description) &&
        !!(equipmentItems[0].quantity || equipmentItems[0].qty);
      const applicationStatus = isCompleteCore && missingDocs.length === 0 ? "under_review" : "submitted";
      payload.missingTasks = missingDocs;

      // 2b. If rented premises, send landlord waiver
      if ((payload.premisesType || "").toLowerCase() === "rented") {
        const director1 = directors[0] || {};
        const directorEmail =
          (director1 as any).email ||
          (director1 as any).directorEmail ||
          (payload as any).directorEmail ||
          formData.email;
        const directorName = [
          (director1 as any).firstName,
          (director1 as any).lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (directorEmail) {
          try {
            await supabase.functions.invoke("landlord-waiver", {
              body: {
                applicationId: referenceNumber,
                directorEmail,
                directorName,
              },
            });
            const sentAt = new Date().toISOString();
            payload.landlordWaiverSentAt = sentAt;
            payload.landlordWaiverSentTo = directorEmail;
            setLandlordWaiverInfo(`Landlord waiver sent to ${directorEmail}`);
          } catch (err: any) {
            console.warn("Landlord waiver send failed", err);
            payload.landlordWaiverError = err?.message || "Failed to send landlord waiver";
          }
        }
      }

      // 3. Persist minimal record for dashboards with vendor_id/agent_id
      try {
        await supabase.from('application_forms').upsert([
          {
            id: referenceNumber,
            status: applicationStatus,
            data: payload,
          },
        ]);
        // Also upsert into applications so dashboards can see the submission
        await supabase.from("applications").upsert([
          {
            id: referenceNumber,
            status: applicationStatus,
            entity_name: formData.entityName || formData.businessName || formData.companyName,
            finance_amount: formData.financeAmount || payload.financeAmount || 0,
            vendor_name: formData.vendorName || payload.vendorName || "",
            vendor_id: vendorUuid || formData.vendorId || payload.vendorId || null,
            agent_id: agentId || null,
            agent_name: [formData.agentFirstName, formData.agentLastName].filter(Boolean).join(" ").trim(),
            pdf_url: pdfUrl || null,
            data: payload,
          },
        ], { onConflict: "id" });
      } catch (e) {
        console.warn('Applications insert failed (ensure applications table & RLS).', e);
      }

      // 4. Email admins
      const subject = `ASLS Application ${referenceNumber} - ${formData.entityName || formData.abnNumber}`;
      const adminSummaryHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;background:#f8fafc;padding:20px;">
          <div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.06);overflow:hidden;">
            <div style="background:#0ac432;padding:16px 20px;text-align:center;">
              <img src="https://portal.asls.net.au/ASLS-logo.png" alt="ASLS" style="max-height:52px" />
            </div>
            <div style="padding:22px;">
              <h2 style="margin:0 0 10px;font-size:20px;color:#111827;">New Application Submitted</h2>
              <p style="margin:0 0 8px;font-weight:600;">Application ID: <span style="font-weight:700;color:#0f172a;">${referenceNumber}</span></p>
              <p style="margin:0 0 6px;">Business: <strong>${formData.entityName || "N/A"}</strong></p>
              <p style="margin:0 0 6px;">ABN: <strong>${formData.abnNumber || "N/A"}</strong></p>
              <p style="margin:12px 0;"><a href="${pdfUrl}" style="background:#0ac432;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">View Branded PDF Summary</a></p>
              ${
                links.length
                  ? `<div style="margin-top:10px;"><div style="font-weight:600;margin-bottom:4px;">Uploaded Files:</div>${links
                      .map((l) => `<div style="font-size:13px;">${l}</div>`)
                      .join("")}</div>`
                  : ""
              }
            </div>
          </div>
        </div>
      `;
      await fetch("https://ktdxqyhklnsahjsgrhud.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: ["john@asls.net.au", "admin@asls.net.au"],
          subject,
          text: `PDF summary: ${pdfUrl}`,
          html: adminSummaryHtml,
        }),
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
      setSubmitError((err as any)?.message || "Something went wrong submitting. Please try again.");
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
    const nextParams = new URLSearchParams();
    if (demoMode) nextParams.set("demo", "1");
    // Always show overlay so user can see every prefilled field before sending.
    nextParams.set("overlay", "1");
    setDocuSignError(null);
    setDocuSignLoading(true);
    try {
      navigate(`/contract/${createdAppId}?${nextParams.toString()}`);
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
              {landlordWaiverInfo && (
                <p className="text-sm mt-1 text-green-700">{landlordWaiverInfo}</p>
              )}
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
          <SupportingDocumentsSection
            files={files}
            handleFileChange={handleFileChange}
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
          />
          <EquipmentDetailsSection
            equipmentItems={equipmentItems}
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
                <option value="Industrial">Industrial</option>
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
            {submitError && (
              <div className="flex-1 text-sm text-red-600 text-right pr-2 self-center">
                {submitError}
              </div>
            )}
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

