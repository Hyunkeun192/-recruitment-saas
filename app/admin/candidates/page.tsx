'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Users, ArrowLeft, Check, X, ChevronRight } from 'lucide-react';
import InviteGuestModal from '@/components/admin/InviteGuestModal';
import ApplicationDetail from '@/components/admin/ApplicationDetail';
import { toast, Toaster } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostingStat {
    id: string;
    title: string;
    applicant_count: number;
}

interface CandidateResult {
    id: string; // application id
    name: string;
    email: string;
    applied_at: string;
    test_score: number;
    guest_avg_score: number | null;
    status: string; // ApplicationStatus string
    application_data?: any; // Full data for drawer
    resume_url?: string;
    portfolio_url?: string;
    custom_answers?: any;
}

// Stage Filter Mapping
const STAGE_FILTERS = {
    ALL: 'ALL',
    DOCUMENT: 'DOCUMENT',
    TEST: 'TEST',
    INTERVIEW: 'INTERVIEW',
    FINAL: 'FINAL'
};

export default function CandidatesPage() {
    const [loading, setLoading] = useState(true);
    const [postings, setPostings] = useState<PostingStat[]>([]);

    // Navigation State
    const [viewingPostingId, setViewingPostingId] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<CandidateResult[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [activeTab, setActiveTab] = useState(STAGE_FILTERS.ALL);

    // Modal & Drawer State
    const [inviteModalPostingId, setInviteModalPostingId] = useState<string | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null); // For detail view

    useEffect(() => {
        fetchPostings();
    }, []);

    useEffect(() => {
        if (viewingPostingId) {
            fetchCandidates(viewingPostingId);
        }
    }, [viewingPostingId]);

    async function fetchPostings() {
        const { data: rawPostings } = await supabase.from('postings').select('id, title');
        if (!rawPostings) return;

        const stats = await Promise.all(rawPostings.map(async (p) => {
            const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('posting_id', p.id);
            return { id: p.id, title: p.title, applicant_count: count || 0 };
        }));

        setPostings(stats);
        setLoading(false);
    }

    async function fetchCandidates(postingId: string) {
        setLoadingCandidates(true);
        // Fetch full data for detail view as well
        const { data: apps, error } = await supabase
            .from('applications')
            .select(`
        id, created_at, status, name,
        application_data, custom_answers, resume_url, portfolio_url,
        users ( full_name, email ),
        test_results ( total_score ),
        evaluation_scores ( weighted_average )
      `)
            .eq('posting_id', postingId)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('지원자 목록을 불러오지 못했습니다.');
            setLoadingCandidates(false);
            return;
        }

        const formatted: CandidateResult[] = apps.map((app: any) => {
            let avgGuest = null;
            if (app.evaluation_scores && app.evaluation_scores.length > 0) {
                const sum = app.evaluation_scores.reduce((acc: number, curr: any) => acc + curr.weighted_average, 0);
                avgGuest = Math.round(sum / app.evaluation_scores.length);
            }

            return {
                id: app.id,
                name: app.name || app.users?.full_name || '알 수 없음',
                email: app.users?.email || '',
                applied_at: app.created_at,
                test_score: app.test_results?.[0]?.total_score || 0,
                guest_avg_score: avgGuest,
                status: app.status,
                // Pass full data for detail view
                application_data: app.application_data,
                resume_url: app.resume_url,
                portfolio_url: app.portfolio_url,
                custom_answers: app.custom_answers
            };
        });

        setCandidates(formatted);
        setLoadingCandidates(false);
    }

    // Filter Logic
    const filteredCandidates = candidates.filter(c => {
        if (activeTab === STAGE_FILTERS.ALL) return true;

        if (activeTab === STAGE_FILTERS.DOCUMENT) {
            return ['APPLIED', 'SUBMITTED'].includes(c.status);
        }
        if (activeTab === STAGE_FILTERS.TEST) {
            return ['DOCUMENT_PASS', 'TEST_PENDING', 'TEST_COMPLETED'].includes(c.status);
        }
        if (activeTab === STAGE_FILTERS.INTERVIEW) {
            return ['TEST_PASS', 'INTERVIEW'].includes(c.status);
        }
        if (activeTab === STAGE_FILTERS.FINAL) {
            return ['INTERVIEW_PASS', 'HIRED'].includes(c.status);
        }
        return false;
    });

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const res = await fetch('/api/admin/candidates/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ application_id: id, status: newStatus })
        });

        if (!res.ok) {
            const err = await res.json();
            toast.error(err.error || '업데이트 실패');
            return;
        }

        toast.success('상태가 업데이트되었습니다.');
        // Optimistic Update
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

        // If we are in detail view, we might want to update the selected candidate status too
        if (selectedCandidate && selectedCandidate.id === id) {
            setSelectedCandidate(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    // Render Action Buttons based on Stage
    const renderActions = (candidate: CandidateResult) => {
        const s = candidate.status;

        if (s === 'REJECTED') return <Badge variant="outline" className="text-red-500 border-red-200">불합격</Badge>;
        if (s === 'HIRED') return <Badge variant="outline" className="text-green-600 border-green-200">최종합격</Badge>;

        if (['APPLIED', 'SUBMITTED'].includes(s)) {
            return (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'REJECTED'); }}>
                        탈락
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'DOCUMENT_PASS'); }}>
                        서류 합격 <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            );
        }

        if (['DOCUMENT_PASS', 'TEST_PENDING', 'TEST_COMPLETED'].includes(s)) {
            return (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'REJECTED'); }}>
                        탈락
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'TEST_PASS'); }}>
                        필기 합격 <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            );
        }

        if (['TEST_PASS', 'INTERVIEW'].includes(s)) {
            return (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'REJECTED'); }}>
                        탈락
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(candidate.id, 'HIRED'); }}>
                        최종 합격 <Check className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            );
        }

        return <Badge variant="secondary">{s}</Badge>;
    };



    return (
        <div className="space-y-6">
            <Toaster position="top-right" richColors />

            {/* Always show the main content (Posting List or Candidate List) */}
            {!viewingPostingId ? (
                // --- Posting List View ---
                <>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">채용 현황 및 결과</h1>
                            <p className="text-slate-500">결과를 확인하고 평가할 채용 공고를 선택하세요.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {postings.map(posting => (
                                <div key={posting.id} className="bg-white rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingPostingId(posting.id)}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Users size={20} />
                                        </div>
                                        <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-full">진행중</span>
                                    </div>

                                    <h3 className="font-semibold text-slate-800 text-lg mb-1">{posting.title}</h3>
                                    <p className="text-slate-500 text-sm mb-6">지원자 {posting.applicant_count}명</p>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setInviteModalPostingId(posting.id); }}
                                            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors border flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} /> 외부 평가 초대
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setViewingPostingId(posting.id); }}
                                            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                                        >
                                            결과 보기
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                // --- Candidate List Table View ---
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <button
                        onClick={() => setViewingPostingId(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                    >
                        <ArrowLeft size={18} /> 목록으로 돌아가기
                    </button>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {postings.find(p => p.id === viewingPostingId)?.title || '채용 공고'} - 전형 관리
                            </h2>
                            <p className="text-sm text-slate-500">단계별 전형 진행 및 평가를 관리합니다.</p>
                        </div>
                        <button
                            onClick={() => setInviteModalPostingId(viewingPostingId)}
                            className="bg-white border text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> 평가자 초대하기
                        </button>
                    </div>

                    <Tabs defaultValue={STAGE_FILTERS.ALL} value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-6 bg-slate-100 p-1">
                            <TabsTrigger value={STAGE_FILTERS.ALL}>전체보기</TabsTrigger>
                            <TabsTrigger value={STAGE_FILTERS.DOCUMENT}>서류전형</TabsTrigger>
                            <TabsTrigger value={STAGE_FILTERS.TEST}>필기전형</TabsTrigger>
                            <TabsTrigger value={STAGE_FILTERS.INTERVIEW}>면접전형</TabsTrigger>
                            <TabsTrigger value={STAGE_FILTERS.FINAL}>최종합격</TabsTrigger>
                        </TabsList>

                        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                            {loadingCandidates ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-6 py-4">지원자 성명</th>
                                            <th className="px-6 py-4">지원일</th>
                                            <th className="px-6 py-4">현재 상태</th>
                                            <th className="px-6 py-4 text-center">점수(필기/면접)</th>
                                            <th className="px-6 py-4 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredCandidates.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                                                    해당 단계의 지원자가 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCandidates.map(candidate => (
                                                <tr
                                                    key={candidate.id}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedCandidate(candidate)}
                                                >
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {candidate.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {new Date(candidate.applied_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {/* Status Badge */}
                                                        <Badge variant="outline" className="bg-slate-50 font-normal">
                                                            {candidate.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-slate-600">
                                                        {candidate.test_score > 0 ? `${candidate.test_score}점` : '-'}
                                                        {" / "}
                                                        {candidate.guest_avg_score ? `${candidate.guest_avg_score}점` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {renderActions(candidate)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Tabs>
                </div>
            )}

            {/* Application Detail Modal (Popup) */}
            <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50">
                    <ScrollArea className="flex-1 h-full">
                        <div className="p-1">
                            <ApplicationDetail
                                application={selectedCandidate}
                                onBack={() => setSelectedCandidate(null)}
                                onStatusUpdate={handleStatusUpdate}
                                isModal={true}
                            />
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {inviteModalPostingId && (
                <InviteGuestModal
                    postingId={inviteModalPostingId}
                    isOpen={true}
                    onClose={() => setInviteModalPostingId(null)}
                />
            )}
        </div>
    );
}
