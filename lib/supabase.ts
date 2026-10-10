import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service role client: bypasses RLS. Only import from API routes / server code.
export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
