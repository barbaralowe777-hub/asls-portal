import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  create,
  getNumericDate,
  type Payload,
  type Header,
} from "https://deno.land/x/djwt@v2.9/mod.ts";


const DOCUSIGN_ACCOUNT_ID = Deno.env.get("DOCUSIGN_ACCOUNT_ID")!;
const DOCUSIGN_USER_ID = Deno.env.get("DOCUSIGN_USER_ID")!;
const DOCUSIGN_INTEGRATION_KEY = Deno.env.get("DOCUSIGN_INTEGRATION_KEY")!;
const DOCUSIGN_PRIVATE_KEY = Deno.env.get("DOCUSIGN_PRIVATE_KEY")!;
const DOCUSIGN_TEMPLATE_ID = Deno.env.get("DOCUSIGN_TEMPLATE_ID")!;
const ASLS_COPY_EMAIL = Deno.env.get("ASLS_COPY_EMAIL") || "";
const ASLS_COPY_NAME = Deno.env.get("ASLS_COPY_NAME") || "ASLS Copy";
const ASLS_ADMIN_EMAIL = Deno.env.get("ASLS_ADMIN_EMAIL") || "";
const ASLS_ADMIN_NAME = Deno.env.get("ASLS_ADMIN_NAME") || "ASLS Admin";
const PORTAL_BASE_URL =
  Deno.env.get("PORTAL_BASE_URL") || "https://portal.asls.net.au";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Allow overriding DocuSign endpoints via env; default to AU production.
const DOCUSIGN_REST_BASE =
  Deno.env.get("DOCUSIGN_BASE_URL") || "https://au.docusign.net";
const DOCUSIGN_OAUTH_BASE =
  Deno.env.get("DOCUSIGN_OAUTH_BASE") || "account.docusign.com";
const docuSignBaseUrl = `${DOCUSIGN_REST_BASE.replace(/\/+$/, "")}/restapi/v2.1`;

const buildCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, X-Client-Info",
});

const RSA_OID = new Uint8Array([
  0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
]);
const NULL_VALUE = new Uint8Array([0x05, 0x00]);

const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

const encodeDerLength = (length: number): Uint8Array => {
  if (length < 0x80) return new Uint8Array([length]);
  const bytes: number[] = [];
  let temp = length;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const base64StringToUint8 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const parsePem = (pem: string): Uint8Array => {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64StringToUint8(cleaned);
};

const wrapPkcs1ToPkcs8 = (pkcs1Bytes: Uint8Array): Uint8Array => {
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const algorithm = concatBytes(
    new Uint8Array([0x30]),
    encodeDerLength(RSA_OID.length + NULL_VALUE.length),
    RSA_OID,
    NULL_VALUE
  );
  const privateKeyOctet = concatBytes(
    new Uint8Array([0x04]),
    encodeDerLength(pkcs1Bytes.length),
    pkcs1Bytes
  );
  const body = concatBytes(version, algorithm, privateKeyOctet);
  return concatBytes(
    new Uint8Array([0x30]),
    encodeDerLength(body.length),
    body
  );
};

const pemToPkcs8 = (pem: string): Uint8Array => {
  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    const pkcs1 = parsePem(pem);
    return wrapPkcs1ToPkcs8(pkcs1);
  }
  return parsePem(pem);
};

let cachedPrivateKey: CryptoKey | null = null;

const getDocuSignPrivateKey = async (): Promise<CryptoKey> => {
  if (cachedPrivateKey) return cachedPrivateKey;
  if (!DOCUSIGN_PRIVATE_KEY) {
    throw new Error("DOCUSIGN_PRIVATE_KEY env var missing");
  }
  const pkcs8 = pemToPkcs8(DOCUSIGN_PRIVATE_KEY);
  const keyBuffer = pkcs8.buffer.slice(
    pkcs8.byteOffset,
    pkcs8.byteOffset + pkcs8.byteLength
  );
  cachedPrivateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  return cachedPrivateKey;
};

