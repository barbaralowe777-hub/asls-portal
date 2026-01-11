// Supabase Edge Function: landlord-waiver
// Sends landlord waiver email when premises type is "Rented".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const WAIVER_URL = "https://portal.asls.net.au/Landlord_waiver.pdf";
const FROM = Deno.env.get("ADMIN_EMAIL") || "admin@asls.net.au";
const LOGO_URL = "https://portal.asls.net.au/ASLS-logo.png";

type Payload = {
  applicationId: string;
  directorEmail: string;
  directorName?: string;
};

const makeHeaders = () =>
  new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Content-Type": "application/json",
  });

const sendEmail = async (to: string, html: string, text: string) => {
  const payload = { to: [to], subject: "Landlord Waiver – Action Required", html, text, from: FROM };
  const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error(`send-email failed: ${resp.status} ${await resp.text()}`);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: makeHeaders() });
  }

  try {
    const { applicationId, directorEmail, directorName } = (await req.json()) as Payload;
    if (!applicationId || !directorEmail) {
      return new Response(JSON.stringify({ error: "applicationId and directorEmail required" }), {
        status: 400,
        headers: makeHeaders(),
      });
    }

    const firstName = (directorName || "").split(" ")[0] || "there";
    const text = `Hi ${firstName},

For your application ${applicationId}, please review and sign the landlord waiver.
Link: ${WAIVER_URL}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:640px;margin:auto;">
        <div style="text-align:center;margin-bottom:16px;">
          <img src="${LOGO_URL}" alt="ASLS" style="max-height:64px;" />
        </div>
        <h2 style="color:#0f5132;">Landlord Waiver Required</h2>
        <p>Hi ${firstName},</p>
        <p>For your application ${applicationId}, please review and sign the landlord waiver.</p>
        <p><a href="${WAIVER_URL}" style="background:#0ac432;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Open Landlord Waiver</a></p>
        <p>If the button does not work, copy and paste this link:<br>${WAIVER_URL}</p>
      </div>
    `;

    await sendEmail(directorEmail, html, text);

    await supabase.from("landlord_waiver_logs").insert({
      application_id: applicationId,
      sent_to: directorEmail,
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: makeHeaders() });
  } catch (err: any) {
    console.error("landlord-waiver failure", err);
    return new Response(JSON.stringify({ error: err.message || "Send failed" }), {
      status: 500,
      headers: makeHeaders(),
    });
  }
});
