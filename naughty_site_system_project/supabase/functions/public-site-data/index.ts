import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return json({ error: "missing_env" }, 500);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [shop, staff, products, shifts, events, gallery] = await Promise.all([
    client.from("shop_settings").select("*").eq("id", "main").maybeSingle(),
    client.from("staff").select("*").eq("public_visible", true).order("display_name"),
    client.from("products").select("*").eq("active", true).order("name"),
    client.from("shifts").select("*").gte("business_date", todayKey()).order("business_date"),
    client.from("events").select("*").eq("public_visible", true).order("event_date"),
    client.from("gallery_items").select("*").eq("public_visible", true).order("sort_order"),
  ]);

  const error = [shop, staff, products, shifts, events, gallery].find((result) => result.error)?.error;
  if (error) return json({ error: error.message }, 400);

  return json({
    shop: shop.data,
    staff: staff.data || [],
    products: products.data || [],
    shifts: shifts.data || [],
    events: events.data || [],
    galleryItems: gallery.data || [],
  });
});

function todayKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