async function createJwt(): Promise<string> {
  const header: Header = { alg: "RS256", typ: "JWT" };
  const payload: Payload = {
    iss: DOCUSIGN_INTEGRATION_KEY,
    sub: DOCUSIGN_USER_ID,
    aud: DOCUSIGN_OAUTH_BASE,
    iat: getNumericDate(0),
    exp: getNumericDate(3600),
    scope: "signature impersonation",
  };
  const key = await getDocuSignPrivateKey();
  return await create(header, payload, key);
}

async function fetchAccessToken(): Promise<string> {
  const jwt = await createJwt();
  const res = await fetch(`https://${DOCUSIGN_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DocuSign auth failed: ${text}`);
  }
  const json = await res.json();
  return json.access_token;
}

const buildTextTab = (tabLabel: string, value?: string | number | null) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return { tabLabel, value: text };
};

const numericValue = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAddress = (parts: Array<string | null | undefined>) =>
  (() => {
    const cleaned = parts
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);
    // If the first line already looks like a full address (contains a 4-digit postcode),
    // return it to avoid duplicating suburb/state/postcode.
    if (cleaned.length && /\b\d{4}\b/.test(cleaned[0])) {
      return cleaned[0];
    }
    return cleaned.join(", ");
  })();

const getBaseRate = (amount: number) => {
  if (amount <= 20000) return 11.9;
  if (amount <= 35000) return 10.9;
  if (amount <= 50000) return 9.9;
  return 9.5;
};

const upliftIndustries = ["beauty", "gym", "hospitality"];

const deriveIndustry = (industry?: string) => {
  if (!industry) return "general";
  const normalized = industry.toLowerCase();
  if (normalized.includes("beauty")) return "beauty";
  if (normalized.includes("gym")) return "gym";
  if (normalized.includes("hospitality")) return "hospitality";
  return "general";
};

const estimateMonthlyRepayment = (amount: number, months: number, industry?: string) => {
  if (!amount || !months) return 0;
  let rate = getBaseRate(amount);
  if (upliftIndustries.includes(deriveIndustry(industry))) {
    rate += 1;
  }
  const monthlyRate = rate / 100 / 12;
  if (!monthlyRate) return amount / months;
  const numerator = amount * monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  if (!denominator) return amount / months;
  return numerator / denominator;
};

