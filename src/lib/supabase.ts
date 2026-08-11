import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey && !supabaseAnonKey.includes('anon-key') ? supabaseAnonKey : 'placeholder-anon-key';

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey.includes('anon-key')) {
  console.warn(
    'Supabase environment variables are missing or invalid. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local'
  );
}

export const supabase = createClient(finalUrl, finalKey);
