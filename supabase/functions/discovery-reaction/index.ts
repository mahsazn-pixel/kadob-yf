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
    const url = new URL(req.url);
    const body: { product_id: string; reaction: string; session_id: string } = await req.json();
    const sessionId = body.session_id;

    const validReactions = ["no", "good", "great", "the_one"];
    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "شناسه جلسه لازم است" } }),
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

    // Record the interaction
    const { error: interactionError } = await supabase.from("user_interactions").insert({
      user_id: userId,
      receiver_id: session.receiver_id,
      product_id: body.product_id,
      reaction_type: body.reaction,
      session_id: sessionId,
    });

    if (interactionError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ثبت واکنش" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newShownCount = session.shown_count + 1;
    let newStatus = "active";
    let reservationCreated = false;

    // If reaction is "the_one", complete the session and create reservation
    if (body.reaction === "the_one") {
      newStatus = "completed";

      // Create shopping list item (reservation)
      const { error: shopError } = await supabase.from("shopping_list_items").insert({
        user_id: userId,
        receiver_id: session.receiver_id,
        product_id: body.product_id,
        status: "reserved",
        session_id: sessionId,
        reserved_at: new Date().toISOString(),
      });

      if (!shopError) {
        reservationCreated = true;
        const { data: receiver } = await supabase
          .from("close_people")
          .select("linked_user_id, name, owner_user_id")
          .eq("id", session.receiver_id)
          .maybeSingle();
        const ownerUserId = receiver?.linked_user_id
          || (receiver?.name === "خودم" ? receiver.owner_user_id : null);
        if (ownerUserId) {
          await supabase.from("wishlist_items").update({
            reserved_by_user_id: userId,
            reserved_at: new Date().toISOString(),
          }).eq("owner_user_id", ownerUserId).eq("product_id", body.product_id);
        }
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
        .eq("id", body.product_id)
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

    // Check if 20 cards reached
    if (newShownCount >= 20) {
      // Check if there were any positive reactions
      const { data: positiveInteractions } = await supabase
        .from("user_interactions")
        .select("reaction_type")
        .eq("session_id", sessionId)
        .in("reaction_type", ["good", "great"]);

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

    // Still active — update shown count and return next card
    await supabase
      .from("discovery_sessions")
      .update({ shown_count: newShownCount })
      .eq("id", sessionId);

    // Fetch next product (not yet interacted in this session)
    const { data: interacted } = await supabase
      .from("user_interactions")
      .select("product_id")
      .eq("session_id", sessionId);

    const interactedIds = (interacted || []).map((i: { product_id: string }) => i.product_id);

    // Get products within budget
    const filters = session.filters_json as {
      budget_min?: number;
      budget_max?: number;
    };

    let query = supabase
      .from("products")
      .select("*")
      .eq("availability", "in_stock")
      .not("id", "in", `(${interactedIds.length > 0 ? interactedIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);

    if (filters.budget_min) query = query.gte("price_amount", filters.budget_min);
    if (filters.budget_max) query = query.lte("price_amount", filters.budget_max);

    const { data: nextProducts } = await query.limit(5);

    let nextCard = null;
    if (nextProducts && nextProducts.length > 0) {
      const p = nextProducts[0];
      nextCard = {
        id: crypto.randomUUID(),
        product_id: p.id,
        position: newShownCount + 1,
        image_url: p.image_url,
        title: p.title,
        price: { amount: p.price_amount, currency: p.currency || "IRR" },
        merchant: { name: p.merchant_name },
        shop_url: p.shop_url,
        category: p.category_slug,
        availability: "in_stock",
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session_status: "active",
          shown_cards: newShownCount,
          remaining_cards: 20 - newShownCount,
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
