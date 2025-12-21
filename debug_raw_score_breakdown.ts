
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Debugging Raw Score Breakdown ---");

    // 1. Find Test
    const { data: test } = await supabase
        .from('tests')
        .select('id, title')
        .like('title', '%Sample Test: ver2%')
        .single();

    if (!test) { console.error("Test not found"); return; }
    console.log(`Test: ${test.title}`);

    // 2. Fetch Latest Result
    const { data: result } = await supabase
        .from('test_results')
        .select('id, answers_log, questions_order, detailed_scores')
        .eq('test_id', test.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

    if (!result) { console.error("Result not found"); return; }
    console.log(`Result ID: ${result.id}`);

    const answers = result.answers_log as Record<string, number>;
    const order = result.questions_order as string[];
    const recordedRawTotal = (result.detailed_scores as any)?.raw_total;

    console.log(`Recorded Raw Total in DB: ${recordedRawTotal}`);
    console.log(`Number of Answers: ${Object.keys(answers).length}`);

    // 3. Fetch Question Details (for Reverse Scoring)
    const { data: questions } = await supabase
        .from('questions')
        .select('id, content, is_reverse_scored')
        .in('id', order);

    if (!questions) { console.error("Questions not found"); return; }

    const qMap = new Map(questions.map(q => [q.id, q]));

    // 4. Re-calculate Sum
    let calcSum = 0;
    let reverseCount = 0;
    let normalCount = 0;

    console.log("\n--- Item Breakdown (Sample) ---");

    order.forEach((qId, idx) => {
        const q = qMap.get(qId);
        if (!q) return;

        const rawAnswer = answers[idx] || answers[idx.toString()];
        if (rawAnswer === undefined) return;

        let finalScore = rawAnswer;
        let isReverse = false;

        if (q.is_reverse_scored) {
            finalScore = 6 - rawAnswer;
            isReverse = true;
            reverseCount++;
        } else {
            normalCount++;
        }

        calcSum += finalScore;

        // Show first 5 items as example
        if (idx < 5) {
            console.log(`Q${idx + 1}] Ans: ${rawAnswer} ${isReverse ? '(Reverse)' : ''} -> Score: ${finalScore}`);
        }
    });

    console.log("...");
    console.log("\n--- Summary ---");
    console.log(`Normal Items: ${normalCount}`);
    console.log(`Reverse Items: ${reverseCount}`);
    console.log(`Total Items Scored: ${normalCount + reverseCount}`);
    console.log(`Calculated Sum: ${calcSum}`);

    if (Math.abs(calcSum - 155) < 0.01) {
        console.log("✅ MATCH: The calculated sum matches 155.");
    } else {
        console.log(`❌ MISMATCH: Calculated ${calcSum} vs Record 155.`);
    }
}

main();
