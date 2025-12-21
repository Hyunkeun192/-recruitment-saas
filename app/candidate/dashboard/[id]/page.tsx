import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Info, Award, LayoutGrid, CheckCircle2, TrendingUp, User, ChevronLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

function NormalDistributionGraph({ tScore }: { tScore: number }) {
    const width = 400;
    const height = 120;
    const mean = 50;
    const sd = 10;

    const points = [];
    for (let x = 0; x <= 100; x += 1) {
        const y = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
        points.push(`${(x / 100) * width},${height - (y * 2500)}`);
    }
    const pathData = points.join(" ");
    const respondentX = (tScore / 100) * width;

    const z = (tScore - 50) / 10;
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2.0);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    let percentile = z >= 0 ? 1.0 - p : p;
    percentile = Math.round(percentile * 100);

    return (
        <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-auto overflow-visible">
                <line x1="0" y1={height} x2={width} y2={height} stroke="#E2E8F0" strokeWidth="1" />
                <path
                    d={`M 0,${height} ${points.filter((_, i) => i <= tScore).join(" ")} L ${respondentX},${height} Z`}
                    fill="url(#glowGradient)"
                    className="opacity-30"
                />
                <polyline fill="none" stroke="#CBD5E1" strokeWidth="2" points={pathData} />
                <line x1={respondentX} y1="0" x2={respondentX} y2={height} stroke="#3B82F6" strokeWidth="3" strokeDasharray="4 2" className="animate-pulse" />
                <circle cx={respondentX} cy={points[Math.round(tScore)]?.split(',')[1] || 0} r="5" fill="#3B82F6" />
                <text x={mean * (width / 100)} y={height + 15} textAnchor="middle" className="text-[10px] fill-slate-400 font-bold">평균 (50)</text>
                <text x={respondentX} y="-5" textAnchor="middle" className="text-[12px] fill-blue-600 font-black">나 ({tScore.toFixed(1)})</text>
                <defs>
                    <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#B3E5FC" />
                        <stop offset="50%" stopColor="#E1BEE7" />
                        <stop offset="100%" stopColor="#FFCCBC" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="mt-4 flex justify-between items-center text-sm font-medium">
                <div className="text-slate-500">전체 응시자 중 상위 <span className="text-blue-600 font-bold">{100 - percentile}%</span></div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-300"></div> 규준 집단</span>
                    <span className="flex items-center gap-1 text-[10px] text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 본인</span>
                </div>
            </div>
        </div>
    );
}

