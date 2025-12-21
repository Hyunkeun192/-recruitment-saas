
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Checking test_norms Table for Sample Test: ver2 ---");

    // 1. Find Test ID
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%')
        .single();
    if (!test) { console.error("Test not found"); return; }
    console.log(`Test: ${test.title} (${test.id})`);

    // 2. Fetch Stored Norms
    const { data: norms, error } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id);

    if (error) { console.error("Fetch Error:", error); return; }

    console.log(`\nFound ${norms.length} norm records.`);

    const totalNorm = norms.find(n => n.category_name === 'TOTAL');
    const compNorm = norms.find(n => n.category_name !== 'TOTAL' && n.category_name !== 'SCALE');
    // Just grab the first competency found

    // Print all to be safe?
    console.log("\n--- STORED NORMS ---");
    norms.forEach(n => {
        if (n.category_name === 'TOTAL' || n.category_name === '수용하는 전문성') {
            console.log(`[${n.category_name}] Mean: ${n.mean_value}, StdDev: ${n.std_dev_value}`);
        }
    });
}

main();
