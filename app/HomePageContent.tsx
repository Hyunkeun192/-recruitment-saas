'use client';

import Link from "next/link";
import { MessageSquare, Scale, BrainCircuit, Link as LinkIcon, ArrowRight } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import LandingHeader from "@/components/layout/LandingHeader";

export function UTalkLounge({ posts }: { posts: any[] }) {
    // if (posts.length === 0) return null; // Always show to potential users

    return (
        <section className="mb-24">
            <div className="flex justify-between items-end mb-8 px-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">U-Talk Lounge</h2>
                    <p className="text-slate-500 font-medium">취업, 고민, 그리고 우리들의 이야기</p>
                </div>
                <Link href="/community" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                    전체보기 <ArrowRight size={16} />
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-12 text-center">
                    <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">아직 등록된 이야기가 없어요</h3>
                    <p className="text-slate-500 mb-6">첫 번째 이야기의 주인공이 되어보세요!</p>
                    <Link href="/community/write" className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                        이야기 시작하기
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <Link key={post.id} href={`/community/${post.id}`} className="block group">
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all h-full flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${post.category === 'FREE' ? 'bg-slate-100 text-slate-600' :
                                        post.category === 'QNA' ? 'bg-orange-100 text-orange-600' :
                                            post.category === 'REVIEW' ? 'bg-green-100 text-green-600' :
                                                'bg-indigo-100 text-indigo-600'
                                        }`}>
                                        {post.category}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                    {post.content}
                                </p>
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-400 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare size={14} />
                                        댓글 {post.comment_count}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        조회 {post.view_count}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function HomePageContent({ initialPosts }: { initialPosts: any[] }) {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('loggedin') === 'true') {
            toast.success('로그인되었습니다 :)', {
                duration: 3000,
                className: 'font-bold text-lg',
            });
            // Clean up the URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#B3E5FC] selection:text-slate-900">

            {/* Navigation */}
            <LandingHeader />

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">

                {/* Hero Section (Slogan) */}
                <section className="flex flex-col items-center text-center mb-24 pt-12 relative">
                    {/* Pastel Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-gradient-to-br from-[#B3E5FC] via-[#E1BEE7] to-[#FFCCBC] rounded-full blur-[80px] opacity-40 -z-10"></div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-600 leading-tight">
                        Find the <span className="text-[#81D4FA] drop-shadow-sm">&apos;U&apos;</span><br />
                        in Unique.
                    </h1>
                    <p className="mt-6 text-xl text-slate-500 font-medium max-w-2xl">
                        평범함 속에서 당신만의 특별함을 찾으세요.
                    </p>
                </section>

                {/* Services Grid (Bento Grid Layout) */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)] mb-24">

                    {/* Card 1: Personality */}
                    <Link href="/candidate/personality" className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-[#FFCCBC]/20 transition-all duration-500 overflow-hidden flex flex-col justify-start gap-24 cursor-pointer">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFCCBC] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

                        <div className="w-16 h-16 bg-[#FFCCBC]/20 rounded-2xl flex items-center justify-center text-[#FF8A65] mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Scale size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 group-hover:text-[#FF8A65] transition-colors">인성검사:<br />나를 만나는 시간</h3>
                            <p className="text-slate-500 leading-relaxed font-medium">
                                당신다운 솔직함에 가장 큰 무기입니다.<br />
                                흔들리지 않게 중심을 잡아드릴게요.
                            </p>
                        </div>
                    </Link>

                    {/* Card 2: Aptitude */}
                    {/* Card 2: Aptitude (Disabled) */}
                    <div className="group relative bg-slate-50 border border-slate-100 rounded-[2rem] p-10 overflow-hidden flex flex-col justify-start gap-24 cursor-not-allowed opacity-80">
                        <div className="absolute top-6 right-6 bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                            오픈 준비 중
                        </div>

                        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                            <BrainCircuit size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 text-slate-400">적성검사:<br />숨겨진 능력 깨우기</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                당신의 잠재력을 믿으세요.<br />
                                낯선 문제 앞에서도 당황하지 않도록 준비해드릴게요.
                            </p>
                        </div>
                    </div>

                    {/* Card 3: Interview */}
                    {/* Card 3: Interview (Disabled) */}
                    <div className="group relative bg-slate-50 border border-slate-100 rounded-[2rem] p-10 overflow-hidden flex flex-col justify-start gap-24 cursor-not-allowed opacity-80">
                        <div className="absolute top-6 right-6 bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
                            오픈 준비 중
                        </div>

                        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                            <LinkIcon size={32} strokeWidth={2.5} />
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold mb-3 text-slate-400">면접:<br />경험의 재발견</h3>
                            <p className="text-slate-400 leading-relaxed font-medium">
                                사소하다고 생각했던 당신의 모든 경험이<br />
                                정답이 됩니다.
                            </p>
                        </div>
                    </div>

                </section>

                {/* U-Talk Lounge Section */}
                <UTalkLounge posts={initialPosts} />

            </main>

            {/* Footer */}
            <footer className="w-full py-10 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="text-sm font-bold text-slate-400">
                        Sincerely, your mentor.
                    </div>
                    <div className="text-xs text-slate-300">
                        © U.men.
                    </div>
                </div>
            </footer>

            {/* Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <Link href="/community/write">
                    <button className="w-14 h-14 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform hover:bg-[#FFCCBC] hover:text-slate-900 group">
                        <MessageSquare size={24} className="group-hover:animate-pulse" />
                    </button>
                </Link>
            </div>

        </div>
    );
}
