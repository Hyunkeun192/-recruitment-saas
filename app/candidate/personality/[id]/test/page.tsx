'use client';

import Link from "next/link";
import { useState, useEffect, use, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PersonalityTestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: testId } = use(params);
    const router = useRouter();

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resume Dialog State
    const [showResumeDialog, setShowResumeDialog] = useState(false);
    const [pendingResultData, setPendingResultData] = useState<any>(null);

    // Resume & Timer State
    const [resultId, setResultId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for auto-save (to avoid stale closures)
    const currentIndexRef = useRef(currentIndex);
    const answersRef = useRef(answers);
    const elapsedSecondsRef = useRef(elapsedSeconds);
    const resultIdRef = useRef(resultId);

    // Sync refs
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
    useEffect(() => { resultIdRef.current = resultId; }, [resultId]);

    // Save Progress Function (Reads from Refs)
    const saveProgress = useCallback(async (isUrgent = false) => {
        const rId = resultIdRef.current;
        if (!rId) {
            console.log("Skipping save: No resultId");
            return;
        }

        const payload = {
            elapsed_seconds: elapsedSecondsRef.current,
            current_index: currentIndexRef.current,
            answers_log: answersRef.current,
            updated_at: new Date().toISOString()
        };

        console.log("Saving progress...", payload);

        try {
            // Fix: Cast payload to any to avoid typescript 'never' error
            const { error, count } = await (supabase.from('test_results') as any)
                .update(payload)
                .eq('id', rId)
                .select(); // Select to verify return

            if (error) {
                console.error("Save error:", error);
                toast.error(`저장 실패: ${error.message}`);
            } else {
                console.log("Save success");
            }
        } catch (e) {
            console.error('Save failed', e);
        }
    }, []);

    // 1. Block Back Button & Handle Unload
    useEffect(() => {
        const handlePopState = () => {
            history.pushState(null, '', location.href);
            toast.warning('검사 중에는 뒤로 갈 수 없습니다.');
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            saveProgress(true);
            const confirmationMessage = '검사를 중단하시겠습니까?';
            e.preventDefault();
            e.returnValue = '';
        };

        history.pushState(null, '', location.href);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Ensure save on unmount (e.g. navigation away/logout)
            saveProgress(true);
        };
    }, [saveProgress]);

    // 2. Initial Fetch
    useEffect(() => {
        initializeTest();
        return () => stopTimer();
    }, [testId]);

    // 3. Timer Logic
    useEffect(() => {
        if (!loading && !isSubmitting && !showResumeDialog) {
            startTimer();
        } else {
            stopTimer();
        }
        return () => stopTimer();
    }, [loading, isSubmitting, showResumeDialog]);

    const startTimer = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => {
                const newValue = prev + 1;
                if (newValue % 5 === 0) {
                    saveProgress();
                }
                return newValue;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const initializeTest = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            // A. Fetch Test Info
            const { data: testData, error: tError } = await supabase
                .from('tests')
                .select('time_limit')
                .eq('id', testId)
                .single();

            if (tError) throw tError;
            // Fix: Cast testData to any
            if ((testData as any).time_limit) setTimeLimitMinutes((testData as any).time_limit);

            // B. Fetch Questions
            const { data: relations, error: rError } = await supabase
                .from('test_questions')
                .select('question_id, is_practice, questions(*)')
                .eq('test_id', testId)
                .order('order_index', { ascending: true });

            if (rError) throw rError;
            if (!relations || relations.length === 0) {
                toast.error('검사 문항이 없습니다.');
                return;
            }
            const allQuestionsRaw = relations.map((r: any) => ({
                ...r.questions,
                is_practice: r.is_practice // Map is_practice from joining table
            }));

            // Separate practice and real questions check
            const practiceCheck = allQuestionsRaw.filter((q: any) => q.is_practice);
            console.log(`[Init] Total Loaded: ${allQuestionsRaw.length}, Practice: ${practiceCheck.length}`);

            // C. Check Existing Result
            const { data: existingResult, error: resError } = await supabase
                .from('test_results')
                .select('id, questions_order, elapsed_seconds, answers_log, current_index')
                .eq('test_id', testId)
                .eq('user_id', user.id)
                .is('completed_at', null)
                .maybeSingle();

            if (resError) {
                console.error("Error fetching existing result:", resError);
                toast.error(`이전 기록 조회 실패: ${resError.message}`);
                throw resError;
            }

            let finalQuestions = [];

            console.log("Existing result:", existingResult); // DEBUG

            if (existingResult) {
                // Fix: Cast existingResult to any
                const res = existingResult as any;

                // [MODIFIED] Do not restore immediately. Pending verification via Dialog.
                // Instead of setting state here, we prepare pendingResultData.

                // Restore order if exists
                if (res.questions_order && Array.isArray(res.questions_order)) {
                    const orderMap = new Map(res.questions_order.map((id: string, idx: number) => [id, idx]));
                    finalQuestions = allQuestionsRaw.sort((a: any, b: any) => {
                        const idxA = (orderMap.get(a.id) as number) ?? 9999;
                        const idxB = (orderMap.get(b.id) as number) ?? 9999;
                        return idxA - idxB;
                    });
                } else {
                    finalQuestions = allQuestionsRaw;
                }

                // Check practice skip logic locally to prepare correct index
                const firstRealQuestionIndex = finalQuestions.findIndex((q: any) => !q.is_practice);

                if (firstRealQuestionIndex !== -1 && (res.current_index || 0) < firstRealQuestionIndex) {
                    // Practice pending, prepare data to skip practice
                    res.current_index = firstRealQuestionIndex;
                }

                // Store data and show dialog instead of applying immediately
                setPendingResultData(res);
                setShowResumeDialog(true);
            } else {
                // Separate practice and real questions
                const practiceQuestions = allQuestionsRaw.filter((q: any) => q.is_practice);
                const realQuestions = allQuestionsRaw.filter((q: any) => !q.is_practice);

                console.log(`Found ${practiceQuestions.length} practice questions.`); // DEBUG

                // Shuffle only real questions
                let array = [...realQuestions];
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }

                // Combine: Practice first, then shuffled Real
                finalQuestions = [...practiceQuestions, ...array];

                const { data: newResult, error: createError } = await supabase
                    .from('test_results')
                    .insert({
                        test_id: testId,
                        user_id: user.id,
                        questions_order: finalQuestions.map(q => q.id),
                        elapsed_seconds: 0,
                        current_index: 0,
                        answers_log: {},
                        started_at: new Date().toISOString()
                    } as any)
                    .select()
                    .single();

                if (createError) throw createError;
                setResultId((newResult as any).id);
            }

            setQuestions(finalQuestions);
        } catch (error: any) {
            console.error('Init failed:', error);
            console.log('Init error details:', JSON.stringify(error, null, 2));
            toast.error(`검사 초기화 실패: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const shuffleArray = (array: any[]) => {
        let curId = array.length;
        while (curId !== 0) {
            let randId = Math.floor(Math.random() * curId);
            curId -= 1;
            [array[curId], array[randId]] = [array[randId], array[curId]];
        }
        return array;
    };

    const handleResumeConfirm = async (shouldResume: boolean) => {
        setShowResumeDialog(false);
        if (shouldResume && pendingResultData) {
            // Apply pending data
            setResultId(pendingResultData.id);
            setElapsedSeconds(pendingResultData.elapsed_seconds || 0);
            setCurrentIndex(pendingResultData.current_index || 0);

            if (pendingResultData.answers_log) {
                const restoredAnswers: Record<number, number> = {};
                Object.entries(pendingResultData.answers_log).forEach(([k, v]) => {
                    restoredAnswers[parseInt(k)] = v as number;
                });
                setAnswers(restoredAnswers);
            }
            // Resume timer
            startTimer();
        } else {
            // Start fresh: Delete existing result to force new shuffle and new start
            // Start fresh: Delete existing result to force new shuffle and new start
            if (pendingResultData?.id) {
                const { error: delError } = await supabase.from('test_results').delete().eq('id', pendingResultData.id);
                if (delError) {
                    console.error("Delete failed:", delError);
                    toast.error(`초기화 실패 (권한 부족): ${delError.message}`);
                    return; // Stop here if we can't delete
                }
            }

            // Re-initialize to generate new order and start over
            setResultId(null);
            setElapsedSeconds(0);
            setCurrentIndex(0);
            setAnswers({});
            setPendingResultData(null);

            // Re-fetch/Re-init
            initializeTest();
        }
    };

    const handleAnswer = async (score: number) => {
        const newAnswers = { ...answers, [currentIndex]: score };
        setAnswers(newAnswers);

        // Immediate save for reliability
        if (resultId) {
            try {
                // Determine next index (if not last)
                const nextIdx = currentIndex < questions.length ? currentIndex + 1 : currentIndex;

                await (supabase.from('test_results') as any).update({
                    current_index: nextIdx, // Save where they SHOULD be (next question)
                    answers_log: newAnswers,
                    updated_at: new Date().toISOString()
                }).eq('id', resultId);
            } catch (e) {
                console.error("Save answer failed", e);
            }
        }

        if (currentIndex < questions.length) {
            setTimeout(() => {
                const nextIdx = currentIndex + 1;
                setCurrentIndex(nextIdx);
            }, 250); // Keep UI delay for UX
        }
    };

    const nextQuestion = () => {
        if (answers[currentIndex] === undefined) {
            toast.warning('문항에 응답하지 않았습니다.', {
                description: '다음 문항으로 넘어가려면 답변을 선택해주세요.'
            });
            return;
        }

        if (currentIndex < questions.length) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx); // triggers re-render, ref update in effect

            // Force save with latest data
            if (resultId) {
                // Fix: Cast payload
                // Fix: Cast payload
                (supabase.from('test_results') as any).update({
                    current_index: nextIdx,
                    answers_log: answers,
                    updated_at: new Date().toISOString()
                }).eq('id', resultId).then();
            }
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            toast.error('응답하지 않은 문항이 있습니다.');
            return;
        }

        setIsSubmitting(true);
        stopTimer();

        try {
            // 1. Calculate Total Score
            let totalScore = 0;
            questions.forEach((q, idx) => {
                const answer = answers[idx];
                if (answer) {
                    if (q.is_reverse_scored) {
                        totalScore += (6 - answer); // Reverse scoring for 5-point Likert (1->5, 5->1)
                    } else {
                        totalScore += answer;
                    }
                }
            });

            // 2. Fetch Norms & Calculate T-Score
            let tScore: number | null = null;
            const { data: normData } = await supabase
                .from('test_norms')
                .select('mean_value, std_dev_value')
                .eq('test_id', testId)
                .single();

            // Fix: Cast normData
            if (normData && (normData as any).std_dev_value > 0) {
                const zScore = (totalScore - (normData as any).mean_value) / (normData as any).std_dev_value;
                tScore = Math.round((zScore * 10 + 50) * 100) / 100; // Round to 2 decimal places
            }

            // 3. Save Results
            // 3. Save Results
            await (supabase
                .from('test_results') as any)
                .update({
                    answers_log: answers,
                    elapsed_seconds: elapsedSeconds,
                    completed_at: new Date().toISOString(),
                    status: 'COMPLETED',
                    total_score: totalScore,
                    t_score: tScore
                }) // Fix: Cast payload
                .eq('id', resultId);

            toast.success('검사가 완료되었습니다.');
            router.push('/candidate/dashboard');

        } catch (error) {
            console.error(error);
            toast.error('제출 중 오류가 발생했습니다.');
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}분 ${secs < 10 ? '0' : ''}${secs}초`;
    };

    const getTimeDisplay = () => {
        if (!timeLimitMinutes) return formatTime(elapsedSeconds);
        const limitSeconds = timeLimitMinutes * 60;
        const remaining = Math.max(0, limitSeconds - elapsedSeconds);
        return formatTime(remaining);
    };

    const progressPercent = questions.length > 0 ? (Math.min(currentIndex + 1, questions.length) / questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="text-xl font-bold text-slate-800 mb-4">등록된 문항이 없습니다.</div>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="w-full py-10 overflow-hidden min-h-screen flex flex-col select-none">
            <div className="max-w-4xl mx-auto w-full px-6 mb-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <span className="font-bold text-slate-900">검사 진행 중</span>
                    </div>
                </div>

                <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold shadow-sm border transition-all duration-300
                    ${timeLimitMinutes && ((timeLimitMinutes * 60 - elapsedSeconds) <= 300)
                        ? 'bg-red-50 text-red-600 border-red-200 animate-pulse text-2xl px-6'
                        : 'bg-white text-slate-700 border-slate-200 text-lg'}
                `}>
                    <Clock size={timeLimitMinutes && ((timeLimitMinutes * 60 - elapsedSeconds) <= 300) ? 24 : 20} />
                    {getTimeDisplay()}
                </div>

                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {Math.min(currentIndex + 1, questions.length)}/{questions.length}
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full px-6 mb-8">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 relative flex flex-col justify-center">
                <div
                    className="flex transition-transform duration-500 ease-in-out [--gap:24px] [--card-width:80vw] md:[--card-width:600px]"
                    style={{
                        transform: `translateX(calc(50% - ((var(--card-width) - var(--gap)) / 2) - (${currentIndex} * var(--card-width))))`
                    }}
                >
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        // Optimization: Only render items close to current index to prevent DOM overload
                        const shouldRender = Math.abs(currentIndex - idx) <= 2;

                        if (!shouldRender) {
                            return (
                                <div
                                    key={q.id || idx}
                                    className="shrink-0 pr-[24px]"
                                    style={{ width: 'var(--card-width)' }}
                                    aria-hidden="true"
                                />
                            );
                        }

                        const defaultOptions = ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"];
                        const rawOptions = (q.options && Array.isArray(q.options) && q.options.length > 0)
                            ? q.options
                            : defaultOptions;

                        return (
                            <div
                                key={q.id || idx}
                                className="shrink-0 pr-[24px]"
                                style={{ width: 'var(--card-width)' }}
                            >
                                <div className={`
                                    w-full h-full bg-white rounded-3xl border shadow-xl p-8 md:p-12 transition-all duration-500
                                    ${isCurrent ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                                `}>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-relaxed text-center whitespace-pre-line text-slate-800 break-keep">
                                        {q.content}
                                    </h2>

                                    <div className="space-y-3">
                                        {rawOptions.map((option: any, optIdx: number) => {
                                            const score = optIdx + 1;
                                            const isSelected = answers[idx] === score;

                                            let optionText = option;
                                            if (typeof option === 'object' && option !== null) {
                                                optionText = option.text || option.content || option.label || option.value || JSON.stringify(option);
                                            }

                                            // Fallback to default options if text is missing or "옵션"
                                            if (!optionText || (typeof optionText === 'string' && optionText.trim() === '')) {
                                                optionText = defaultOptions[optIdx] || "옵션";
                                            }

                                            return (
                                                <button
                                                    key={score}
                                                    onClick={() => {
                                                        if (isCurrent) {
                                                            handleAnswer(score);
                                                            // Navigation logic is now inside handleAnswer's timeout
                                                        }
                                                    }}
                                                    disabled={!isCurrent}
                                                    className={`
                                                        w-full p-4 rounded-xl text-left transition-all duration-200 border-2 flex items-center justify-between group
                                                        ${isSelected
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-md'
                                                            : 'border-slate-100 text-slate-900 hover:border-blue-200 hover:bg-slate-50'
                                                        }
                                                        ${!isCurrent ? 'cursor-default' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <span className="text-slate-900 font-medium text-lg">{optionText}</span>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-in zoom-in">
                                                            <Check size={14} className="text-white bg-blue-600" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Completion Card */}
                    <div
                        className="shrink-0 pr-[24px]"
                        style={{ width: 'var(--card-width)' }}
                    >
                        <div className={`
                            w-full h-full bg-white rounded-3xl border shadow-xl p-8 md:p-12 transition-all duration-500 flex flex-col items-center justify-center text-center
                            ${currentIndex === questions.length ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                        `}>
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
                                모든 문항에 답변했습니다!
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                수고하셨습니다.<br />
                                아래 버튼을 눌러 검사 결과를 제출해 주세요.
                            </p>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 text-lg group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '제출 중...' : '검사 제출하기'} <Check size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 w-full max-w-4xl left-1/2 -translate-x-1/2 flex justify-between pointer-events-none px-4">
                    <button
                        onClick={prevQuestion}
                        disabled={currentIndex === 0}
                        className={`
                            pointer-events-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 transition-all
                            ${currentIndex === 0 ? 'opacity-0 translate-x-4' : 'opacity-100 hover:bg-slate-50 hover:scale-110'}
                        `}
                    >
                        <ArrowLeft size={24} />
                    </button>

                    {/* Hide Right Arrow on Last Card (Completion) */}
                    <button
                        onClick={nextQuestion}
                        disabled={currentIndex >= questions.length}
                        className={`
                            pointer-events-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 transition-all
                            ${currentIndex >= questions.length ? 'opacity-0 -translate-x-4' : 'opacity-100 hover:bg-slate-50 hover:scale-110'}
                        `}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>

            <div className="h-24 sticky bottom-0 flex items-center justify-center shrink-0">
                {currentIndex < questions.length && (
                    <p className="text-slate-400 text-sm font-medium">
                        답변을 선택하면 다음 문항으로 넘어갑니다
                    </p>
                )}
            </div>
            {/* Resume Confirmation Dialog */}
            <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>검사 이어하기</DialogTitle>
                        <DialogDescription>
                            이전에 진행하던 검사 기록이 있습니다.<br />
                            마지막으로 풀던 문항부터 계속 진행하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleResumeConfirm(false)}>
                            아니오 (처음부터)
                        </Button>
                        <Button onClick={() => handleResumeConfirm(true)}>
                            네 (이어하기)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
