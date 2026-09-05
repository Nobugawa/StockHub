import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) console.warn('Missing Supabase environment variables')
export const supabase = createClient(url || '', key || '', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