const normalizeApplicationData = (raw: any) => {
  const form = raw || {};
  const entityName =
    form.businessName || form.entity_name || form.entityName || "";
  const abnNumber = form.abnNumber || form.abn || form.abn_number || "";
  const installationAddress =
    form.installationAddress ||
    formatAddress([
      form.streetAddress,
      form.streetAddress2,
      form.city,
      form.state,
      form.postcode,
    ]);
  const summaryAddress =
    form.businessAddress ||
    installationAddress ||
    formatAddress([
      form.streetAddress,
      form.streetAddress2,
      form.city,
      form.state,
      form.postcode,
    ]);
  const supplierAddress = formatAddress([
    form.supplierAddress,
    form.supplierCity,
    form.supplierState,
    form.supplierPostcode,
  ]);
  const financeAmountRaw = numericValue(
    form.financeAmount ||
      form.finance_amount ||
      form.totalAmount ||
      form.amount ||
      form.total ||
      form.invoiceAmount ||
      0,
  );
  const baseTerm =
    form.term || form.financeTerm || form.leaseTerm || form.loanTerm || "";
  const termNumber = Number(baseTerm) || 0;
  const termString = baseTerm ? String(baseTerm) : "";
  let monthlyPayment =
    form.monthlyRepayment ||
    form.finance?.monthlyPayment ||
    "";
  if (!monthlyPayment && financeAmountRaw && termNumber) {
    const estimate = estimateMonthlyRepayment(
      financeAmountRaw,
      termNumber,
      form.industryType,
    );
    monthlyPayment = estimate ? estimate.toFixed(2) : "";
  }
  const equipmentItems = Array.isArray(form.equipmentItems)
    ? form.equipmentItems
        .map((item: any, idx: number) => {
          const rawQty =
            item?.quantity !== undefined && item?.quantity !== null && item?.quantity !== ""
              ? item?.quantity
              : item?.qty;
          const defaults = ["Solar Panels", "Inverters", "Batteries"];
          const category = defaults[idx] || item?.category || "";
          const serialVal =
            item?.serialNumber ||
            item?.serial ||
            item?.serial_number ||
            item?.serialNo ||
            item?.serialno ||
            item?.serialNum ||
            "";
          return {
            category,
            description: item?.description || item?.asset || "",
            asset: item?.asset || "",
            quantity: rawQty !== undefined && rawQty !== null ? String(rawQty) : "",
            systemSize: item?.systemSize,
            serialNumber: serialVal,
            manufacturer: item?.manufacturer,
          };
        })
        .filter(
          (it: any) =>
            (it.category && it.category.trim()) ||
            (it.description && it.description.trim()) ||
            (it.asset && it.asset.trim()) ||
            (it.quantity && String(it.quantity).trim())
        )
    : [];
  const directors = Array.isArray(form.directors) ? form.directors : [];
  const guarantors = Array.isArray(form.guarantors) ? form.guarantors : [];

  return {
    ...form,
    businessName: entityName || form.businessName,
    entityName,
    abnNumber,
    businessAddress: summaryAddress,
    phone: form.phone || form.businessPhone || form.mobile || form.contactPhone || "",
    email: form.email || form.contactEmail || "",
    supplierBusinessName:
      form.supplierBusinessName || form.vendorName || form.supplierName || "",
    supplierAddress,
    supplierAbn:
      form.supplierAbn ||
      form.supplier_abn ||
      form.supplierABN ||
      form.supplierABNNumber ||
      form.supplier_abn_number ||
      "",
    supplierPhone: form.supplierPhone || form.vendorPhone || "",
    supplierEmail: form.supplierEmail || "",
    financeAmount: financeAmountRaw || form.financeAmount,
    term: termString,
    financeTerm: termString || form.financeTerm,
    monthlyRepayment: monthlyPayment,
    finance: {
    ...(form.finance || {}),
    monthlyPayment,
    term: termString || form.financeTerm,
  },
  equipmentItems,
  directors,
  guarantors,
    streetAddress: form.streetAddress || "",
  streetAddress2: form.streetAddress2 || "",
  city: form.city || form.businessCity || "",
  state: form.state || form.businessState || "",
  postcode: form.postcode || form.businessPostcode || "",
  supplierAddress,
  supplierCity: form.supplierCity || "",
  supplierState: form.supplierState || "",
  supplierPostcode: form.supplierPostcode || "",
  lesseeAddressCombined: summaryAddress,
  supplierAddressCombined: supplierAddress,
};
};

