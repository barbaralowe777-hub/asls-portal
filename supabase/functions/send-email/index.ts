// functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

console.log("📨 send-email function initialized");

const allowedOrigins = [
  "https://portal.asls.net.au",
  "http://localhost:5173",
];

serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, text, html, attachments } = await req.json();

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) throw new Error("Missing SENDGRID_API_KEY");

    if (!to || !subject || !text)
      throw new Error("Missing required fields: to, subject, text");

    const recipients = Array.isArray(to)
      ? to.map((r) => (typeof r === "string" ? { email: r } : r))
      : [{ email: to }];

    console.log("📧 Sending email to:", recipients);

    // ✅ Prepare attachments for SendGrid
    const formattedAttachments = (attachments || []).map((file: any) => ({
      content: file.content, // base64 encoded
      filename: file.filename,
      type: file.type || "application/octet-stream",
      disposition: "attachment",
    }));

    const payload = {
      personalizations: [{ to: recipients }],
      from: { email: "no-reply@asls.net.au", name: "ASLS Vendor Portal" },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html || text },
      ],
      attachments: formattedAttachments.length ? formattedAttachments : undefined,
    };

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!sgResponse.ok) {
      const errorBody = await sgResponse.text();
      console.error("❌ SendGrid Error:", errorBody);
      throw new Error(errorBody);
    }

    console.log("✅ Email sent successfully!");
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (err) {
    console.error("❌ send-email Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      }
    );
  }
});
