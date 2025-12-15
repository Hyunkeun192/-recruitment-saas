import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, Timer, Ban } from "lucide-react";

export default function AptitudeGuidePage({ params }: { params: { id: string } }) {
    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <Link href="/candidate/dashboard" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-4">
                    <ArrowLeft size={20} />
                    대시보드로 돌아가기
                </Link>
                <h1 className="text-3xl font-bold text-slate-900">적성검사 유의사항</h1>
                <p className="text-slate-500 mt-2">최상의 컨디션에서 응시해 주세요.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <BrainCircuit size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">검사 구성</h3>
                            <p className="text-slate-600 mt-1">
                                언어, 수리, 추리 등 다양한 영역의 문제가 출제됩니다.<br />
                                각 영역별로 정해진 시간이 있으며, 시간이 지나면 다음 영역으로 넘어갑니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Timer size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">시간 관리</h3>
                            <p className="text-slate-600 mt-1">
                                문항 수에 비해 시간이 부족할 수 있습니다.<br />
                                모르는 문제는 과감히 넘어가고, 아는 문제부터 빠르고 정확하게 푸는 전략이 필요합니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Ban size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">부정행위 금지</h3>
                            <p className="text-slate-600 mt-1">
                                대리 응시, 화면 캡처, 외부 검색 등은 엄격히 금지됩니다.<br />
                                적발 시 불이익을 받을 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-end">
                    <Link
                        href={`/candidate/aptitude/${params.id}/practice`}
                        className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        연습문제 풀기 <ArrowRight size={20} />
                    </Link>
                </div>

            </div>
        </div>
    );
}
