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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "توکن لازم است" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "توکن نامعتبر" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body: { product_id: string; reaction: string; session_id: string; receiver_id?: string | null } = await req.json();
    const sessionId = body.session_id;
    const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";

    const validReactions = ["no", "good", "the_one"];
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "شناسه جلسه لازم است" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "شناسه محصول لازم است" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!validReactions.includes(body.reaction)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "واکنش نامعتبر" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from("discovery_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "جلسه یافت نشد" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFLICT", message: "جلسه فعال نیست" } }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const servedProductIds: string[] = Array.isArray(session.served_product_ids)
      ? session.served_product_ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      : [];
    if (!servedProductIds.includes(productId)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "این محصول در این جلسه ارائه نشده است" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingReaction } = await supabase
      .from("user_interactions")
      .select("id")
      .eq("session_id", sessionId)
      .eq("product_id", productId)
      .maybeSingle();
    if (existingReaction) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "CONFLICT", message: "واکنش این کارت قبلاً ثبت شده است" } }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmedReceiverId = body.reaction === "the_one"
      ? (body.receiver_id ?? null)
      : (session.receiver_id || null);

    if (body.reaction === "the_one" && confirmedReceiverId) {
      const { data: person, error: personError } = await supabase
        .from("close_people")
        .select("id")
        .eq("id", confirmedReceiverId)
        .eq("owner_user_id", userId)
        .maybeSingle();
      if (personError || !person) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "شخص نزدیک یافت نشد" } }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { error: interactionError } = await supabase.from("user_interactions").insert({
      user_id: userId,
      receiver_id: confirmedReceiverId,
      product_id: productId,
      reaction_type: body.reaction,
      session_id: sessionId,
    });

    if (interactionError) {
      if (interactionError.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: { code: "CONFLICT", message: "واکنش این کارت قبلاً ثبت شده است" } }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ثبت واکنش" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const maxCards = typeof session.max_cards === "number" && session.max_cards > 0
      ? session.max_cards
      : servedProductIds.length || 20;
    const newShownCount = session.shown_count + 1;
    let newStatus = "active";
    let reservationCreated = false;

    // If reaction is "the_one", complete the session and create reservation
    if (body.reaction === "the_one") {
      newStatus = "completed";

      if (confirmedReceiverId) {
        const { data: receiver } = await supabase
          .from("close_people")
          .select("linked_user_id, name, owner_user_id")
          .eq("id", confirmedReceiverId)
          .maybeSingle();
        const ownerUserId = receiver?.linked_user_id || null;
        if (ownerUserId) {
          const { data: claimed, error: claimError } = await supabase.rpc("claim_wishlist_hold", {
            p_owner_user_id: ownerUserId,
             p_product_id: productId,
            p_reserved_by: userId,
          });
          if (claimError || claimed !== true) {
            return new Response(
              JSON.stringify({ success: false, error: { code: "CONFLICT", message: "این هدیه قبلاً رزرو شده است" } }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      const { error: shopError } = await supabase.from("shopping_list_items").insert({
        user_id: userId,
        receiver_id: confirmedReceiverId,
        product_id: productId,
        status: "reserved",
        session_id: sessionId,
        reserved_at: new Date().toISOString(),
      });

      if (shopError) {
        const duplicate = shopError.code === "23505";
        if (duplicate) {
          return new Response(
            JSON.stringify({ success: false, error: { code: "CONFLICT", message: "این هدیه قبلاً رزرو شده است" } }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        reservationCreated = true;
      }

      await supabase
        .from("discovery_sessions")
        .update({
          status: newStatus,
          shown_count: newShownCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // Fetch the product for the shop URL
      const { data: product } = await supabase
        .from("products")
        .select("shop_url")
        .eq("id", productId)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            session_status: "completed",
            shown_cards: newShownCount,
            remaining_cards: 0,
            reservation_created: reservationCreated,
            shop_url: product?.shop_url || null,
          },
          meta: { request_id: crypto.randomUUID() },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newShownCount >= maxCards) {
      // Check if there were any positive reactions
      const { data: positiveInteractions } = await supabase
        .from("user_interactions")
        .select("reaction_type")
        .eq("session_id", sessionId)
        .in("reaction_type", ["good"]);

      if (positiveInteractions && positiveInteractions.length > 0) {
        newStatus = "review";
      } else {
        newStatus = "failed";
      }

      await supabase
        .from("discovery_sessions")
        .update({
          status: newStatus,
          shown_count: newShownCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            session_status: newStatus,
            shown_cards: newShownCount,
            remaining_cards: 0,
            next_card: null,
          },
          meta: { request_id: crypto.randomUUID() },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("discovery_sessions")
      .update({ shown_count: newShownCount })
      .eq("id", sessionId);

    const { data: interacted } = await supabase
      .from("user_interactions")
      .select("product_id")
      .eq("session_id", sessionId);

    const interactedIds = new Set((interacted || []).map((i: { product_id: string }) => i.product_id));
    const nextProductId = servedProductIds.find((id: string) => !interactedIds.has(id)) || null;

    let nextCard = null;
    if (nextProductId) {
      const { data: nextProduct } = await supabase
        .from("products")
        .select("*")
        .eq("id", nextProductId)
        .maybeSingle();
      if (nextProduct) {
        nextCard = {
          id: crypto.randomUUID(),
          product_id: nextProduct.id,
          position: newShownCount + 1,
          image_url: nextProduct.image_url,
          title: nextProduct.title,
          price: { amount: nextProduct.price_amount, currency: nextProduct.currency || "IRT" },
          merchant: { name: nextProduct.merchant_name },
          shop_url: nextProduct.shop_url,
          category: nextProduct.category_slug,
          availability: "in_stock",
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session_status: "active",
          shown_cards: newShownCount,
          remaining_cards: Math.max(0, maxCards - newShownCount),
          next_card: nextCard,
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
