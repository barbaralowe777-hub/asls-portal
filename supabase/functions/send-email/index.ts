// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@aslsolutions.com.au";
const DEFAULT_TO = Deno.env.get("ADMIN_EMAIL") || "john@worldmachine.com.au";

type Payload = {
  to?: string;            // optional override recipient
  subject?: string;
  html?: string;
  text?: string;
  // anything else in the body will be ignored (safe to send your form payload if needed)
};

serve(async (req) => {
  // Basic CORS support (helps if you ever call this from another origin)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders(),
      status: 204,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Payload;
    const to = payload.to || DEFAULT_TO;
    const subject = payload.subject || "New submission from ASLS Portal";
    const text = payload.text || "No text body provided.";
    const html =
      payload.html ||
      `<p>No HTML provided.</p><pre style="white-space:pre-wrap">${escapeHtml(
        JSON.stringify(payload, null, 2),
      )}</pre>`;

    // Build SendGrid payload
    const sgBody = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: "ASLS Portal" },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sgBody),
    });

    if (!res.ok) {
      const errTxt = await res.text();
      return json({ ok: false, error: errTxt }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
