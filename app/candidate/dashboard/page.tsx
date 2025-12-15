import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Scale } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CandidateDashboard() {
    const supabase = await createClient();

    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login?next=/candidate/dashboard");
    }

    // Fetch ACTIVE tests
    const { data: personalityTests } = await supabase
        .from("tests")
        .select("*")
        .eq("type", "PERSONALITY")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

    const { data: aptitudeTests } = await supabase
        .from("tests")
        .select("*")
        .eq("type", "APTITUDE")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-12">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">나의 Fit 진단</h1>
                <p className="text-slate-500">
                    현재 응시 가능한 검사 목록입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Personality Tests Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                            <Scale size={20} />
                        </div>
                        <h2 className="text-xl font-bold">인성검사</h2>
                    </div>

                    <div className="grid gap-4">
                        {personalityTests && personalityTests.length > 0 ? (
                            personalityTests.map((test) => (
                                <Link
                                    key={test.id}
                                    href={`/candidate/personality/${test.id}/guide`}
                                    className="group block bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-orange-200 transition-all hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1 group-hover:text-orange-600 transition-colors">{test.title}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2">{test.description || '설명이 없습니다.'}</p>
                                        </div>
                                        <span className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-md font-medium">Active</span>
                                    </div>
                                    <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors">
                                        검사 시작하기 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400">
                                진행 중인 인성검사가 없습니다.
                            </div>
                        )}
                    </div>
                </section>

                {/* Aptitude Tests Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                            <BrainCircuit size={20} />
                        </div>
                        <h2 className="text-xl font-bold">적성검사</h2>
                    </div>

                    <div className="grid gap-4">
                        {aptitudeTests && aptitudeTests.length > 0 ? (
                            aptitudeTests.map((test) => (
                                <Link
                                    key={test.id}
                                    href={`/candidate/aptitude/${test.id}/guide`}
                                    className="group block bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">{test.title}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-2">{test.description || '설명이 없습니다.'}</p>
                                        </div>
                                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md font-medium">Active</span>
                                    </div>
                                    <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-slate-900 transition-colors">
                                        검사 시작하기 <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400">
                                진행 중인 적성검사가 없습니다.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
