import { createBrowserClient } from "@supabase/ssr";
import { publicEnvSchema } from "@speckyai/shared/env";

export const createSupabaseBrowserClient = () => {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in values."
    );
  }

  return createBrowserClient(
    parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};
