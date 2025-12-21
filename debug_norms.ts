
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Find Test ID
    const { data: test, error: tError } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%') // Adjust if title is different
        .single();

    if (tError || !test) {
        console.error("Test not found:", tError);
        return;
    }
    console.log(`Test Found: ${test.title} (${test.id})`);

    // 2. Fetch Norms
    const { data: norms, error: nError } = await supabase
        .from('test_norms')
        .select('category_name, mean_value, std_dev_value')
        .eq('test_id', test.id)
        .order('category_name');

    if (nError) {
        console.error("Norms error:", nError);
        return;
    }

    console.log("\n--- Norms (Category / Mean / SD) ---");
    norms.forEach(n => {
        console.log(`[${n.category_name}] Mean: ${n.mean_value}, SD: ${n.std_dev_value}`);
    });

    // 3. Find latest result for this test
    const { data: result, error: rError } = await supabase
        .from('test_results')
        .select('id, total_score, detailed_scores, completed_at')
        .eq('test_id', test.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

    if (result) {
        console.log("\n--- Latest Result ---");
        console.log("ID:", result.id);
        console.log("Total Score (Col):", result.total_score);
        console.log("Detailed Total:", (result.detailed_scores as any)?.total);
        console.log("Detailed Scales Sample:", Object.entries((result.detailed_scores as any)?.scales || {}).slice(0, 3));
    }
}

main();
