
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugScore() {
    const testName = '김현근 표준 검사';
    const categoryName = '협동성';

    console.log(`Searching for test: ${testName}`);
    const { data: test, error: testError } = await supabase
        .from('tests')
        .select('id, title')
        .ilike('title', `%${testName}%`)
        .single();

    if (testError || !test) {
        console.error('Test not found:', testError);
        return;
    }
    console.log('Test found:', test.id);

    // 1. Get All Norms matching
    console.log(`Fetching all norms related to '${categoryName}'...`);
    const { data: norms, error: normError } = await supabase
        .from('test_norms')
        .select('*')
        .eq('test_id', test.id)
        .ilike('category_name', `%${categoryName}%`); // partial match

    if (normError) {
        console.error('Norms fetch error:', normError);
    } else {
        console.log(`Found ${norms?.length} norms:`);
        norms?.forEach(n => console.log(`- Name: "${n.category_name}", Mean: ${n.mean_value}, Std: ${n.std_dev_value}, Created: ${n.created_at}`));
    }

    // 2. Count Questions for this category (Scale)
    console.log(`Counting questions in DB for category '${categoryName}'...`);

    // We need to check distinct question categories linked to this test
    const { data: testQuestions, error: tqError } = await supabase
        .from('test_questions')
        .select(`
            questions (
                id,
                category,
                content
            )
        `)
        .eq('test_id', test.id);

    if (tqError) {
        console.error('Test Questions error:', tqError);
        return;
    }

    // Filter manually
    const targetQuestions = testQuestions
        ?.map((tq: any) => tq.questions)
        .filter((q: any) => q && q.category === categoryName);

    console.log(`Questions count for category '${categoryName}': ${targetQuestions?.length}`);
    if (targetQuestions && targetQuestions.length > 0) {
        console.log('Sample question:', targetQuestions[0].content);
        // Estimate max raw score (assuming 1-6 scale? or 1-5?)
        // Usually personality is 1-5 or 1-6. Let's say 6.
        console.log(`Estimated Max Raw Score: ${targetQuestions.length * 6}`);
        console.log(`Estimated Min Raw Score: ${targetQuestions.length * 1}`);
    }
}

debugScore();
