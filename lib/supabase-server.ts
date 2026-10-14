import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function getWebsiteFormsConfigurationStatus() {
  return {
    urlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    preferredSecretPresent: Boolean(process.env.SUPABASE_SECRET_KEY),
    legacySecretPresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function createWebsiteFormsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return null;

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
