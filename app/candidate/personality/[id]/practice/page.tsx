'use client';

import Link from "next/link";
import { useState, use } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

// 연습문제 데이터 (3문항)
const PRACTICE_QUESTIONS = [
    {
        id: 1,
        question: "나는 새로운 사람들과\n어울리는 것을 즐긴다.",
        options: ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"]
    },
    {
        id: 2,
        question: "나는 계획을 세우고\n실천하는 것을 좋아한다.",
        options: ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"]
    },
    {
        id: 3,
        question: "나는 다른 사람의 감정에\n잘 공감하는 편이다.",
        options: ["전혀 그렇지 않다", "그렇지 않다", "보통이다", "그렇다", "매우 그렇다"]
    }
];

export default function PersonalityPracticePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});

    const handleAnswer = (score: number) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: score }));

        // Pass to next slide (even if it's the last question, go to completion card)
        if (currentIndex < PRACTICE_QUESTIONS.length) {
            setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < PRACTICE_QUESTIONS.length) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="w-full py-10 overflow-hidden min-h-screen flex flex-col">
            {/* Header */}
            <div className="max-w-4xl mx-auto w-full px-6 mb-8 flex items-center justify-between shrink-0">
                <Link href={`/candidate/personality/${id}/guide`} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-medium">유의사항으로</span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {PRACTICE_QUESTIONS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    // If we are on completion card (index == length), all should be filled? Or just keep last active?
                                    // Let's make all active if completed
                                    (idx === currentIndex || (currentIndex === PRACTICE_QUESTIONS.length && idx === PRACTICE_QUESTIONS.length - 1))
                                        ? 'w-8 bg-blue-600'
                                        : (idx < currentIndex ? 'w-2 bg-blue-600' : 'w-2 bg-slate-200')
                                    }`}
                            />
                        ))}
                    </div>
                </div>
                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    연습문제 {Math.min(currentIndex + 1, PRACTICE_QUESTIONS.length)}/{PRACTICE_QUESTIONS.length}
                </div>
            </div>

            {/* Carousel Container */}
            <div className="flex-1 relative flex flex-col justify-center">
                <div
                    className="flex transition-transform duration-500 ease-in-out [--gap:24px] [--card-width:80vw] md:[--card-width:50vw]"
                    style={{
                        transform: `translateX(calc(50vw - (var(--card-width) / 2) - (${currentIndex} * (var(--card-width) + var(--gap)))))`
                    }}
                >
                    {PRACTICE_QUESTIONS.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAnswered = answers[idx] !== undefined;

                        return (
                            <div
                                key={q.id}
                                className="shrink-0 pr-[24px]"
                                style={{ width: 'var(--card-width)' }}
                            >
                                <div className={`
                                    w-full h-full bg-white rounded-3xl border shadow-xl p-8 md:p-12 transition-all duration-500
                                    ${isCurrent ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                                `}>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-relaxed text-center whitespace-pre-line text-slate-800">
                                        {q.question}
                                    </h2>

                                    <div className="space-y-3">
                                        {q.options.map((option, optIdx) => {
                                            const score = optIdx + 1;
                                            const isSelected = answers[idx] === score;

                                            return (
                                                <button
                                                    key={score}
                                                    onClick={() => isCurrent && handleAnswer(score)}
                                                    disabled={!isCurrent}
                                                    className={`
                                                        w-full p-4 rounded-xl text-left transition-all duration-200 border-2 flex items-center justify-between group
                                                        ${isSelected
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-md'
                                                            : 'border-slate-100 text-slate-500 hover:border-blue-200 hover:bg-slate-50'
                                                        }
                                                        ${!isCurrent ? 'cursor-default' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <span>{option}</span>
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
                            ${currentIndex === PRACTICE_QUESTIONS.length ? 'opacity-100 scale-100 border-slate-200 shadow-slate-200/50' : 'opacity-40 scale-95 border-slate-100 blur-[1px]'}
                        `}>
                            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                                <Check size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
                                연습이 끝났습니다!
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                실제 인성검사도 이와 같은 방식으로 진행됩니다.<br />
                                솔직하게 답변해 주세요.
                            </p>

                            <Link
                                href={`/candidate/personality/${id}/test`}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 text-lg group"
                            >
                                실전 검사 시작하기 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons (Floating) */}
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
                        disabled={currentIndex >= PRACTICE_QUESTIONS.length}
                        className={`
                            pointer-events-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 transition-all
                            ${currentIndex >= PRACTICE_QUESTIONS.length ? 'opacity-0 -translate-x-4' : 'opacity-100 hover:bg-slate-50 hover:scale-110'}
                        `}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>

            {/* Bottom Action Area */}
            <div className="h-24 sticky bottom-0 flex items-center justify-center shrink-0">
                {currentIndex < PRACTICE_QUESTIONS.length && (
                    <p className="text-slate-400 text-sm font-medium animate-pulse">
                        답변을 선택하면 다음 문항으로 넘어갑니다
                    </p>
                )}
            </div>
        </div>
    );
}
