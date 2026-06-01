import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createBrowserClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "missing-public-anon-key",
);

export function getAuthRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

// Generate a short unique ID like "y_8f3k2x"
export function generateYetiId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "y_";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export interface YetiConfig {
  yeti_id: string;
  domain: string;
  business_name: string;
  prompt: string;
  pages: string[];
  created_at?: string;
}

// Save a yeti config to Supabase
export async function saveYetiConfig(config: Omit<YetiConfig, "created_at">): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  const { error } = await supabase.from("yeti_configs").insert(config);
  if (error) throw new Error(`Failed to save: ${error.message}`);
  return config.yeti_id;
}

// Fetch a yeti config by ID (used by the widget)
export async function fetchYetiConfig(yetiId: string): Promise<YetiConfig | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("yeti_configs")
    .select("*")
    .eq("yeti_id", yetiId)
    .single();
  if (error || !data) return null;
  return data as YetiConfig;
}
