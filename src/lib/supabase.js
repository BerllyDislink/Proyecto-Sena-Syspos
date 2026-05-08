import { createClient } from '@supabase/supabase-js'

// ── Reemplaza estos valores con los de tu proyecto Supabase ──────────
// Los encuentras en: Settings → API → Project URL y anon public key
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    '⚠️  Faltan las variables de entorno de Supabase.\n' +
    'Crea un archivo .env en la raíz del proyecto con:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=tu_anon_key'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
