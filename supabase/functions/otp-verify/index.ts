import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function makePassword(phone: string): string {
  return `Kadoba_${phone}_2026`;
}

function makeEmail(phone: string): string {
  return `${phone}@kadoba.ir`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { phone, otp, otp_request_id } = await req.json();
    if (!phone || !otp || !otp_request_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "پارامترهای ناقص" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // 1. Mark OTP as verified (we accept ANY code in dev mode)
    await adminClient
      .from("otp_requests")
      .update({ verified: true })
      .eq("id", otp_request_id);

    const email = makeEmail(phone);
    const password = makePassword(phone);

    // 2. Check if profile exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();

    if (!existingProfile) {
      // 3a. New user — create auth account
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ایجاد حساب: " + authError.message } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("profiles").insert({
        id: authData.user.id,
        phone_number: phone,
      });
    }

    // 4. Try signing in with the known password
    let { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    // 5. If sign-in fails (e.g. user was created with a different password before),
    //    reset the password via admin API and try again
    if (signInError || !signInData.session) {
      // Look up the user by email to get their ID
      const { data: userList } = await adminClient.auth.admin.listUsers();
      const user = userList?.users?.find((u: { email: string }) => u.email === email);

      if (user) {
        await adminClient.auth.admin.updateUserById(user.id, { password });
        const retry = await anonClient.auth.signInWithPassword({ email, password });
        signInData = retry.data;
        signInError = retry.error;
      }
    }

    if (signInError || !signInData?.session) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ورود: " + (signInError?.message || "نامشخص") } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Return session tokens
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in ?? 3600,
          user: { id: signInData.user.id, name: null, avatar_url: null },
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
