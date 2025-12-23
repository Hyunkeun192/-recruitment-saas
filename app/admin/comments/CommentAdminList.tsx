'use client';

import { useState } from 'react';
import { AdminCommentItem } from './actions';
import { MessageCircle, Search, Filter, Lock, ExternalLink, CornerDownRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CommentResponseModal from './CommentResponseModal';

export default function CommentAdminList({ initialComments }: { initialComments: AdminCommentItem[] }) {
    const router = useRouter();
    const [selectedComment, setSelectedComment] = useState<AdminCommentItem | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'UNANSWERED'>('ALL');

    const filteredComments = initialComments.filter(c => {
        if (filter === 'UNANSWERED') return !c.has_reply;
        return true;
    });

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        댓글 관리
                        <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-1 rounded-full">{filteredComments.length}</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">사용자가 남긴 질문과 의견을 관리합니다.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'ALL'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-500 border hover:bg-slate-50'
                            }`}
                    >
                        전체
                    </button>
                    <button
                        onClick={() => setFilter('UNANSWERED')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'UNANSWERED'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-500 border hover:bg-slate-50'
                            }`}
                    >
                        미답변
                    </button>
                </div>
            </header>

            <div className="grid gap-4">
                {filteredComments.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <MessageCircle className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-400 font-medium">표시할 댓글이 없습니다.</p>
                    </div>
                ) : (
                    filteredComments.map(comment => (
                        <div key={comment.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${comment.has_reply ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {comment.has_reply ? 'ANSWERED' : 'WAITING'}
                                    </span>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <span>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</span>
                                        <span>·</span>
                                        <span className="truncate max-w-[150px] font-medium text-slate-600" title={comment.content_title}>
                                            {comment.content_title}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    href={`/u-class/${comment.content_id}`}
                                    target="_blank"
                                    className="text-slate-300 hover:text-indigo-500 transition-colors"
                                    title="글 보러가기"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-slate-800 text-sm">{comment.user_name}</span>
                                        <span className="text-xs text-slate-400">({comment.user_email})</span>
                                        {comment.is_secret && <Lock size={12} className="text-slate-400" />}
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                </div>

                                <button
                                    onClick={() => setSelectedComment(comment)}
                                    className="h-fit px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors whitespace-nowrap self-center"
                                >
                                    답변하기
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedComment && (
                <CommentResponseModal
                    comment={selectedComment}
                    onClose={() => setSelectedComment(null)}
                    onSuccess={() => {
                        setSelectedComment(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
