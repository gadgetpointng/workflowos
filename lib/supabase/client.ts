import { createBrowserClient } from "@supabase/ssr";

const WORKFLOWOS_SUPABASE_URL = "https://hasnhivdrpeqytgdnkzo.supabase.co";

function supabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") return value;
    } catch {}
  }
  return WORKFLOWOS_SUPABASE_URL;
}

export function createClient() {
  return createBrowserClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}