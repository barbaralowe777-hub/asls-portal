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
    "Access-Control-Allow-Headers": req.headers.get("access-control-request-headers") || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  });
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: makeHeaders(req) });
  }

  try {
    const { agent_id, vendor_id, name, email } = await req.json();
    if (!agent_id || !vendor_id || !email) {
      return new Response(JSON.stringify({ error: "agent_id, vendor_id, email required" }), {
        status: 400,
        headers: makeHeaders(req),
      });
    }

    const redirectTo =
      Deno.env.get("MAGIC_REDIRECT_URL") ||
      (Deno.env.get("SITE_URL") ? `${Deno.env.get("SITE_URL")}/reset-password` : undefined) ||
      Deno.env.get("SITE_URL");

    // Create auth user with a magic link invite
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { redirectTo },
    );
    if (inviteError) {
      console.error("Invite error", inviteError);
      throw new Error(inviteError.message || "Error sending invite email");
    }
    const userId = inviteData.user?.id;
    if (!userId) throw new Error("No user id from invite");

    // Stamp metadata so emails can greet by name
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { first_name: name, role: "agent" },
    });

    // Upsert profile with role=agent and vendor_id
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, role: "agent", vendor_id }, { onConflict: "id" });
    if (profileError) throw profileError;

    // Link the agent row
    const { error: agentError } = await supabase
      .from("agents")
      .update({ profile_id: userId })
      .eq("id", agent_id)
      .eq("vendor_id", vendor_id);
    if (agentError) throw agentError;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: makeHeaders(req) });
  } catch (err: any) {
    console.error("agent-invite failure", err);
    return new Response(JSON.stringify({ error: err.message || "Invite failed" }), {
      status: 400,
      headers: makeHeaders(req),
    });
  }
});
