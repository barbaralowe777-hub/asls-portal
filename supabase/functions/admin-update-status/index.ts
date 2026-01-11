import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Supabase reserves SUPABASE_* env prefixes in functions, so use PROJECT_URL/SERVICE_ROLE_KEY.
const PROJECT_URL =
  Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const isUUID = (val: string) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
};
const ALLOWED_STATUSES = new Set([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "funded",
  "settled",
  "declined",
  "withdrawn",
]);

const buildHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
  "Content-Type": "application/json",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: buildHeaders() });
  }

  try {
    if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service env not configured" }), {
        status: 500,
        headers: buildHeaders(),
      });
    }

    const { id, status } = await req.json();

    const normalizeStatus = (s: string) => {
      const raw = String(s || "").trim().toLowerCase();
      if (raw === "settled" || raw === "settled (funded)") return "funded";
      return raw;
    };

    const normalizedStatus = normalizeStatus(status as string);
    console.log("admin-update-status: payload", { id, status: normalizedStatus });

    if (!id || !normalizedStatus) {
      return new Response(JSON.stringify({ error: "id and status are required" }), {
        status: 400,
        headers: buildHeaders(),
      });
    }
    if (!ALLOWED_STATUSES.has(normalizedStatus)) {
      return new Response(JSON.stringify({ error: "Invalid status value" }), {
        status: 400,
        headers: buildHeaders(),
      });
    }

    const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const updates: Array<Promise<{ error: any }>> = [];

    // Only try to update applications if the id is a valid UUID; otherwise skip to avoid uuid syntax errors
    if (isUUID(id)) {
      updates.push(
        supabase.from("applications").update({ status: normalizedStatus }).eq("id", id)
      );
    }

    // Always try application_forms
    updates.push(
      supabase.from("application_forms").update({ status: normalizedStatus }).eq("id", id)
    );

    const results = await Promise.all(updates);
    const appErr = isUUID(id) ? results[0]?.error || null : null;
    const formErr = results[results.length - 1]?.error || null;

    if (appErr || formErr) {
      console.error("admin-update-status failed", { appErr, formErr, id, status: normalizedStatus });
      return new Response(
        JSON.stringify({
          error: appErr?.message || formErr?.message || "Update failed",
          appError: appErr?.message || null,
          formError: formErr?.message || null,
        }),
        {
          status: 400,
          headers: buildHeaders(),
        }
      );
    }

    console.log("admin-update-status ok", { id, status: normalizedStatus });

    return new Response(JSON.stringify({ ok: true }), { headers: buildHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("admin-update-status unexpected error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: buildHeaders(),
    });
  }
});
