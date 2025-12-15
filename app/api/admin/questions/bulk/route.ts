import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Define the type here or import if shared
interface QuestionPayload {
    content: string;
    description: string; // Added description
    image_url: string | null;
    options: string[];
    correct_answer: number;
    score: number;
    category: string;
    type: string;
    is_reverse_scored?: boolean;
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();

        // Auth Check (Optional for MVP setup, but recommended)
        // const { data: { session } } = await supabase.auth.getSession();
        // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const questions: QuestionPayload[] = body.questions;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: 'No questions provided' }, { status: 400 });
        }

        // Prepare data for insertion (map to snake_case DB columns if needed, though most match)
        const insertData = questions.map(q => ({
            content: q.content,
            description: q.description, // Added description
            image_url: q.image_url,
            options: q.options, // Handled automatically as JSONB by Supabase
            correct_answer: q.correct_answer,
            score: q.score,
            category: q.category || 'General',
            type: q.type || 'APTITUDE', // Default to APTITUDE if missing
            is_reverse_scored: q.is_reverse_scored || false,
            created_at: new Date().toISOString()
        }));

        const { data, error } = await (supabase
            .from('questions') as any)
            .insert(insertData)
            .select();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: data.length,
            message: `Successfully uploaded ${data.length} questions`
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
