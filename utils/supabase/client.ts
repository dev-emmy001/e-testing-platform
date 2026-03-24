import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/utils/supabase/env";

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
