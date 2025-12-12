
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const token = 'e48db1df-9667-4621-955b-c36966c7a875';
    console.log(`Checking token: ${token}`);

    const { data: tokenData, error: tokenError } = await supabase
        .from('guest_access_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (tokenError) {
        console.error('Token Error:', tokenError);
        return;
    }
    console.log('Token Data:', tokenData);

    if (!tokenData) {
        console.log('No token data found');
        return;
    }

    const { data: apps, error: appError } = await supabase
        .from('applications')
        .select('id, name, resume_url')
        .eq('posting_id', tokenData.posting_id);

    if (appError) {
        console.error('App Error:', appError);
        return;
    }

    console.log('Applications found:', apps?.length);
    apps?.forEach(app => {
        console.log(`App: ${app.name} (${app.id}) - Resume: ${app.resume_url}`);
    });
}

main();
