
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Checking User ID Distribution ---");

    const { data: test } = await supabase
        .from('tests')
        .select('id')
        .like('title', '%Sample Test: ver2%') // Adjust if needed
        .single();

    if (!test) { console.error("Test not found"); return; }

    const { data: results, error } = await supabase
        .from('test_results')
        .select('user_id')
        .eq('test_id', test.id);

    if (error || !results) { console.error("Fetch Error:", error); return; }

    const userCounts: Record<string, number> = {};
    results.forEach(r => {
        userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
    });

    console.log(`Total Results: ${results.length}`);
    console.log(`Unique Users: ${Object.keys(userCounts).length}`);
    console.log("Top Users by Attempt Count:");
    Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Show top 5
        .forEach(([uid, count]) => console.log(`${uid}: ${count}`));
}

main();