function StatBar({ label, value, colorClass }: { label: string, value: number, colorClass: string }) {
    const percentage = Math.min(100, Math.max(0, (value / 100) * 100));
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="text-lg font-black text-slate-600">{label}</span>
                <span className="text-2xl font-black text-slate-600 leading-none">{value.toFixed(1)}</span>
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative">
                <div className={`absolute top-0 left-0 h-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-200/50"></div>
            </div>
        </div>
    );
}

import InterpretationGuide from "./InterpretationGuide";
import ReliabilityAnalysis from "./ReliabilityAnalysis";
import HistoryNavigator from "./HistoryNavigator";

export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {


    const { id } = await params;
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect("/login?next=/candidate/dashboard/" + id);

    const { data: result } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            detailed_scores,
            answers_log,
            questions_order,
            test_id,
            user_id,
            tests ( id, title, type, description )
        `)
        .eq("id", id)
        .single();

    if (!result || result.user_id !== session.user.id) {
        return notFound();
    }

    // 1. Fetch competency metadata (descriptions)
    const { data: compMeta } = await supabase
        .from("competencies")
        .select(`
            id,
            name,
            description,
            competency_scales ( scale_name )
        `)
        .eq("test_id", result.test_id);

    // 2. Fetch all possible questions for this test to build a lookup map
    // 2. Fetch all possible questions and norms for this test
    const [qRelationsResult, normsResult] = await Promise.all([
        supabase.from('test_questions').select('is_practice, questions(*)').eq('test_id', result.test_id),
        supabase.from('test_norms').select('*').eq('test_id', result.test_id)
    ]);

    const qRelations = qRelationsResult.data;
    const norms = normsResult.data || [];
    const normsMap = new Map(norms.map((n: any) => [n.category_name, n]));

    const questionsMap: Record<string, any> = {};
    const practiceIds = new Set<string>();

    qRelations?.forEach(r => {
        const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
        if (q) {
            questionsMap[q.id] = q;
            if (r.is_practice) practiceIds.add(q.id);
        }
    });

    const answers = (result.answers_log as Record<string, number>) || {};
    const qOrder = (result.questions_order as string[]) || [];

    const details = (result.detailed_scores as any) || {};
    const competencies = details.competencies || {};
    const scales = details.scales || {};

    // Helper to normalize score if needed
    const getTScore = (name: string, val: any) => {
        // Priority 1: If explicit t_score exists in object, use it
        if (typeof val === 'object' && val !== null && typeof val.t_score === 'number') {
            return val.t_score;
        }

        // Priority 2: If val is a number, checking if it is raw or T is ambiguous.
        // But based on new seeding/submission logic, we likely store objects.
        // If we must fallback for legacy data:
        let score = typeof val === 'object' ? val.score : val; // handle { score: ... } or just number

        // If it looks like a raw score (very low) AND we have norms, calculate T
        const norm = normsMap.get(name);
        if (typeof score === 'number' && score < 40 && norm && norm.std_dev_value) {
            // This fallback is only for really low raw scores that are likely NOT T-scores
            // But T-scores CAN be < 40 (1 SD below mean = 40).
            // However, typical raw scores in 5-point scale (e.g. 5 items) max 25.
            // Risk: Valid T=35 vs Raw=35. 
            // Better to trust recent data structure. 
            // If the user complains "not T-score", maybe they see Raw scores.
            // Let's assume if it's NOT an object with t_score, we TRY to convert using norms if available.
            const calculatedT = 50 + 10 * ((score - norm.mean_value) / norm.std_dev_value);
            return calculatedT;
        }
        return score;
    };

    // 3. Narrative Generation Engine
    const narratives: Record<string, { strengths: string[], weaknesses: string[] }> = {};

    compMeta?.forEach(comp => {
        const memberScales = comp.competency_scales.map((cs: any) => cs.scale_name.trim().toLowerCase());
        const strengths: string[] = [];
        const weaknesses: string[] = [];

        // Match answers using the actual order stored in the result
        qOrder.forEach((qId, idx) => {
            if (practiceIds.has(qId)) return; // Skip practice questions

            const q = questionsMap[qId];
            if (!q) return;

            const qCat = q.category?.trim().toLowerCase();
            if (memberScales.includes(qCat)) {
                const rawAns = answers[idx] ?? (answers as any)[idx.toString()];
                if (rawAns === undefined) return;

                const finalScore = q.is_reverse_scored ? (6 - rawAns) : rawAns;

                if (finalScore >= 4) strengths.push(q.content);
                else if (finalScore <= 2) weaknesses.push(q.content);
            }
        });

        narratives[comp.name] = {
            strengths: Array.from(new Set(strengths)).slice(0, 3),
            weaknesses: Array.from(new Set(weaknesses)).slice(0, 2)
        };
    });

    // Fetch all results for this test and user to show trends...
    const { data: allResults } = await supabase
        .from("test_results")
        .select(`
            id,
            total_score,
            completed_at,
            detailed_scores,
            attempt_number
        `)
        .eq("test_id", result.test_id)
        .eq("user_id", result.user_id)
        .order("completed_at", { ascending: true });

    const attempts = allResults || [];
    const trendData = attempts.map((r, idx) => {
        // Use detailed_scores.total.t_score if available, otherwise fallback to total_score
        // Ensure we display T-Score (usually < 100), not Raw Score (> 100 for total)
        const detailedTotal = (r.detailed_scores as any)?.total;
        let score = typeof detailedTotal === 'number' ? detailedTotal : detailedTotal?.t_score;

        if (score === undefined || score === null) {
            score = r.total_score || 0;
        }

        // If score is large (> 100), it's likely a raw score. 
        // We should ideally show T-Score. If we can't find T-Score, show Raw but maybe flag it? 
        // For now, prioritize detailed.t_score which is explicitly T.

        return {
            id: r.id,
            index: idx + 1,
            score: Number(score.toFixed(1)), // Ensure formatting
            date: new Date(r.completed_at!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
            isCurrent: r.id === id
        };
    });



    // 4. Group Scales (High / Low)
    const EXCLUDED_SCALES = [
        '지시불이행', '거짓말', '자기신뢰도검증',
        '공격성', '의존성 성격장애', '의존성성격장애',
        '편접성 성격장애', '편집성 성격장애', '편집성성격장애',
        '불안/우울 장애', '불안/우울', '불안/우울장애',
        '조현형성격장애', '조현형 성격장애',
        '반사회적 성격장애', '반사회적성격장애',
        '경계선 성격장애', '경계선성격장애'
    ];

    const normalizeName = (s: string) => s.replace(/\s+/g, '').trim();

    const processedScales = Object.entries(scales)
        .filter(([name]) => !EXCLUDED_SCALES.map(normalizeName).includes(normalizeName(name))) // Robust filter
        .map(([name, val]: [string, any]) => ({
            name,
            score: getTScore(name, val)
        }));

    // Top 4 High Scores (>= 60, Descending)
    const highScores = processedScales
        .filter(s => s.score >= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

    // Top 4 Low Scores (<= 40, Ascending)
    const lowScores = processedScales
        .filter(s => s.score <= 40)
        .sort((a, b) => a.score - b.score)
        .slice(0, 4);

    // Helper to render a card
    const renderScaleCard = (item: { name: string, score: number } | undefined, type: 'high' | 'low') => {
        if (!item) {
            return (
                <div key={Math.random()} className="bg-slate-50 border border-slate-100 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center text-center h-full min-h-[160px] opacity-70">
                    <p className="text-slate-400 font-medium text-sm">
                        {type === 'high' ? 'Blank' : 'Blank'}
                    </p>
                </div>
            );
        }

        const isHigh = type === 'high';
        const colorClass = isHigh ? 'bg-blue-400' : 'bg-orange-400';
        const bgClass = isHigh ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600';

        return (
            <div key={item.name} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100/60 hover:shadow-md transition-shadow group h-full">
                <div className="flex justify-between items-center mb-6">
                    <div className={`px-3 py-1 rounded-xl flex items-center justify-center font-bold text-xs ${bgClass}`}>
                        {isHigh ? 'High' : 'Low'}
                    </div>
                    <div className="text-2xl font-black text-slate-700">{item.score.toFixed(1)}</div>
                </div>
                <h4 className="font-bold text-slate-800 mb-2 truncate">{item.name}</h4>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mb-4">
                    <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.min(100, (item.score / 100) * 100)}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 relative">
            <Link href="/candidate/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm mb-4">
                <ChevronLeft size={16} />
                대시보드로 돌아가기
            </Link>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Award className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">My Value Report</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-500">
                        {(result.tests as any)?.title}{' '}
                        <span className="ml-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Deep Dive</span>
                    </h1>
                </div>

            </header>

            {/* Report Interpretation Guide (Interactive) */}
            <div className="space-y-4">
                <InterpretationGuide />
                <ReliabilityAnalysis
                    questions={Object.values(questionsMap)}
                    answers={qOrder.reduce((acc, qId, idx) => {
                        const val = answers[idx] ?? (answers as any)[idx.toString()];
                        if (val !== undefined) acc[qId] = val;
                        return acc;
                    }, {} as Record<string, number>)}
                />
            </div>

            {/* Multi-Attempt History & Growth Trends */}
            <HistoryNavigator attempts={trendData} testId={result.test_id} />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 px-4">

                <div className="md:col-span-12 lg:col-span-12 bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-100/50 flex flex-col space-y-8">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-1 flex items-center gap-2">주요 역량 분석</h2>
                    </div>
                    <div className="space-y-12">
                        {compMeta?.map((comp: any) => {
                            const data = competencies[comp.name] || { t_score: 50 };
                            const narr = narratives[comp.name] || { strengths: [], weaknesses: [] };

                            return (
                                <div key={comp.id} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-b border-slate-50 pb-12 last:border-0 last:pb-0">
                                    {/* Left: Score & Bar */}
                                    <div className="lg:col-span-5 space-y-6">
                                        <StatBar label={comp.name} value={data.t_score} colorClass="bg-gradient-to-r from-blue-400 to-indigo-500" />
                                        <div className="mt-4">
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                                {comp.description || `귀하의 '${comp.name}' 역량이 돋보이는 결과입니다. 해당 역량을 바탕으로 탁월한 성과를 기대할 수 있습니다.`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Narrative Report */}
                                    <div className="lg:col-span-7 bg-slate-50/50 rounded-[2.5rem] p-8 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Strengths */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> 강점 분석
                                                </h4>
                                                <ul className="space-y-2">
                                                    {narr.strengths.length > 0 ? narr.strengths.map((s, i) => (
                                                        <li key={i} className="text-[13px] text-slate-600 leading-snug">
                                                            • {s}
                                                        </li>
                                                    )) : <li className="text-[13px] text-slate-400 italic">표시할 강점 데이터가 부족합니다.</li>}
                                                </ul>
                                            </div>

                                            {/* Weaknesses */}
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> 보완 가이드
                                                </h4>
                                                <ul className="space-y-2">
                                                    {narr.weaknesses.length > 0 ? narr.weaknesses.map((w, i) => (
                                                        <li key={i} className="text-[13px] text-slate-600 leading-snug">
                                                            • {w}
                                                        </li>
                                                    )) : <li className="text-[13px] text-slate-400 italic">표시할 보완 데이터가 부족합니다.</li>}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Positive Feedback */}
                                        {narr.weaknesses.length > 0 && (
                                            <div className="pt-4 border-t border-slate-200/50">
                                                <div className="flex items-start gap-3 text-indigo-600">
                                                    <Info size={16} className="mt-0.5 shrink-0" />
                                                    <p className="text-[13px] font-bold leading-relaxed">
                                                        보완점들을 조금만 더 의식적으로 관리한다면, 귀하의 뛰어난 '{comp.name}' 역량은 한층 더 강력한 경쟁력이 될 것입니다.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="md:col-span-12 bg-slate-50/30 border border-slate-100 rounded-[3rem] p-10 lg:p-14 shadow-inner">
                    <div className="max-w-4xl mx-auto space-y-16">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black tracking-tight text-slate-800">상세 특성 분석</h2>
                        </div>

                        {/* High Scores Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700">돋보이는 강점 (Top 4)</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => renderScaleCard(highScores[i], 'high'))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-200/50"></div>

                        {/* Low Scores Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                    <Info size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700">관리 및 보완 (Bottom 4)</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => renderScaleCard(lowScores[i], 'low'))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
