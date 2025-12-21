
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Checking Attempt Number Distribution ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%') // Adjust if needed
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Target Test: ${test.title} (${test.id})`);

    // 2. Fetch all results stats
    const { data: results, error } = await supabase
        .from('test_results')
        .select('id, attempt_number, created_at, user_id')
        .eq('test_id', test.id);

    if (error || !results) { console.error("Fetch Error:", error); return; }

    const distribution: Record<string, number> = {};
    let nullCount = 0;

    results.forEach(r => {
        if (r.attempt_number === null || r.attempt_number === undefined) {
            nullCount++;
        } else {
            const k = r.attempt_number.toString();
            distribution[k] = (distribution[k] || 0) + 1;
        }
    });

    console.log(`Total Results: ${results.length}`);
    console.log("Attempt Number Distribution:");
    console.log(JSON.stringify(distribution, null, 2));
    console.log(`Null/Undefined Attempts: ${nullCount}`);

    // Check sample of nulls if exist
    if (nullCount > 0) {
        console.log("Updating NULL attempts to 1 (assuming they are initial seeds)...");
        // Update logic if needed, but let's confirm first.
    }
}

main();
