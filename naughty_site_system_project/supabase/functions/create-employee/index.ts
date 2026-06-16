import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "missing_env" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get("authorization") || "";
  const caller = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: allowed, error: allowError } = await caller.rpc("is_admin");
  if (allowError || !allowed) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const loginId = normalizeLoginId(body.loginId);
  const password = String(body.password || "").trim();
  const displayName = String(body.displayName || loginId).trim();
  const staffId = String(body.staffId || "").trim() || null;
  const isActive = body.isActive !== false;
  if (!loginId || !password) return json({ error: "login_id_and_password_required" }, 400);

  const internalEmail = `${loginId}@naughty.local`;
  const { data: userResult, error: userError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { login_id: loginId, display_name: displayName },
  });
  if (userError) return json({ error: userError.message }, 400);

  const user = userResult.user;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    role: "employee",
    login_id: loginId,
    internal_email: internalEmail,
    staff_id: staffId,
    display_name: displayName,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  });
  if (profileError) return json({ error: profileError.message }, 400);

  return json({ id: user.id, loginId, internalEmail, displayName, staffId, isActive });
});

function normalizeLoginId(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 32);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
