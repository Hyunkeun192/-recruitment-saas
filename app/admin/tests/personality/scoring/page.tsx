'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface TestNorm {
    id?: string;
    test_id: string;
    category_name: string;
    mean_value: number;
    std_dev_value: number;
}

export default function PersonalityScoringManagement() {
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [competencies, setCompetencies] = useState<string[]>([]); // New State
    const [norms, setNorms] = useState<TestNorm[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTests();
    }, []);

    useEffect(() => {
        if (selectedTestId) {
            fetchTestDetails(selectedTestId);
        } else {
            setCategories([]);
            setCompetencies([]);
            setNorms([]);
        }
    }, [selectedTestId]);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tests')
                .select('*')
                .eq('type', 'PERSONALITY')
                .order('created_at', { ascending: false }) as any;

            if (error) throw error;
            setTests(data);
            if (data && data.length > 0 && !selectedTestId) {
                setSelectedTestId(data[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error('검사 목록 로딩 실패');
        } finally {
            setLoading(false);
        }
    };

    const fetchTestDetails = async (testId: string) => {
        try {
            // 1. Get Categories (Scales) from Test Questions
            const { data: qData, error: qError } = await supabase
                .from('test_questions')
                .select('questions(category)')
                .eq('test_id', testId);

            if (qError) throw qError;

            // Extract unique categories
            const cats = Array.from(new Set(qData.map((item: any) => item.questions?.category).filter(Boolean))) as string[];
            setCategories(cats);

            // 2. Get Competencies
            const { data: cData, error: cError } = await supabase
                .from('competencies')
                .select('name')
                .eq('test_id', testId);

            if (cError) throw cError;
            const comps = cData.map((c: any) => c.name);
            setCompetencies(comps);

            // 3. Get Existing Norms
            const { data: nData, error: nError } = await supabase
                .from('test_norms')
                .select('*')
                .eq('test_id', testId);

            if (nError) throw nError;

            // 4. Initialize Norms state
            // Merge TOTAL, Categories, and Competencies
            const allKeys = Array.from(new Set(['TOTAL', ...cats, ...comps]));

            const mergedNorms = allKeys.map(key => {
                const existing = nData.find((n: any) => n.category_name === key);
                return existing || {
                    test_id: testId,
                    category_name: key,
                    mean_value: 0,
                    std_dev_value: 0
                } as TestNorm;
            });

            setNorms(mergedNorms);

        } catch (error) {
            console.error(error);
            toast.error('채점 정보 로딩 실패');
        }
    };

    const handleNormChange = (category: string, field: 'mean_value' | 'std_dev_value', value: string) => {
        const numVal = parseFloat(value) || 0;
        setNorms(prev => prev.map(n =>
            n.category_name === category ? { ...n, [field]: numVal } : n
        ));
    };

    const handleSave = async () => {
        if (!selectedTestId) return;
        setSaving(true);
        try {
            const upsertData = norms.map(n => ({
                test_id: selectedTestId,
                category_name: n.category_name,
                mean_value: n.mean_value,
                std_dev_value: n.std_dev_value
            }));

            // Use upsert on unique constraint (test_id, category_name)
            const { error } = await supabase
                .from('test_norms')
                .upsert(upsertData, { onConflict: 'test_id, category_name' }) as any;

            if (error) throw error;
            toast.success('채점 기준이 저장되었습니다.');
            fetchTestDetails(selectedTestId); // Refresh IDs
        } catch (error) {
            console.error(error);
            toast.error('저장 실패');
        } finally {
            setSaving(false);
        }
    };

    // Helper to render a norm row
    const renderNormRow = (norm: TestNorm, label: string, badgeColor: string, subText?: string) => (
        <div key={norm.category_name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-6 hover:border-indigo-200 transition-colors">
            <div className="w-1/3">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold mb-1 ${badgeColor}`}>
                    {label}
                </span>
                {subText && <p className="text-xs text-slate-400">{subText}</p>}
            </div>

            <div className="flex gap-6 flex-1">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">평균 (Mean)</label>
                    <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-black font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all"
                        value={norm.mean_value || ''}
                        onChange={(e) => handleNormChange(norm.category_name, 'mean_value', e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">표준편차 (StdDev)</label>
                    <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-black font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all"
                        value={norm.std_dev_value || ''}
                        onChange={(e) => handleNormChange(norm.category_name, 'std_dev_value', e.target.value)}
                        placeholder="0.00"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6">
            {/* Left Sidebar: Test List */}
            <div className="w-1/4 min-w-[250px] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-bold text-slate-800">인성검사 목록</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {tests.map(test => (
                        <button
                            key={test.id}
                            onClick={() => setSelectedTestId(test.id)}
                            className={`w-full text-left p-3 rounded-lg text-sm mb-1 transition-colors ${selectedTestId === test.id
                                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <div className="line-clamp-1">{test.title}</div>
                            <div className="text-xs text-slate-400 mt-1">{test.created_at.split('T')[0]}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="font-bold text-slate-800">
                            {tests.find(t => t.id === selectedTestId)?.title || '검사를 선택하세요'}
                        </h2>
                        <p className="text-xs text-slate-500">T점수 산출 기준 (Mean, StdDev) 설정</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedTestId}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-bold disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? '저장 중...' : '설정 저장'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {!selectedTestId || norms.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <TrendingUp size={48} className="mb-4 opacity-20" />
                            <p>검사를 선택하고 문항을 구성하면 채점 기준을 설정할 수 있습니다.</p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-800">
                                <h4 className="font-bold mb-1 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    T점수 산출 공식
                                </h4>
                                <p>T = 50 + 10 × ( (원점수 - 평균) / 표준편차 )</p>
                            </div>

                            {/* Section 1: Total */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">종합 점수</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {norms.filter(n => n.category_name === 'TOTAL').map(norm =>
                                        renderNormRow(
                                            norm,
                                            '종합 (전체)',
                                            'bg-slate-800 text-white',
                                            '모든 척도의 원점수 합계 기준'
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Competencies */}
                            {competencies.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingUp size={16} /> 역량 방정식
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {norms.filter(n => competencies.includes(n.category_name)).map(norm =>
                                            renderNormRow(
                                                norm,
                                                norm.category_name,
                                                'bg-blue-100 text-blue-700',
                                                '역량방정식으로 생성된 합계 기준'
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Section 3: Categories (Scales) */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">성격 척도</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {norms.filter(n => categories.includes(n.category_name)).map(norm =>
                                        renderNormRow(
                                            norm,
                                            norm.category_name,
                                            'bg-slate-100 text-slate-600',
                                            '성격 척도'
                                        )
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
