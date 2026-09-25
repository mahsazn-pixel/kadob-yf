import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SessionFilters {
  receiver_id?: string | null;
  age_group?: string;
  age_range?: string | null;
  gender?: string | null;
  closeness?: string;
  budget_min?: number;
  budget_max?: number;
  occasion_id?: string | null;
}

function inferProductGender(title: string, category: string | null): "male" | "female" | "unisex" {
  if (/مردانه/.test(title)) return "male";
  if (/زنانه|آرایشی|رژ لب/.test(title)) return "female";
  if (category === "beauty") return "female";
  if (category === "jewelry" && /گردنبند|آویز|طلا/.test(title)) return "female";
  return "unisex";
}

function genderScore(title: string, category: string | null, gender?: string | null): number {
  if (!gender || gender === "unknown") return 0;
  const inferred = inferProductGender(title, category);
  if (inferred === "unisex") return 1;
  if (inferred === gender) return 7;
  return -10;
}

function ageScore(title: string, category: string | null, ageRange?: string | null): number {
  if (!ageRange) return 0;
  const cat = category || "";
  const isKidsItem = cat === "kids" || /کودک|نوزاد|اسباب‌بازی/.test(title);
  if (ageRange === "under3") {
    if (isKidsItem) return 10;
    if (["jewelry", "perfume", "beauty", "digital", "gaming", "home_appliance", "bag", "clothing"].includes(cat)) return -8;
    return -3;
  }
  if (ageRange === "3to7") {
    if (isKidsItem) return 9;
    if (cat === "book" || cat === "food" || cat === "plant" || cat === "gaming") return 2;
    if (["jewelry", "perfume", "beauty", "home_appliance"].includes(cat)) return -7;
    return -1;
  }
  if (ageRange === "8to15") {
    if (cat === "gaming" || cat === "digital" || isKidsItem) return 7;
    if (cat === "book" || cat === "clothing" || cat === "bag" || cat === "accessories") return 3;
    if (["jewelry", "perfume", "beauty", "home_appliance"].includes(cat)) return -4;
    return 1;
  }
  if (ageRange === "over15") {
    if (isKidsItem) return -8;
    if (["jewelry", "perfume", "beauty", "accessories", "digital", "bag"].includes(cat)) return 4;
    return 2;
  }
  return 0;
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
    const ageRange = body.age_range || body.age_group || null;
    const gender = body.gender || null;

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

    const budgetMin = body.budget_min || 0;
    const budgetMax = body.budget_max || Number.MAX_SAFE_INTEGER;

    const scoreProduct = (p: {
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
      const inBudget = p.price_amount >= budgetMin && p.price_amount <= budgetMax;
      if (inBudget && budgetMax > budgetMin) {
        const mid = (budgetMin + budgetMax) / 2;
        const dist = Math.abs(p.price_amount - mid) / Math.max(mid, 1);
        score += Math.max(0, 5 - dist * 5);
      } else if (!inBudget) {
        score -= 6;
      }
      score += genderScore(p.title, p.category_slug, gender);
      score += ageScore(p.title, p.category_slug, ageRange);
      score += Math.random() * 1.2;
      return { ...p, _score: score };
    };

    let ranked = availableProducts.map(scoreProduct).filter((p: { _score: number }) => p._score > -8);
    if (ranked.length < 4) {
      ranked = availableProducts.map(scoreProduct);
    }

    ranked.sort((a: { _score: number }, b: { _score: number }) => b._score - a._score);

    const preferKids = ageRange === "under3" || ageRange === "3to7";
    let finalProducts = ranked;
    if (!preferKids) {
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
      finalProducts = [...diverseProducts, ...remainingProducts];
    }
    finalProducts = finalProducts.slice(0, 20);
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