const buildTemplateTabs = (data: any) => {
  // Force DocuSign slots with category matching: 1=Solar Panels, 2=Inverters, 3=Batteries.
  const rawEquipment = Array.isArray(data?.equipmentItems) ? data.equipmentItems : [];
  const findByCategory = (needle: string) =>
    rawEquipment.find((it: any) => (it?.category || "").toLowerCase().includes(needle)) || {};
  const slotSources = [
    findByCategory("solar") || rawEquipment[0] || {},
    findByCategory("invert") || rawEquipment[1] || {},
    findByCategory("batter") || rawEquipment[2] || {},
  ];
  const slotLabels = ["Solar Panels", "Inverters", "Batteries"];
  const equipment = slotLabels.map((label, idx) => {
    const src: any = slotSources[idx] || {};
    const qty = src.quantity ?? src.qty ?? "";
    const modelVal = src.model || src.description || src.asset || src.systemSize || "";
    const serialVal =
      src.serialNumber ||
      src.serial ||
      src.serial_number ||
      src.serialNo ||
      src.serialno ||
      src.serialNum ||
      "";
    return {
      category: label,
      quantity: qty !== undefined && qty !== null ? String(qty) : "",
      manufacturer: src.manufacturer || "",
      model: modelVal,
      serial: serialVal === "" ? "As Per Invoice/PO" : serialVal,
    };
  });
  const directors = Array.isArray(data?.directors) ? data.directors : [];
  const guarantors = Array.isArray(data?.guarantors) ? data.guarantors : [];

  const tabs: any[] = [];
  const add = (label: string, value: any) => tabs.push(buildTextTab(label, value));
  const addAliases = (value: any, labels: string[]) => labels.forEach((l) => add(l, value));

  addAliases(data?.businessName || data?.entityName, [
    "lessee_business_name",
    "lessee_entity_name",
    "lessee_entity_name_pg5",
    "lessee_entity_name_pg6",
    "lessee_entity_name_pg8",
    "lessee_business_name_pg5",
    "lessee_business_name_pg6",
    "lessee_business_name_pg8",
  ]);
  add("lessee_business_name_pg5", data?.businessName || data?.entityName);
  add("lessee_business_name_pg8", data?.businessName || data?.entityName);
  add("lessee_abn", data?.abnNumber);
  addAliases(data?.abnNumber, [
    "lessee_abn_pg5",
    "lessee_abn_pg6",
    "lessee_abn_pg8",
    "lessee_abn_number_pg5",
    "lessee_abn_number_pg8",
  ]);
  add("lessee_abn_pg5", data?.abnNumber);
  add("lessee_abn_pg8", data?.abnNumber);
  add("lessee_entity_type", data?.entityType || data?.businessStructure);
  add("lessee_abn_status", data?.abnStatus);
  add("lessee_abn_registered_from", data?.abnRegisteredFrom);
  add("lessee_gst_registered_from", data?.gstRegisteredFrom);
  add("lessee_email", data?.email);
  add("lessee_email_pg5", data?.email);
  add("lessee_email_pg8", data?.email);
  add("lessee_phone", data?.phone || data?.businessPhone || data?.mobile);
  add("lessee_phone_1", data?.phone || data?.businessPhone || data?.mobile);
  add("lessee_phone_pg5", data?.phone || data?.businessPhone || data?.mobile);
  add("lessee_phone_1_pg8", data?.phone || data?.businessPhone || data?.mobile);
  add("lessee_phone_pg8", data?.phone || data?.businessPhone || data?.mobile);
  add("lessee_website", data?.website);
  add("lessee_industry_type", data?.industryType);
  add("lessee_narrative", data?.narrative || data?.notes);
  const lesseeAddress = data?.lesseeAddressCombined ||
    formatAddress([
      data?.streetAddress,
      data?.streetAddress2,
      data?.city,
      data?.state,
      data?.postcode,
    ]);
  add("lessee_address", lesseeAddress);
  addAliases(lesseeAddress, [
    "lessee_installation_address",
    "lessee_installation_address_pg5",
    "lessee_installation_address_pg6",
    "lessee_installation_address_pg8",
    "lessee_address_pg5",
    "lessee_address_pg6",
    "lessee_address_pg8",
  ]);
  add("lessee_address_pg5", lesseeAddress);
  add("lessee_address_pg8", lesseeAddress);
  add("lessee_city", data?.city || data?.businessCity);
  add("lessee_state", data?.state || data?.businessState);
  add("lessee_postcode", data?.postcode || data?.businessPostcode);

  // Agent info (for stamping in DocuSign if placed on template)
  const agentName =
    [data?.agentFirstName, data?.agentLastName]
      .map((p: any) => (p || "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  add("agent_name", agentName || data?.agentName);
  add("agent_first_name", data?.agentFirstName);
  add("agent_last_name", data?.agentLastName);

  const financeAmount =
    data?.financeAmount || data?.finance_amount || data?.amount || data?.totalAmount;
  add("finance_amount", financeAmount);
  add("finance_term", data?.term || data?.financeTerm);
  addAliases(data?.monthlyRepayment || data?.finance?.monthlyPayment, [
    "finance_monthly_repayment",
    "finance_monthly_payment",
  ]);
  add("finance_purchase_price", data?.purchasePrice || data?.purchase_price);
  add("finance_special_conditions", data?.specialConditions || data?.financeSpecialConditions);

  addAliases(data?.supplierBusinessName || data?.vendorName || data?.supplierName, [
    "supplier_name",
  ]);
  add("supplier_contact", data?.supplierContact);
  add("supplier_phone", data?.supplierPhone || data?.vendorPhone);
  add("supplier_email", data?.supplierEmail);
  const supplierAddress =
    data?.supplierAddressCombined ||
    formatAddress([
      data?.supplierAddress,
      data?.supplierCity,
      data?.supplierState,
      data?.supplierPostcode,
    ]);
  add("supplier_address", supplierAddress);
  add("supplier_city", data?.supplierCity);
  add("supplier_state", data?.supplierState);
  add("supplier_postcode", data?.supplierPostcode);
  add("supplier_vendor_code", data?.supplierVendorCode);
  add("supplier_reference", data?.supplierReference);
  add("supplier_abn", data?.supplierAbn || data?.supplier_abn || data?.supplierABN);

  const equipmentTabs = equipment.flatMap((item, idx) => {
    const n = idx + 1; // 1-based labels
    const arr: any[] = [];
    const addEq = (label: string, value: any) => arr.push(buildTextTab(label, value));
    const cat = slotLabels[idx] || item?.category;
    addEq(`equipment_${n}_category`, cat);
    addEq(`equipment_${n}_category_pg8`, cat);
    addEq(`equipment_${n}_manufacturer`, item?.manufacturer || item?.brand);
    addEq(`equipment_${n}_manufacturer_pg8`, item?.manufacturer || item?.brand);
    const modelVal = item?.model || item?.description || item?.asset;
    addEq(`equipment_${n}_model`, modelVal);
    addEq(`equipment_${n}_model_pg8`, modelVal);
    addEq(`equipment_${n}_description`, modelVal);
    addEq(`equipment_${n}_serial`, item?.serial || item?.serialNumber);
    addEq(`equipment_${n}_serial_pg8`, item?.serial || item?.serialNumber);
    const qtyVal = item?.quantity ?? item?.qty ?? "";
    addEq(`equipment_${n}_quantity`, qtyVal);
    addEq(`equipment_${n}_quantity_pg8`, qtyVal);
    addEq(`equipment_${n}_qty`, qtyVal);
    addEq(`equipment_${n}_system_size`, item?.systemSize);
    addEq(`equipment_${n}_unit_price`, item?.unitPrice);
    addEq(`equipment_${n}_total`, item?.total);
    // legacy labels
    addEq(`equipment_${n}_desc`, [item?.asset, item?.description, cat].filter(Boolean).join(" "));
    addEq(`equipment_${n}_serial_number`, item?.serial || item?.serialNumber);
    return arr;
  });

  const directorTabs = directors.flatMap((director, idx) => {
    const n = idx + 1;
    const arr: any[] = [];
    const addDir = (label: string, value: any) => arr.push(buildTextTab(label, value));
    const name =
      director?.fullName ||
      director?.name ||
      [director?.title, director?.firstName, director?.lastName]
        .filter(Boolean)
        .join(" ");
    addDir(`director_${n}_name`, name);
    addDir(`director_${n}_dob`, director?.dob);
    addDir(`director_${n}_licence_number`, director?.licenceNumber || director?.licenseNumber);
    addDir(`director_${n}_licence_expiry`, director?.licenceExpiry || director?.licenseExpiry);
    addDir(`director_${n}_address`, director?.address);
    addDir(`director_${n}_city`, director?.city);
    addDir(`director_${n}_state`, director?.state);
    addDir(`director_${n}_postcode`, director?.postcode);
    addDir(`director_${n}_phone`, director?.phone);
    addDir(`director_${n}_email`, director?.email);
    // legacy labels
    addDir(`director${n}_name`, name);
    addDir(`director${n}_position`, director?.position || "Director");
    addDir(`director${n}_date`, director?.date || director?.signatureDate || "");
    return arr;
  });

  const guarantorTabs = guarantors.flatMap((guarantor, idx) => {
    const n = idx + 1;
    const arr: any[] = [];
    const addG = (label: string, value: any) => arr.push(buildTextTab(label, value));
    const name =
      guarantor?.fullName ||
      guarantor?.name ||
      [guarantor?.title, guarantor?.firstName, guarantor?.lastName].filter(Boolean).join(" ");
    addG(`guarantor_${n}_name`, name);
    addG(`guarantor_${n}_dob`, guarantor?.dob);
    addG(`guarantor_${n}_licence_number`, guarantor?.licenceNumber || guarantor?.licenseNumber);
    addG(`guarantor_${n}_licence_expiry`, guarantor?.licenceExpiry || guarantor?.licenseExpiry);
    addG(`guarantor_${n}_address`, guarantor?.address);
    addG(`guarantor_${n}_city`, guarantor?.city);
    addG(`guarantor_${n}_state`, guarantor?.state);
    addG(`guarantor_${n}_postcode`, guarantor?.postcode);
    addG(`guarantor_${n}_phone`, guarantor?.phone);
    addG(`guarantor_${n}_email`, guarantor?.email);
    // legacy labels
    addG(`guarantor${n}_name`, name);
    addG(`guarantor${n}_address`, guarantor?.address);
    return arr;
  });

  return {
    textTabs: [
      ...tabs,
      ...equipmentTabs,
      ...directorTabs,
      ...guarantorTabs,
    ].filter(Boolean),
    // Include a tiny debug string so we can confirm slot values in DocuSign envelope data
    customFields: {
      textCustomFields: [
        {
          name: "equip_debug",
          value: equipment
            .map((e, i) => `${i + 1}:${e.category}|${e.quantity}|${e.manufacturer}`)
            .join(";")
            .slice(0, 200),
          show: "false",
        },
      ],
    },
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      throw new Error("applicationId is required");
    }

    const { data: appRow, error: appErr } = await supabase
      .from("application_forms")
      .select("id, data")
      .eq("id", applicationId)
      .single();
    if (appErr || !appRow) {
      throw new Error(appErr?.message || "Application not found");
    }

    const data = normalizeApplicationData(appRow.data || {});
    try {
      console.log("create-envelope data snapshot", {
        applicationId,
        directorsCount: Array.isArray(data.directors) ? data.directors.length : 0,
        guarantorsCount: Array.isArray(data.guarantors) ? data.guarantors.length : 0,
        directors: Array.isArray(data.directors)
          ? data.directors.map((d: any, idx: number) => ({
              idx,
              email: d?.email || d?.contactEmail || d?.contact_email,
              name:
                d?.fullName ||
                d?.name ||
                [d?.title, d?.firstName, d?.lastName].filter(Boolean).join(" "),
            }))
          : [],
        guarantors: Array.isArray(data.guarantors)
          ? data.guarantors.map((g: any, idx: number) => ({
              idx,
              email: g?.email || g?.contactEmail || g?.contact_email,
              name:
                g?.fullName ||
                g?.name ||
                [g?.title, g?.firstName, g?.lastName].filter(Boolean).join(" "),
            }))
          : [],
      });
    } catch (snapErr) {
      console.error("create-envelope snapshot log failed", snapErr);
    }
    const tabs = buildTemplateTabs(data);
    const templateRoles: Array<any> = [];

    // Director 1 (required) - role name must match DocuSign template
    const director1 = Array.isArray(data.directors) && data.directors[0] ? data.directors[0] : null;
    const director1Name =
      director1?.fullName ||
      director1?.name ||
      [director1?.title, director1?.firstName, director1?.lastName].filter(Boolean).join(" ") ||
      data?.contactName ||
      data?.entityName ||
      data?.businessName ||
      "ASLS Applicant";
    const director1Email = director1?.email || data?.email;
    if (!director1Email) {
      throw new Error("Application is missing Director 1 email address.");
    }
    // Add Lessee role for templates that expect it (maps to Director 1 contact)
    templateRoles.push({
      roleName: "Lessee",
      name: director1Name,
      email: director1Email,
      tabs,
    });
    // Explicit Director 1 role (as per template naming)
    templateRoles.push({
      roleName: "director_1",
      name: director1Name,
      email: director1Email,
      tabs,
    });

    // Director 2 (optional)
    const director2 = Array.isArray(data.directors) && data.directors[1] ? data.directors[1] : null;
    const director2Name =
      director2?.fullName ||
      director2?.name ||
      [director2?.title, director2?.firstName, director2?.lastName].filter(Boolean).join(" ") ||
      director2?.email ||
      "Director 2";
    const director2Email = director2?.email || director2?.contactEmail || director2?.contact_email;
    if (director2 && director2Email) {
      templateRoles.push({
        roleName: "director_2",
        name: director2Name,
        email: director2Email,
        tabs,
      });
    }

    // Guarantor 1 (optional)
    const guarantor1 = Array.isArray(data.guarantors) && data.guarantors[0] ? data.guarantors[0] : null;
    const g1Name =
      guarantor1?.fullName ||
      guarantor1?.name ||
      [guarantor1?.title, guarantor1?.firstName, guarantor1?.lastName].filter(Boolean).join(" ") ||
      guarantor1?.email ||
      "Guarantor 1";
    const guarantor1Email = guarantor1?.email || guarantor1?.contactEmail || guarantor1?.contact_email;
    if (guarantor1 && guarantor1Email) {
      templateRoles.push({
        roleName: "guarantor_1",
        name: g1Name,
        email: guarantor1Email,
        tabs,
      });
    }

    // Guarantor 2 (optional)
    const guarantor2 = Array.isArray(data.guarantors) && data.guarantors[1] ? data.guarantors[1] : null;
    const g2Name =
      guarantor2?.fullName ||
      guarantor2?.name ||
      [guarantor2?.title, guarantor2?.firstName, guarantor2?.lastName].filter(Boolean).join(" ") ||
      guarantor2?.email ||
      "Guarantor 2";
    const guarantor2Email = guarantor2?.email || guarantor2?.contactEmail || guarantor2?.contact_email;
    if (guarantor2 && guarantor2Email) {
      templateRoles.push({
        roleName: "guarantor_2",
        name: g2Name,
        email: guarantor2Email,
        tabs,
      });
    }

    // CC to John/ASLS copy if configured
    if (ASLS_COPY_EMAIL) {
      templateRoles.push({
        roleName: "ASLS Copy",
        name: ASLS_COPY_NAME,
        email: ASLS_COPY_EMAIL,
        recipientType: "cc",
      });
    }
    if (ASLS_ADMIN_EMAIL) {
      templateRoles.push({
        roleName: "ASLS Admin Copy",
        name: ASLS_ADMIN_NAME,
        email: ASLS_ADMIN_EMAIL,
        recipientType: "cc",
      });
    }

    const token = await fetchAccessToken();

    // Debug: log which roles/emails are included in the envelope
    try {
      const roleSummary = templateRoles.map((r) => ({
        role: (r as any)?.roleName || (r as any)?.role,
        email: (r as any)?.email || (r as any)?.recipientEmail,
      }));
      console.log("create-envelope roles", { applicationId, roles: roleSummary });
    } catch (logErr) {
      console.error("create-envelope role log failed", logErr);
    }

    const envelopeRes = await fetch(
      `${docuSignBaseUrl}/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: DOCUSIGN_TEMPLATE_ID,
          templateRoles,
          // Also send values as prefill tabs to populate fields even if they are sender-only or unassigned to the role.
          prefillTabs: { textTabs: tabs.textTabs },
          status: "sent",
        }),
      }
    );

    if (!envelopeRes.ok) {
      const text = await envelopeRes.text();
      throw new Error(`Failed to create envelope: ${text}`);
    }

    const envelopeJson = await envelopeRes.json();
    const envelopeId = envelopeJson.envelopeId;

    return new Response(
      JSON.stringify({
        success: true,
        envelopeId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("create-envelope error", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Unknown error",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
