import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure dotenv is loaded
dotenv.config();

// Ensure environment variables are available
if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL environment variable is required');
    console.error('Current working directory:', process.cwd());
    console.error('Environment variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('Note: Use the service role key, NOT the anon key, for backend operations');
    console.error('Current working directory:', process.cwd());
    process.exit(1);
}

// Create Supabase client with service role key for admin operations
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

console.log('✅ Supabase backend client initialized');