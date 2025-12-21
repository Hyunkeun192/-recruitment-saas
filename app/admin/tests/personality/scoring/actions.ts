'use server';

import { createClient } from '@supabase/supabase-js';

// We use the Service Role Key here to bypass RLS.
// This is critical because "Norms" are calculated from ALL users' data,
// but RLS typically prevents one user (even admin) from seeing other users' raw test results
// unless an explicit policy exists.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function fetchTestResultsForNorms(testId: string, startDate: string, endDate: string) {
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment details missing for Service Role');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('test_results')
            .select('detailed_scores')
            .eq('test_id', testId)
            .eq('attempt_number', 1) // Only use the FIRST attempt for norms
            // Ensure we capture the full day for end date
            .gte('completed_at', startDate + 'T00:00:00Z')
            .lte('completed_at', endDate + 'T23:59:59Z');

        if (error) {
            console.error('Fetch Error:', error);
            throw new Error(error.message);
        }

        return { data };
    } catch (e: any) {
        console.error('Server Action Error:', e);
        return { error: e.message };
    }
}

export async function fetchTestsAction() {
    console.log("--> fetchTestsAction called");
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Env Vars:", { url: !!supabaseUrl, key: !!supabaseServiceKey });
        throw new Error('Supabase environment details missing for Service Role');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('tests')
            .select('*')
            .eq('type', 'PERSONALITY')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch Tests Error:', error);
            throw new Error(error.message);
        }
        console.log("--> fetchTestsAction details", data?.length, data);

        return { data };
    } catch (e: any) {
        console.error('Server Action Error:', e);
        return { error: e.message };
    }
}
