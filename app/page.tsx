'use client';

import Link from "next/link";
import Image from "next/image";
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
              Candidate Log-in
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

        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-16 pt-4">

          {/* Expanded Image Area (16:9 Wide) */}
          <div className="relative w-[80%] aspect-video group rounded-3xl overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FFCCBC]/10 to-[#B3E5FC]/10 opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative w-full h-full transform transition-transform duration-1000 ease-out hover:scale-[1.02]">
              <Image
                src="/images/hero-wide-puzzle.png"
                alt="Puzzle Fit Illustration"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

        </section>

        {/* Services Grid (Bento Grid Layout) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">

          {/* Card 1: Personality */}
          <Link href="/candidate/personality" className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-[#FFCCBC]/20 transition-all duration-500 overflow-hidden flex flex-col justify-between cursor-pointer">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFCCBC] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

            <div className="w-16 h-16 bg-[#FFCCBC]/20 rounded-2xl flex items-center justify-center text-[#FF8A65] mb-6 group-hover:scale-110 transition-transform duration-300">
              <Scale size={32} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#FF8A65] transition-colors">인성검사:<br />솔직함의 전략</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                착한 척하면 탈락합니다.<br />
                일관성을 지키세요.
              </p>
            </div>
          </Link>

          {/* Card 2: Aptitude */}
          <Link href="/candidate/aptitude" className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-[#B3E5FC]/20 transition-all duration-500 overflow-hidden flex flex-col justify-between cursor-pointer">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B3E5FC] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

            <div className="w-16 h-16 bg-[#B3E5FC]/30 rounded-2xl flex items-center justify-center text-[#039BE5] mb-6 group-hover:scale-110 transition-transform duration-300">
              <BrainCircuit size={32} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-[#039BE5] transition-colors">적성검사:<br />뇌지컬 트레이닝</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                매일 10분,<br />
                일머리 근육을 키우세요.
              </p>
            </div>
          </Link>

          {/* Card 3: Interview */}
          <div
            onClick={() => alert("추후 서비스 오픈 예정입니다.")}
            className="group relative bg-white border border-slate-100 rounded-[2rem] p-10 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col justify-between cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity translate-x-1/2 -translate-y-1/2"></div>

            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <LinkIcon size={32} strokeWidth={2.5} />
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-slate-600 transition-colors">면접:<br />경험의 연결</h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                내 경험을 기업의 언어로<br />
                통역해 드립니다.
              </p>
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-sm font-bold text-slate-400">
            10년 차 채용 설계자의 U.men
          </div>
          <div className="text-xs text-slate-300">
            © 2024 U.men
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
