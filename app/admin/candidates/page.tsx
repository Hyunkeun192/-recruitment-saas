'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, FileText, Search, User } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface TestResult {
    id: string;
    test_id: string;
    test_title?: string;
    test_type?: 'APTITUDE' | 'PERSONALITY';
    total_score: number;
    t_score?: number;
    completed_at: string | null;
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

            // 2. Fetch Test Results for these users
            // We fetch all relevant results and map them. 
            // Optimization: If users list is huge, this might need pagination or careful querying.
            // For now, fetching all results for displayed users is acceptable.

            const userIds = users.map(u => u.id);

            if (userIds.length === 0) {
                setCandidates([]);
                setLoading(false);
                return;
            }

            // Using 'in' query for results
            const { data: results, error: resError } = await supabase
                .from('test_results')
                .select(`
                    id, user_id, test_id, total_score, t_score, completed_at,
                    tests ( title, type )
                `)
                .in('user_id', userIds)
                //.not('completed_at', 'is', null) // Show incomplete? maybe yes to show "In Progress"
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
                        t_score: r.t_score, // Use T-score for Personality usually
                        completed_at: r.completed_at
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

    const filteredCandidates = candidates.filter(c =>
    (c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getScoreDisplay = (results: TestResult[], type: 'APTITUDE' | 'PERSONALITY') => {
        const target = results.find(r => r.test_type === type && r.completed_at);
        if (!target) return <span className="text-slate-300">-</span>;

        // Personality usually uses T-score, Aptitude uses total_score (or percentage)
        // Let's display T-score for Personality if available, else total.
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

            {/* Use simple table layout */}
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
                                <th className="px-6 py-4 text-center">상태</th>
                                <th className="px-6 py-4 text-right">리포트</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map(candidate => {
                                    const hasCompletedAny = candidate.results.some(r => r.completed_at);

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
                                            <td className="px-6 py-4 text-center">
                                                {hasCompletedAny ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">검사완료</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-400 font-normal">미응시</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {/* If there is a completed result, show link to report */}
                                                {candidate.results.filter(r => r.completed_at).map(r => (
                                                    <Link
                                                        key={r.id}
                                                        href={`/report/${r.id}`} // Assuming report URL structure
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline ml-2"
                                                    >
                                                        {r.test_type === 'PERSONALITY' ? '인성' : '적성'} <ArrowRight size={10} />
                                                    </Link>
                                                ))}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
