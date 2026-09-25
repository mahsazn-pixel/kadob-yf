import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SessionFilters {
  receiver_id?: string | null;
  age_group?: string;
  gender?: string;
  closeness?: string;
  budget_min?: number;
  budget_max?: number;
  occasion_id?: string | null;
}

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

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "توکن نامعتبر" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body: SessionFilters = await req.json();
    const receiverId = body.receiver_id || null;

    if (receiverId) {
      const { data: person, error: personError } = await supabase
        .from("close_people")
        .select("*")
        .eq("id", receiverId)
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (personError || !person) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "شخص نزدیک یافت نشد" } }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from("discovery_sessions")
      .insert({
        user_id: userId,
        receiver_id: receiverId,
        filters_json: body,
        status: "active",
        shown_count: 0,
        max_cards: 20,
      })
      .select("*")
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ایجاد جلسه" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch products matching filters
    let query = supabase
      .from("products")
      .select("*")
      .eq("availability", "in_stock");

    if (body.budget_min) query = query.gte("price_amount", body.budget_min);
    if (body.budget_max) query = query.lte("price_amount", body.budget_max);

    const { data: products, error: productsError } = await query.limit(50);

    if (productsError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "PROVIDER_ERROR", message: "خطا در دریافت محصولات" } }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            session_id: session.id,
            status: "active",
            max_cards: 20,
            shown_cards: 0,
            cards: [],
          },
          meta: { request_id: crypto.randomUUID() },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get wishlist product IDs for this user (signal, not filter)
    const { data: wishlistItems } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("owner_user_id", userId);

    const wishlistProductIds = new Set((wishlistItems || []).map((w: { product_id: string }) => w.product_id));

    let previousInteractions: { product_id: string; reaction_type: string }[] = [];
    if (receiverId) {
      const { data } = await supabase
        .from("user_interactions")
        .select("product_id, reaction_type")
        .eq("receiver_id", receiverId);
      previousInteractions = data || [];
    }

    const interactedProductIds = new Set((previousInteractions || []).map((i: { product_id: string }) => i.product_id));

    // Filter out previously interacted products (for this receiver)
    let availableProducts = products.filter((p: { id: string }) => !interactedProductIds.has(p.id));

    // If we don't have enough, allow previously seen products
    if (availableProducts.length < 20) {
      availableProducts = products;
    }

    // Simple ranking: wishlist boost + diversity by category
    const ranked = availableProducts.map((p: {
      id: string;
      category_slug: string | null;
      price_amount: number;
      title: string;
      image_url: string | null;
      shop_url: string | null;
      merchant_name: string | null;
      currency: string;
    }) => {
      let score = 0;
      if (wishlistProductIds.has(p.id)) score += 5;
      // Budget fit: closer to midpoint = better
      if (body.budget_min && body.budget_max) {
        const mid = (body.budget_min + body.budget_max) / 2;
        const dist = Math.abs(p.price_amount - mid) / mid;
        score += Math.max(0, 3 - dist * 3);
      }
      // Add some randomness for diversity
      score += Math.random() * 2;
      return { ...p, _score: score };
    });

    // Sort by score descending
    ranked.sort((a: { _score: number }, b: { _score: number }) => b._score - a._score);

    // Take top 20 and ensure category diversity
    const seenCategories = new Set<string>();
    const diverseProducts: typeof ranked = [];
    const remainingProducts: typeof ranked = [];

    for (const p of ranked) {
      const cat = p.category_slug || "other";
      if (!seenCategories.has(cat) || diverseProducts.length < 10) {
        diverseProducts.push(p);
        seenCategories.add(cat);
      } else {
        remainingProducts.push(p);
      }
    }
    const finalProducts = [...diverseProducts, ...remainingProducts].slice(0, 20);
    const servedProductIds = finalProducts.map((p) => p.id);

    const { error: servedError } = await supabase
      .from("discovery_sessions")
      .update({
        served_product_ids: servedProductIds,
        max_cards: servedProductIds.length,
      })
      .eq("id", session.id);

    if (servedError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "خطا در ذخیره کارت‌های جلسه" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cards = finalProducts.map((p, idx) => ({
      id: crypto.randomUUID(),
      product_id: p.id,
      position: idx + 1,
      image_url: p.image_url,
      title: p.title,
      price: { amount: p.price_amount, currency: p.currency || "IRT" },
      merchant: { name: p.merchant_name },
      shop_url: p.shop_url,
      category: p.category_slug,
      availability: "in_stock",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session_id: session.id,
          status: "active",
          max_cards: cards.length,
          shown_cards: 0,
          cards,
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
