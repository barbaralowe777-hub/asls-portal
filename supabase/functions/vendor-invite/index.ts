import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const allowedOrigins = (Deno.env.get("CORS_ALLOW_ORIGIN") || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const defaultAllowed = ["https://portal.asls.net.au", "http://localhost:5173"];

const makeHeaders = (req: Request) => {
  const origin = req.headers.get("origin")?.toLowerCase() || "";
  const allow =
    allowedOrigins.includes(origin) || defaultAllowed.includes(origin)
      ? origin
      : "*";
  return new Headers({
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  });
};

const sendPortalEmail = async (to: string, actionLink: string, name?: string) => {
  if (!to || !actionLink) return;
  const payload = {
    to: [to],
    subject: "Access the ASLS Vendor Portal",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
        <h2>Vendor Portal Access</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your portal access link is ready. Click below to open and set your password:</p>
        <p><a href="${actionLink}" style="background:#0ac432;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Vendor Portal</a></p>
        <p>If the button does not work, copy and paste this link into your browser:<br/>${actionLink}</p>
      </div>
    `,
  };
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify(payload),
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: makeHeaders(req) });
  }

  try {
    const { vendor_id, email, name, vendor_code } = await req.json();
    if (!vendor_id || !email) {
      return new Response(JSON.stringify({ error: "vendor_id and email required" }), {
        status: 400,
        headers: makeHeaders(req),
      });
    }

    const redirectTo =
      Deno.env.get("MAGIC_REDIRECT_URL") ||
      "https://portal.asls.net.au/reset-password";

    // Invite user with magic link
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { redirectTo },
    );
    let userId = inviteData?.user?.id;

    // Always generate a magic link and send via send-email for better deliverability
    try {
      const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (magicError) {
        console.error("vendor-invite: magic link generation failed", magicError);
      } else {
        userId = userId || magicData?.user?.id || (magicData as any)?.id || userId;
        const actionLink =
          (magicData as any)?.properties?.action_link ||
          (magicData as any)?.action_link ||
          undefined;
        if (actionLink) {
          try {
            await sendPortalEmail(email, actionLink, name);
          } catch (mailErr) {
            console.error("vendor-invite: failed to send magic link email", mailErr);
          }
        }
      }
    } catch (mlErr) {
      console.error("vendor-invite: magic link generation threw", mlErr);
      if (inviteError) {
        // If both invite and magic link fail, bubble up
        throw new Error(inviteError.message || "Invite failed");
      }
    }

    if (inviteError && !userId) {
      console.error("vendor-invite: invite error with no user id", inviteError);
      throw new Error(inviteError.message || "Error sending invite email");
    }

    if (!userId) throw new Error("No user id from invite or magic link");

    // Stamp metadata
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { first_name: name || "", vendor_code: vendor_code || "", role: "vendor" },
    });

    // Upsert profile as vendor
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, role: "vendor", vendor_id }, { onConflict: "id" });
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: makeHeaders(req) });
  } catch (err: any) {
    console.error("vendor-invite failure", err);
    return new Response(JSON.stringify({ error: err.message || "Invite failed" }), {
      status: 400,
      headers: makeHeaders(req),
    });
  }
});
