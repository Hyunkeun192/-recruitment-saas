import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const body = await request.json();
        const { answers, time_spent, application_id } = body;

        // 1. Fetch Application & Posting Info to get Test ID
        const { data: appData } = await (supabase
            .from('applications') as any)
            .select(`
                id, 
                posting_id,
                postings ( site_config )
            `)
            .eq('id', application_id)
            .single();

        const siteConfig = (appData as any)?.postings?.site_config || {};
        const testId = siteConfig.test_id || null;

        // 2. Fetch Questions (server-side score calc)
        const { data: questions } = await (supabase
            .from('questions') as any)
            .select('id, correct_answer, score, category');

        if (!questions) throw new Error('Failed to load questions map');

        // 3. Determine Scoring Logic based on Test Type
        let totalScore = 0;
        let maxScore = 0;
        let detailScores: any = {};

        // Fetch Test Type
        const { data: testData } = await (supabase
            .from('tests') as any)
            .select('type, id')
            .eq('id', testId)
            .single();

        const testType = (testData as any)?.type || 'APTITUDE';

        // Initialize scoredAnswers array
        let scoredAnswers: any[] = [];

        if (testType === 'PERSONALITY') {
            // --- PERSONALITY SCORING LOGIC ---

            // A. Fetch necessary data: Norms, Competencies
            const [normsResult, competenciesResult] = await Promise.all([
                (supabase.from('test_norms') as any).select('*').eq('test_id', testId),
                (supabase.from('competencies') as any).select(`
                    id,
                    name,
                    competency_scales ( scale_name )
                `).eq('test_id', testId)
            ]);

            const norms = (normsResult as any).data || [];
            const competencies = (competenciesResult as any).data || [];

            // Helper to get T-Score
            const calculateTScore = (raw: number, cat: string) => {
                const norm = norms.find((n: any) => n.category_name === cat);
                if (!norm || !norm.std_dev_value || norm.std_dev_value === 0) return 50; // Default to mean if no norm
                return 50 + 10 * ((raw - norm.mean_value) / norm.std_dev_value);
            };

            // B. Calculate Scale Raw Scores
            const scaleRawScores: Record<string, number> = {};

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find((q: any) => q.id === qId);
                if (!question) return null;

                // Assumption: selectedIdx is 0-based index. Score = index + 1.
                const scoreValue = (typeof selectedIdx === 'number' ? selectedIdx : parseInt(selectedIdx as string)) + 1;

                return {
                    question_id: qId,
                    selected_option: selectedIdx,
                    score: scoreValue,
                    category: (question as any).category // Use category from question
                };
            }).filter(Boolean);

            // Sum up Scale Raw Scores
            scoredAnswers.forEach((ans: any) => {
                const cat = ans.category;
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
            Object.values(competencyScores).forEach((c: any) => {
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

            if (testId) {
                const { data: testQs } = await (supabase
                    .from('test_questions') as any)
                    .select('questions(score)')
                    .eq('test_id', testId);
                maxScore = testQs?.reduce((acc: number, curr: any) => acc + (curr.questions?.score || 0), 0) || 0;
            }

            scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
                const question = questions.find((q: any) => q.id === qId);
                if (!question) return null;

                const isCorrect = (question as any).correct_answer === selectedIdx;
                if (isCorrect) totalScore += (question as any).score;

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

        const { error: resultError } = await (supabase
            .from('test_results') as any)
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
        await (supabase
            .from('applications') as any)
            .update({ status: 'TEST_COMPLETED' })
            .eq('id', application_id);

        return NextResponse.json({ success: true, score: totalScore, max: maxScore, details: detailScores });

    } catch (error: any) {
        console.error('Submit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
