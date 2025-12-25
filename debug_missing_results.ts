
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMissingResults() {
    console.log("🔍 Debugging Missing Results...");

    const emails = ['paycmh@gmail.com', 'prodaum6660@gmail.com'];

    // 1. Check Users
    const { data: users, error: uErr } = await supabase
        .from('users')
        .select('*')
        .in('email', emails);

    if (uErr) {
        console.error("Error fetching users:", uErr);
        return;
    }

    console.log("\n👤 User Information:");
    users?.forEach(u => {
        console.log(`- Email: ${u.email}, ID: ${u.id}, Role: ${u.role}, Name: ${u.full_name}`);
    });

    if (!users || users.length === 0) {
        console.log("No users found with these emails.");
        return;
    }

    const userIds = users.map(u => u.id);

    // 2. Check Test Results
    const { data: results, error: rErr } = await supabase
        .from('test_results')
        .select('id, user_id, test_id, completed_at, total_score, detailed_scores')
        .in('user_id', userIds);

    if (rErr) {
        console.error("Error fetching results:", rErr);
        return;
    }

    console.log("\n📝 Test Results Found:");
    results?.forEach(r => {
        console.log(`- Result ID: ${r.id}, User ID: ${r.user_id}, Test ID: ${r.test_id}, Completed: ${r.completed_at}, Score: ${r.total_score}`);
    });

    if (!results || results.length === 0) {
        console.log("No test results found for these users.");
    }
}

debugMissingResults();
