/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for use throughout the application.
 * It provides both client-side and server-side Supabase instances.
 * 
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
    console.warn(
        '⚠️ Missing Supabase environment variables. Using placeholder values. App will NOT function correctly until .env.local is configured.'
    );
}

/**
 * Supabase client for client-side operations
 * Use this in React components and client-side code
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

/**
 * Create a Supabase client for server-side operations
 * This should be used in API routes and server components
 * 
 * @returns Supabase client instance
 */
export function createServerSupabaseClient() {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
