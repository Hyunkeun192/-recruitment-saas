'use client';

import Link from "next/link";
import { MessageSquare, Scale, BrainCircuit, Link as LinkIcon, ArrowRight } from "lucide-react";

/**
 * 메인 랜딩 페이지 컴포넌트
 * Concept: Clean, Minimalist, Gen Z Target
 * Styles: Bento Grid, Pastel Accents
 * Update: Hero section text removed, image enlarged.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#B3E5FC] selection:text-slate-900">

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="font-bold text-2xl tracking-tighter">U.men.</div>
          <div className="flex gap-4">
            <Link
              href="/login?next=%2Fcandidate%2Fpersonality"
              className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Enter U.
            </Link>
            <Link
              href="/admin/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Enter for Admin
            </Link>
          </div>
        </div>
      </nav>

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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">

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
        <button className="w-14 h-14 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform hover:bg-[#FFCCBC] hover:text-slate-900 group">
          <MessageSquare size={24} className="group-hover:animate-pulse" />
        </button>
      </div>

    </div>
  );
}
