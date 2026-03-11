import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../env";

export function createSupabaseAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        "X-Client-Info": "speckyai-admin"
      }
    }
  });
}

