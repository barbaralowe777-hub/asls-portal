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
const PORTAL_BASE_URL =
  Deno.env.get("PORTAL_BASE_URL") || "https://portal.asls.net.au";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

const docuSignBaseUrl = "https://demo.docusign.net/restapi/v2.1";

const buildCorsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": origin || PORTAL_BASE_URL,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, X-Client-Info",
});

async function createJwt(): Promise<string> {
  const header: Header = { alg: "RS256", typ: "JWT" };
  const payload: Payload = {
    iss: DOCUSIGN_INTEGRATION_KEY,
    sub: DOCUSIGN_USER_ID,
    aud: "account-d.docusign.com",
    iat: getNumericDate(0),
    exp: getNumericDate(3600),
    scope: "signature impersonation",
  };
  return await create(header, payload, DOCUSIGN_PRIVATE_KEY);
}

async function fetchAccessToken(): Promise<string> {
  const jwt = await createJwt();
  const res = await fetch("https://account-d.docusign.com/oauth/token", {
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

const buildTemplateTabs = (data: any) => {
  const lesseeAddress = [
    data?.streetAddress,
    data?.streetAddress2,
    data?.city,
    data?.state,
    data?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const supplierAddress = [
    data?.supplierAddress,
    data?.supplierCity,
    data?.supplierState,
    data?.supplierPostcode,
  ]
    .filter(Boolean)
    .join(", ");

  const equipment = Array.isArray(data?.equipmentItems)
    ? data.equipmentItems
    : [];

  const financeAmount =
    data?.financeAmount ||
    data?.finance_amount ||
    data?.amount ||
    data?.totalAmount;

  const monthlyPayment =
    data?.monthlyRepayment ||
    data?.finance?.monthlyPayment ||
    "";

  const textTabs = [
    buildTextTab(
      "lessee_entity_name",
      data?.businessName || data?.entityName
    ),
    buildTextTab("lessee_installation_address", lesseeAddress),
    buildTextTab("lessee_phone", data?.phone),
    buildTextTab("lessee_email", data?.email),
    buildTextTab("lessee_abn", data?.abnNumber),
    buildTextTab(
      "supplier_name",
      data?.supplierBusinessName || data?.vendorName
    ),
    buildTextTab("supplier_address", supplierAddress),
    buildTextTab("supplier_abn", data?.supplierAbn),
    buildTextTab("supplier_phone", data?.supplierPhone),
    buildTextTab("supplier_email", data?.supplierEmail),
    buildTextTab(
      "finance_monthly_payment",
      monthlyPayment && Number(monthlyPayment)
        ? Number(monthlyPayment).toFixed(2)
        : monthlyPayment
    ),
    buildTextTab("finance_term", data?.term || data?.financeTerm),
    buildTextTab(
      "finance_amount",
      financeAmount && Number(financeAmount)
        ? Number(financeAmount).toFixed(2)
        : financeAmount
    ),
    buildTextTab(
      "finance_special_conditions",
      data?.specialConditions || data?.financeSpecialConditions || ""
    ),
  ];

  const equipmentTabs = [0, 1, 2].flatMap((idx) => {
    const item = equipment[idx];
    if (!item) return [];
    return [
      buildTextTab(
        `equipment_${idx + 1}_desc`,
        [item.asset, item.description, item.category].filter(Boolean).join(" ")
      ),
      buildTextTab(`equipment_${idx + 1}_qty`, item.quantity || item.qty),
    ];
  });

  const directors = Array.isArray(data?.directors) ? data.directors : [];
  const directorTabs = directors.slice(0, 2).flatMap((director, idx) => [
    buildTextTab(
      `director${idx + 1}_name`,
      [director?.title, director?.firstName, director?.lastName]
        .filter(Boolean)
        .join(" ")
    ),
    buildTextTab(
      `director${idx + 1}_position`,
      director?.position || "Director"
    ),
    buildTextTab(`director${idx + 1}_date`, director?.signatureDate || ""),
  ]);

  return {
    textTabs: [...textTabs, ...equipmentTabs, ...directorTabs].filter(Boolean),
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

    const data = appRow.data || {};
    const contactName =
      data?.contactName ||
      data?.entityName ||
      data?.businessName ||
      "ASLS Applicant";
    const contactEmail = data?.email;

    if (!contactEmail) {
      throw new Error("Application is missing applicant email address.");
    }

    const tabs = buildTemplateTabs(data);
    const templateRoles = [
      {
        roleName: "Lessee",
        name: contactName,
        email: contactEmail,
        clientUserId: applicationId,
        tabs,
      },
    ];

    const token = await fetchAccessToken();

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
          status: "created",
        }),
      }
    );

    if (!envelopeRes.ok) {
      const text = await envelopeRes.text();
      throw new Error(`Failed to create envelope: ${text}`);
    }

    const envelopeJson = await envelopeRes.json();
    const envelopeId = envelopeJson.envelopeId;

    const recipientViewRes = await fetch(
      `${docuSignBaseUrl}/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/views/recipient`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: `${PORTAL_BASE_URL}/contract/${applicationId}?signed=1`,
          authenticationMethod: "none",
          email: contactEmail,
          userName: contactName,
          clientUserId: applicationId,
        }),
      }
    );

    if (!recipientViewRes.ok) {
      const text = await recipientViewRes.text();
      throw new Error(`Failed to create recipient view: ${text}`);
    }
    const viewJson = await recipientViewRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        envelopeId,
        url: viewJson.url,
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
