import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const BUSINESS_DAY_START_HOUR = 5;
const ROUNDING_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "missing_env" }, 500);

  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const qrCode = extractQrCode(body.qrCode || body.qr || "");
  if (!qrCode) return json({ error: "qr_required" }, 400);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, staff_id, is_active")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile?.staff_id || profile.is_active === false) return json({ error: "profile_not_ready" }, 403);

  const { data: checkpoint, error: checkpointError } = await admin
    .from("qr_checkpoints")
    .select("id, code, is_active")
    .eq("code", qrCode)
    .eq("is_active", true)
    .single();
  if (checkpointError || !checkpoint) return json({ error: "invalid_qr" }, 400);

  const now = new Date();
  const businessDate = businessDateKey(now);
  const rounded = floorDateToQuarter(now);
  const { data: currentShift } = await admin
    .from("shifts")
    .select("status")
    .eq("business_date", businessDate)
    .eq("staff_id", profile.staff_id)
    .maybeSingle();
  const nextStatus = currentShift?.status === "working" ? "off" : "working";
  const roundedTime = timeKey(rounded);

  const { data: punch, error: punchError } = await admin
    .from("punches")
    .insert({
      staff_id: profile.staff_id,
      profile_id: profile.id,
      checkpoint_id: checkpoint.id,
      status: nextStatus,
      actual_at: now.toISOString(),
      rounded_at: rounded.toISOString(),
      actual_time: timeKey(now),
      rounded_time: roundedTime,
      business_date: businessDate,
      source: "employee",
      method: "qr",
    })
    .select()
    .single();
  if (punchError) return json({ error: punchError.message }, 400);

  const shiftPayload = nextStatus === "working"
    ? { status: nextStatus, start_time: roundedTime, public_note: "出勤中", updated_at: now.toISOString() }
    : { status: nextStatus, end_time: roundedTime, public_note: "退勤済", updated_at: now.toISOString() };

  const { error: shiftError } = await admin
    .from("shifts")
    .upsert({ business_date: businessDate, staff_id: profile.staff_id, ...shiftPayload }, { onConflict: "business_date,staff_id" });
  if (shiftError) return json({ error: shiftError.message }, 400);

  await admin.from("staff").update({ work_status: nextStatus, updated_at: now.toISOString() }).eq("id", profile.staff_id);

  return json({ punch, status: nextStatus, businessDate, roundedTime });
});

function extractQrCode(raw: unknown) {
  const text = String(raw || "").trim();
  try {
    const url = new URL(text);
    return url.searchParams.get("qr") || text;
  } catch {
    return text;
  }
}

function businessDateKey(value: Date) {
  const jst = new Date(value.getTime() + JST_OFFSET_MS);
  if (jst.getUTCHours() < BUSINESS_DAY_START_HOUR) {
    jst.setUTCDate(jst.getUTCDate() - 1);
  }
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function floorDateToQuarter(value: Date) {
  const date = new Date(value);
  date.setMinutes(Math.floor(date.getMinutes() / ROUNDING_MINUTES) * ROUNDING_MINUTES, 0, 0);
  return date;
}

function timeKey(value: Date) {
  const jst = new Date(value.getTime() + JST_OFFSET_MS);
  return `${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}:00`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
