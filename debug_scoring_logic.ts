
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Debugging Scoring Logic ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%')
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Test: ${test.title} (${test.id})`);

    // 2. Look for "수용하는 전문성" (Accepting Expertise)
    console.log("\nChecking '수용하는 전문성'...");

    // Check if it's a Competency
    const { data: competency } = await supabase
        .from('competencies')
        .select('id, name, competency_scales ( scale_name )')
        .eq('test_id', test.id)
        .eq('name', '수용하는 전문성')
        .maybeSingle();

    if (competency) {
        console.log(`[Competency Found] Name: ${competency.name}`);
        console.log("Member Scales:", competency.competency_scales.map((cs: any) => cs.scale_name));
    } else {
        console.log("[Competency Not Found] '수용하는 전문성' is not a defined competency name.");
    }

    // Check if it's a Scale (category in norms)
    const { data: norm } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id)
        .eq('category_name', '수용하는 전문성')
        .maybeSingle();

    if (norm) {
        console.log(`[Norm Found] Category: ${norm.category_name}, Mean: ${norm.mean_value}, SD: ${norm.std_dev_value}`);
    } else {
        console.log("[Norm Not Found] No norm row for '수용하는 전문성'.");
    }

    // 3. Fetch Latest Result to see calculated values
    const { data: result } = await supabase
        .from('test_results')
        .select('detailed_scores, total_score, t_score')
        .eq('test_id', test.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

    if (result) {
        console.log("\n--- Latest Result Data ---");
        console.log(`Total Score (Col): ${result.total_score}`);
        console.log(`T-Score (Col): ${result.t_score}`);

        const details = result.detailed_scores as any;
        console.log("Total Details:", details.total);

        if (competency) {
            console.log(`Competency '${competency.name}' Score:`, details.competencies?.[competency.name]);

            // Show scores of member scales
            const memberScales = competency.competency_scales.map((cs: any) => cs.scale_name);
            console.log("Member Scale Scores:");
            memberScales.forEach((s: string) => {
                console.log(` - ${s}:`, details.scales?.[s]);
            });
        }
    }
}

main();
