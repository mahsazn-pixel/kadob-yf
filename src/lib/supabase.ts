import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
})

export async function claimWishlistHold(
  ownerUserId: string,
  productId: string,
  reservedByUserId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_wishlist_hold', {
    p_owner_user_id: ownerUserId,
    p_product_id: productId,
    p_reserved_by: reservedByUserId,
  })
  if (error) return false
  return data === true
}
