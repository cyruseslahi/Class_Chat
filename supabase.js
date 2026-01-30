import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with provided credentials
// Use the publishable key for client-side (recommended) or legacy anon key as fallback
export const supabase = createClient(
  "https://scrjzeszztbbgbqusmdn.supabase.co",
  "sb_publishable_GYIius5ZBw9aR-sNs20wPA_40cKURCp" // Publishable key (recommended)
  // Fallback: If publishable key doesn't work, use legacy anon key from "Legacy anon, service_role API keys" tab
  // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." (the full anon public key)
);

