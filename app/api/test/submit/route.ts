import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Database } from '@/types/database';

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const { answers, time_spent, application_id } = body;

        // 1. Fetch Application & Posting Info to get Test ID
        const { data: appData } = await supabase
            .from('applications')
            .select(`
                id, 
                posting_id,
                postings ( site_config )
            `)
            .eq('id', application_id)
            .single();

        const siteConfig = (appData?.postings as any)?.site_config || {};
        const testId = siteConfig.test_id || null;

        // 2. Fetch Questions (server-side score calc)
        const { data: questions } = await supabase
            .from('questions')
            .select('id, correct_answer, score');

        if (!questions) throw new Error('Failed to load questions map');

        // 3. Determine Scoring Logic based on Test Type
        let totalScore = 0;
        let maxScore = 0;
        let detailScores: any = {};

        // Fetch Test Type
        const { data: testData } = await supabase
            .from('tests')
            .select('type, id')
            .eq('id', testId)
            .single();

        const testType = testData?.type || 'APTITUDE';

        // Initialize scoredAnswers array
        let scoredAnswers: any[] = [];

        if (testType === 'PERSONALITY') {
            // --- PERSONALITY SCORING LOGIC ---

            // A. Fetch necessary data: Norms, Competencies
            const [normsResult, competenciesResult] = await Promise.all([
                supabase.from('test_norms').select('*').eq('test_id', testId),
                supabase.from('competencies').select(`
                    name,
                    competency_scales ( scale_name )
                `).eq('test_id', testId)
            ]);

            const norms = normsResult.data || [];
            const competencies = competenciesResult.data || [];

            // Helper to get T-Score
            const calculateTScore = (raw: number, cat: string) => {
                const norm = norms.find(n => n.category_name === cat);
                if (!norm || !norm.std_dev_value || norm.std_dev_value === 0) return 50; // Default to mean if no norm
                return 50 + 10 * ((raw - norm.mean_value) / norm.std_dev_value);
            };

            // B. Calculate Scale Raw Scores
            const scaleRawScores: Record<string, number> = {};

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find(q => q.id === qId);
                if (!question) return null;

                // Assumption: selectedIdx is 0-based index. Score = index + 1.
                // TODO: Implement Reverse Scoring check if needed in future
                const scoreValue = (typeof selectedIdx === 'number' ? selectedIdx : parseInt(selectedIdx)) + 1;

                if (question.scoring_category) { // Assuming we map category from somewhere, or duplicate logic
                    // Wait, we only fetched ID/correct_answer/score from 'questions'.
                    // We need 'category' for personality questions.
                }

                return {
                    question_id: qId,
                    selected_option: selectedIdx,
                    score: scoreValue,
                    category: null // Placeholder, will fill if we fetch categories
                };
            }).filter(Boolean);

            // Re-fetch questions with category for correct grouping
            const { data: qDetails } = await supabase
                .from('questions')
                .select('id, category')
                .in('id', Object.keys(answers));

            const categoryMap = new Map(qDetails?.map(q => [q.id, q.category]) || []);

            // Sum up Scale Raw Scores
            scoredAnswers.forEach((ans: any) => {
                const cat = categoryMap.get(ans.question_id);
                ans.category = cat;
                if (cat) {
                    scaleRawScores[cat] = (scaleRawScores[cat] || 0) + ans.score;
                }
            });

            // C. Calculate Scale T-Scores
            const scaleTScores: Record<string, number> = {};
            Object.entries(scaleRawScores).forEach(([cat, raw]) => {
                scaleTScores[cat] = calculateTScore(raw, cat);
            });

            // D. Calculate Competency Scores
            // Competency Raw = Sum of Scale T-Scores
            const competencyScores: Record<string, { raw: number, t_score: number }> = {};

            competencies.forEach((comp: any) => {
                const scaleNames = comp.competency_scales.map((cs: any) => cs.scale_name);
                let compRaw = 0;
                scaleNames.forEach((sName: string) => {
                    compRaw += (scaleTScores[sName] || 0);
                });

                const compT = calculateTScore(compRaw, comp.name);
                competencyScores[comp.name] = {
                    raw: compRaw,
                    t_score: compT
                };
            });

            // E. Calculate Total Score
            // Total Raw = Sum of Competency T-Scores
            let totalRaw = 0;
            Object.values(competencyScores).forEach(c => {
                totalRaw += c.t_score;
            });
            const totalT = calculateTScore(totalRaw, 'TOTAL');

            totalScore = totalT;
            detailScores = {
                scales: scaleTScores,
                competencies: competencyScores,
                total: { raw: totalRaw, t_score: totalT }
            };

        } else {
            // --- APTITUDE (Legacy) SCORING LOGIC ---

            // Re-fetch questions with category if needed, but for now stick to simple logic
            // Need to fix calculating Max Score properly if possible
            if (testId) {
                const { data: testQs } = await supabase
                    .from('test_questions')
                    .select('questions(score)')
                    .eq('test_id', testId);
                maxScore = testQs?.reduce((acc: number, curr: any) => acc + (curr.questions?.score || 0), 0) || 0;
            }

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find(q => q.id === qId);
                if (!question) return null;

                const isCorrect = question.correct_answer === selectedIdx;
                if (isCorrect) totalScore += question.score;

                return {
                    question_id: qId,
                    selected_option: selectedIdx,
                    is_correct: isCorrect
                };
            }).filter(Boolean);
        }

        // 4. Insert Test Result
        const finalLog = {
            answers: scoredAnswers,
            scoring_breakdown: detailScores
        };

        const { error: resultError } = await supabase
            .from('test_results')
            .insert({
                application_id: application_id,
                total_score: totalScore,
                max_score: maxScore,
                answers_log: finalLog as any, // Cast to any to fit Json type
                completed_at: new Date().toISOString(),
                test_id: testId
            });

        if (resultError) throw resultError;

        // 5. Update Application Status
        await supabase
            .from('applications')
            .update({ status: 'TEST_COMPLETED' })
            .eq('id', application_id);

        return NextResponse.json({ success: true, score: totalScore, max: maxScore, details: detailScores });

    } catch (error: any) {
        console.error('Submit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
