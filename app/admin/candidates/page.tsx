'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, FileText, Search, User, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReportContent from "@/components/report/ReportContent";

export const dynamic = 'force-dynamic';

interface TestResult {
    id: string;
    test_id: string;
    test_title?: string;
    test_type?: 'APTITUDE' | 'PERSONALITY';
    total_score: number;
    t_score?: number;
    completed_at: string | null;
    attempt_number: number;
}

interface Candidate {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    results: TestResult[];
}

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Report Modal State
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportOwnerName, setReportOwnerName] = useState<string>('');
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // 1. Fetch Candidates (role = 'CANDIDATE')
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'CANDIDATE')
                .order('created_at', { ascending: false });

            if (userError) throw userError;

            const userIds = users.map(u => u.id);
            if (userIds.length === 0) {
                setCandidates([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Test Results
            const { data: results, error: resError } = await supabase
                .from('test_results')
                .select(`
                    id, user_id, test_id, total_score, t_score, completed_at, attempt_number,
                    tests ( title, type )
                `)
                .in('user_id', userIds)
                .order('created_at', { ascending: false });

            if (resError) throw resError;

            // Map results to users
            const formatted: Candidate[] = users.map(user => {
                const userResults = results
                    .filter(r => r.user_id === user.id)
                    .map((r: any) => ({
                        id: r.id,
                        test_id: r.test_id,
                        test_title: r.tests?.title,
                        test_type: r.tests?.type,
                        total_score: r.total_score,
                        t_score: r.t_score,
                        completed_at: r.completed_at,
                        attempt_number: r.attempt_number ?? 1
                    }));

                return {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    created_at: user.created_at,
                    results: userResults
                };
            });

            setCandidates(formatted);

        } catch (error: any) {
            console.error(error);
            toast.error('지원자 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReport = async (resultId: string, ownerName: string) => {
        setSelectedReportId(resultId);
        setReportOwnerName(ownerName);
        setLoadingReport(true);
        setReportData(null);

        try {
            // 1. Fetch detailed result
            const { data: result, error: rErr } = await supabase
                .from("test_results")
                .select(`
                    id, total_score, completed_at, detailed_scores, answers_log, questions_order, test_id, user_id,
                    tests ( id, title, type, description )
                `)
                .eq("id", resultId)
                .single();
            if (rErr) throw rErr;

            // 2. Fetch metadata (competencies, norms, questions) needed for report
            const [compRes, qRes, normsRes, historyRes] = await Promise.all([
                supabase.from("competencies").select(`id, name, description, competency_scales(scale_name)`).eq("test_id", result.test_id),
                supabase.from("test_questions").select('is_practice, questions(*)').eq('test_id', result.test_id),
                supabase.from("test_norms").select('*').eq('test_id', result.test_id),
                supabase.from("test_results").select('id, total_score, completed_at, detailed_scores, attempt_number')
                    .eq("test_id", result.test_id).eq("user_id", result.user_id).order("completed_at", { ascending: true })
            ]);

            const normsMap = new Map((normsRes.data || []).map((n: any) => [n.category_name, n]));

            const questionsMap: Record<string, any> = {};
            const practiceIds = new Set<string>();
            qRes.data?.forEach((r: any) => {
                const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
                if (q) {
                    questionsMap[q.id] = q;
                    if (r.is_practice) practiceIds.add(q.id);
                }
            });

            const answers = (result.answers_log as Record<string, number>) || {};
            const qOrder = (result.questions_order as string[]) || [];
            const validQOrder = qOrder.filter((qid: string) => !practiceIds.has(qid));

            const trendData = (historyRes.data || []).map((r: any, idx: number) => {
                const detailedTotal = (r.detailed_scores as any)?.total;
                let score = typeof detailedTotal === 'number' ? detailedTotal : detailedTotal?.t_score;
                if (score === undefined || score === null) score = r.total_score || 0;

                return {
                    id: r.id, index: idx + 1, score: Number(score.toFixed(1)),
                    date: new Date(r.completed_at!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                    isCurrent: r.id === resultId
                };
            });

            setReportData({
                result,
                competencies: compRes.data || [],
                questionsMap,
                answers,
                qOrder: validQOrder, // Ensure practice questions are filtered for report logic
                normMap: normsMap,
                trends: trendData
            });

        } catch (e) {
            console.error(e);
            toast.error("리포트 데이터를 불러오는데 실패했습니다.");
            setSelectedReportId(null);
        } finally {
            setLoadingReport(false);
        }
    };

    const filteredCandidates = candidates.filter(c =>
    (c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getScoreDisplay = (results: TestResult[], type: 'APTITUDE' | 'PERSONALITY') => {
        const target = results.find(r => r.test_type === type && r.completed_at);
        if (!target) return <span className="text-slate-300">-</span>;

        const score = type === 'PERSONALITY' ? (target.t_score ?? target.total_score) : target.total_score;

        return (
            <div className="flex flex-col items-center">
                <span className={`font-bold ${score >= 60 ? 'text-blue-600' : 'text-slate-700'}`}>
                    {score}점
                </span>
                <span className="text-[10px] text-slate-400 max-w-[80px] truncate" title={target.test_title}>
                    {target.test_title}
                </span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Toaster position="top-right" richColors />

            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">전체 지원자 현황</h1>
                    <p className="text-slate-500">가입된 모든 응시자의 목록과 검사 결과를 확인합니다.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            placeholder="이름 또는 이메일 검색"
                            className="pl-10 pr-4 py-2 border rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-slate-500">
                        총 <span className="font-bold text-slate-900">{filteredCandidates.length}</span>명
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center text-slate-400">Loading...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">지원자 성명</th>
                                <th className="px-6 py-4">이메일</th>
                                <th className="px-6 py-4">가입일</th>
                                <th className="px-6 py-4 text-center">인성검사</th>
                                <th className="px-6 py-4 text-center">적성검사</th>
                                <th className="px-6 py-4 text-right">리포트</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map(candidate => {
                                    // Collect all completed tests
                                    const completedTests = candidate.results.filter(r => r.completed_at);

                                    return (
                                        <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                {candidate.full_name || '이름 없음'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {candidate.email}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(candidate.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getScoreDisplay(candidate.results, 'PERSONALITY')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getScoreDisplay(candidate.results, 'APTITUDE')}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col gap-1 items-end">
                                                    {completedTests.length === 0 ? (
                                                        <span className="text-xs text-slate-400">응시 이력 없음</span>
                                                    ) : (
                                                        completedTests.map(r => (
                                                            <button
                                                                key={r.id}
                                                                onClick={() => handleOpenReport(r.id, candidate.full_name || candidate.email)}
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                                            >
                                                                <FileText size={12} />
                                                                {r.test_title} ({r.attempt_number}회차)
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Report Modal */}
            <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
                    <div className="px-6 py-4 border-b bg-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-800">
                                {reportOwnerName ? `${reportOwnerName}님의 My Value Report` : "My Value Report"}
                            </h2>
                            {reportData?.result?.completed_at && (
                                <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-md">
                                    응시일: {new Date(reportData.result.completed_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {/* Native Close is handled by Dialog primitives usually, but extra close button is fine too */}
                    </div>

                    <ScrollArea className="flex-1 h-full bg-slate-50">
                        <div className="p-6">
                            {loadingReport ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                                    <p>리포트를 불러오는 중입니다...</p>
                                </div>
                            ) : reportData ? (
                                <ReportContent
                                    {...reportData}
                                    isAdmin={true}
                                />
                            ) : (
                                <div className="py-20 text-center text-slate-400">
                                    데이터를 불러올 수 없습니다.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

