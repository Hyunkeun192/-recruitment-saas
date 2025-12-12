'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Search, FileText, FileSpreadsheet } from 'lucide-react';
import ExcelUpload from '@/components/admin/ExcelUpload';
import QuestionModal from '@/components/admin/QuestionModal';
import { Toaster, toast } from 'sonner';

/**
 * 문제 관리 페이지
 * 
 * 개별 문제에 대한 CRUD 기능과 엑셀 대량 업로드 기능을 제공합니다.
 * 탭을 통해 '목록 보기'와 '대량 업로드' 모드를 전환합니다.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useRouter, useSearchParams } from 'next/navigation';

export default function QuestionsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initial State derived from URL or default
    const getInitialTab = () => {
        const tab = searchParams.get('tab');
        if (tab === 'APTITUDE' || tab === 'PERSONALITY') return tab;
        return 'APTITUDE';
    };

    const [activeTab, setActiveTabState] = useState<'APTITUDE' | 'PERSONALITY'>(getInitialTab());
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Sync state when URL changes (e.g. back button or sidebar click)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'APTITUDE' || tab === 'PERSONALITY') {
            setActiveTabState(tab);
        } else {
            // If no tab in URL, ensure default is chosen but don't force push
            setActiveTabState('APTITUDE');
        }
    }, [searchParams]);

    // Wrapper to update both State and URL
    const setActiveTab = (tab: 'APTITUDE' | 'PERSONALITY') => {
        setActiveTabState(tab);
        router.push(`/admin/questions?tab=${tab}`);
    };

    const fetchQuestions = async () => {
        setLoading(true);
        const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
        setQuestions(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        await supabase.from('questions').delete().eq('id', id);
        toast.success('삭제되었습니다.');
        setQuestions(questions.filter(q => q.id !== id));
    };

    const filteredQuestions = questions.filter(q => {
        // If question type is missing (legacy), assume APTITUDE
        const qType = q.type || 'APTITUDE';
        return qType === activeTab;
    });

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {activeTab === 'APTITUDE' ? '적성검사 문제 관리' : '인성검사 문제 관리'}
                    </h1>
                    <p className="text-slate-500">
                        {activeTab === 'APTITUDE' ? '지원자의 직무 능력을 평가하는 적성검사 문제입니다.' : '지원자의 성향을 파악하는 인성검사 문제입니다.'}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* 검색 / 필터 */}
                <div className="p-4 border-b flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="문제 내용 검색..." />
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                    >
                        <FileSpreadsheet size={16} /> 엑셀로 업로드
                    </button>
                    <button
                        onClick={() => setIsQuestionModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                    >
                        <Plus size={16} /> 새 문제 추가
                    </button>
                </div>

                <QuestionModal
                    isOpen={isQuestionModalOpen}
                    onClose={() => setIsQuestionModalOpen(false)}
                    defaultType={activeTab} // Pass current tab as default type
                    onSuccess={() => {
                        fetchQuestions();
                        setIsQuestionModalOpen(false);
                    }}
                />

                {/* Excel Upload Modal */}
                <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>엑셀 대량 업로드 ({activeTab === 'APTITUDE' ? '적성검사' : '인성검사'})</DialogTitle>
                        </DialogHeader>
                        <ExcelUpload
                            defaultType={activeTab}
                            onSuccess={() => {
                                fetchQuestions();
                                setIsUploadModalOpen(false);
                            }}
                        />
                    </DialogContent>
                </Dialog>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">로딩 중...</div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>등록된 {activeTab === 'APTITUDE' ? '적성검사' : '인성검사'} 문제가 없습니다.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-4 pl-6">카테고리</th>
                                <th className="p-4">난이도</th>
                                <th className="p-4 w-1/2">질문</th>
                                <th className="p-4 text-right pr-6">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                            {filteredQuestions.map(q => (
                                <tr key={q.id} className="hover:bg-slate-50">
                                    <td className="p-4 pl-6">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">{q.category}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs 
                        ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'Hard' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="p-4 truncate max-w-md" title={q.content?.question || ''}>
                                        {q.content?.question || q.content || '(질문 내용 없음)'}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-600 p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
