
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Debugging Single Competency Score Discrepancy ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('*') // Need norms from here? Or allow separate query
        .like('title', '%Sample Test: ver2%')
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Test: ${test.title} (${test.id})`);

    // 2. Extract Norms
    // Norms are typically stored in 'competency_formulas' or similar, depending on implementation.
    // Wait, recent changes might store them in 'norm_stats' jsonb column on tests? 
    // Or 'competencies' table?
    // Let's check where norms are.
    // Based on previous files, admin page saves to `test.norm_stats` column? Or `competency_formulas`?
    // Let's inspect test object keys first.

    // Actually, let's fetch results first to see the values.
    const { data: result } = await supabase
        .from('test_results')
        .select('detailed_scores, total_score')
        .eq('test_id', test.id)
        .eq('attempt_number', 1)
        .limit(1)
        .single();

    if (!result) { console.log("No result found."); return; }

    const details = result.detailed_scores as any;
    console.log("\n--- Result Data ---");
    console.log("Raw Total (from details):", details.raw_total);
    console.log("Total Score (T-Score):", result.total_score);
    console.log("Competencies:", JSON.stringify(details.competencies, null, 2));

    // 3. Check Norms
    // We assume 'competency_stats' or similar column in 'tests' or relation.
    // Let's look at `tests` table structure again if needed, but let's dump `test` fields related to stats.
    console.log("\n--- Test Norm Config ---");
    // Depending on schema, it might be in `formulas` or `norm_settings`.
    // Let's print likely candidates.
    console.log("norm_stats:", (test as any).norm_stats);

    // If we can't find it easily, we'll probe.
}

main();
