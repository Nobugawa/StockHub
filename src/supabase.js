import { createClient } from '@supabase/supabase-js'

// Netlify's Supabase extension uses SUPABASE_* names, while Vite only exposes
// VITE_* variables to browser code. Support VITE_* explicitly and keep a
// build-time fallback for installations that expose the extension names.
const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_DATABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null
