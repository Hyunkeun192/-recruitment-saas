import { getAllCommentsForAdmin } from './actions';
import CommentAdminList from './CommentAdminList';

export const dynamic = 'force-dynamic';

export default async function AdminCommentsPage() {
    const comments = await getAllCommentsForAdmin();

    return <CommentAdminList initialComments={comments} />;
}
