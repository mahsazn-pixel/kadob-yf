import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || !/^09\d{9}$/.test(phone)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "شماره موبایل نامعتبر است" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: check last OTP request in last 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("otp_requests")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", sixtySecondsAgo);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "لطفاً یک دقیقه صبر کنید" } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes

    const { data, error } = await supabase
      .from("otp_requests")
      .insert({ phone, code, expires_at: expiresAt })
      .select("id")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ایجاد درخواست" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In production, send SMS here. For MVP/dev, always return the code.
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          otp_request_id: data.id,
          expires_in: 120,
          retry_after: 60,
          dev_code: code,
        },
        meta: { request_id: crypto.randomUUID() },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
