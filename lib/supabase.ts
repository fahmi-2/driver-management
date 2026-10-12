import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jsoszdwlkqxthwstgyhv.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_qCNtjue4Y28vgAz4X4CqaA_DNURJiNB'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
