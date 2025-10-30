// functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

console.log("📨 send-email function initialized");

serve(async (req) => {
  try {
    const { to, subject, text, html } = await req.json();

    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      throw new Error("Missing SENDGRID_API_KEY in environment");
    }

    if (!to || !subject || !text) {
      throw new Error("Missing required fields: to, subject, text");
    }

    // ✅ Normalize 'to' (string, array of strings, or array of objects)
    const recipients = Array.isArray(to)
      ? to.map((entry) =>
          typeof entry === "string" ? { email: entry } : entry
        )
      : [{ email: to }];

    console.log("📧 Sending email to:", recipients);

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients }],
        from: { email: "no-reply@asls.net.au", name: "ASLS Vendor Portal" },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html || text },
        ],
      }),
    });

    if (!sgResponse.ok) {
      const errorBody = await sgResponse.text();
      console.error("❌ SendGrid Error:", errorBody);
      throw new Error(errorBody);
    }

    console.log("✅ Email sent successfully!");
    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("❌ send-email Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }
});
