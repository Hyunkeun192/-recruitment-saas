'use server';

import { createClient } from '@/lib/supabase/server';

export type AdminCommentItem = {
    id: string;
    content_id: string;
    content_title: string;
    user_id: string;
    user_name: string;
    user_email: string;
    content: string;
    is_secret: boolean;
    created_at: string;
    has_reply: boolean;
};

export async function getAllCommentsForAdmin(): Promise<AdminCommentItem[]> {
    const supabase = createClient();

    // Check Admin
    const { data: { user } } = await (await supabase).auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch all root comments (parent_id is null)
    // Join with admin_contents to get title
    // Join with users to get author info
    // Left join with comments (self) to check if reply exists

    const { data, error } = await (await supabase)
        .from('admin_content_comments')
        .select(`
            id,
            content_id,
            content,
            is_secret,
            created_at,
            user_id,
            admin_contents!inner (title),
            users (full_name, email),
            replies:admin_content_comments(id)
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching admin comments:', error);
        return [];
    }

    // Transform data
    return data.map((item: any) => ({
        id: item.id,
        content_id: item.content_id,
        content_title: item.admin_contents?.title || 'Unknown Content',
        user_id: item.user_id,
        user_name: item.users?.full_name || 'Unknown',
        user_email: item.users?.email || '',
        content: item.content,
        is_secret: item.is_secret,
        created_at: item.created_at,
        has_reply: item.replies && item.replies.length > 0
    }));
}
