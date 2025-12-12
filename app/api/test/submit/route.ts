import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const supabase = createServerSupabaseClient();
        const body = await request.json();
        const { answers, time_spent, application_id } = body;

        // 1. Fetch Questions to Calculate Score (Server-side validation)
        const { data: questions } = await supabase
            .from('questions')
            .select('id, correct_answer, score');

        if (!questions) throw new Error('Failed to load questions map');

        let totalScore = 0;
        const maxScore = questions.reduce((acc, q) => acc + q.score, 0);

        // Calculate Score
        const scoredAnswers = Object.entries(answers).map(([qId, selectedIdx]) => {
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

        // 2. Insert Test Result
        const { error: resultError } = await supabase
            .from('test_results')
            .insert({
                application_id: application_id, // In real app, validate this ID belongs to user
                total_score: totalScore,
                max_score: maxScore,
                answers_log: scoredAnswers,
                completed_at: new Date().toISOString()
            });

        if (resultError) throw resultError;

        // 3. Update Application Status
        await supabase
            .from('applications')
            .update({ status: 'TEST_COMPLETED' })
            .eq('id', application_id);

        return NextResponse.json({ success: true, score: totalScore, max: maxScore });

    } catch (error: any) {
        console.error('Submit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
