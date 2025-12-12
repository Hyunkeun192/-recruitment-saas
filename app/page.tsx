import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, FileText } from "lucide-react";

/**
 * 메인 랜딩 페이지 컴포넌트
 * 
 * 방문자에게 서비스의 주요 기능을 소개하고
 * 관리자 및 지원자, 게스트 포털로의 진입점을 제공합니다.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* 네비게이션 바 */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="font-bold text-2xl tracking-tighter">MEETUP</div>
        <div className="flex gap-6 text-sm font-medium text-slate-300">
          <Link href="#" className="hover:text-white transition-colors">주요 기능</Link>
          <Link href="#" className="hover:text-white transition-colors">요금 안내</Link>
          <Link href="#" className="hover:text-white transition-colors">문의하기</Link>
        </div>
        <div className="flex gap-4">
          <Link
            href="/admin/login"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all backdrop-blur-sm"
          >
            관리자 로그인
          </Link>
          <Link
            href="/jobs"
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-blue-500/25"
          >
            채용 공고 보기
          </Link>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          PIPA 개인정보보호법 준수 v1.0
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          안전하고 강력한 <br className="hidden md:block" />
          AI 기반 채용 플랫폼
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed word-keep-all">
          지원자 접수부터 온라인 역량 평가, 결과 분석까지 하나로 해결하세요.
          자동화된 테스트와 완벽한 보안으로 채용 프로세스를 혁신합니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* '관리자로 시작하기' 버튼 제거됨 */}
          <Link
            href="/test/demo"
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold transition-all backdrop-blur-sm"
          >
            데모 테스트 체험
          </Link>
        </div>

        {/* 주요 기능 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full text-left">
          <FeatureCard
            icon={<ShieldCheck className="text-emerald-400" size={24} />}
            title="법적 준수 및 보안"
            desc="모든 개인정보는 AES-256으로 암호화됩니다. 외부 평가자를 위한 블라인드 모드를 지원합니다."
          />
          <FeatureCard
            icon={<FileText className="text-amber-400" size={24} />}
            title="엑셀 문제은행 연동"
            desc="1000개 이상의 문제를 엑셀로 한 번에 업로드하고, 자동으로 테스트 세트를 생성하세요."
          />
          <FeatureCard
            icon={<Users className="text-pink-400" size={24} />}
            title="부정행위 방지 시스템"
            desc="화면 이탈 감지, 포커스 모니터링 등 강력한 안티 치팅 기술이 적용되어 있습니다."
          />
        </div>
      </main>
    </div>
  );
}

/**
 * 기능 소개 카드 컴포넌트
 */
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors backdrop-blur-sm">
      <div className="mb-4 w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed word-keep-all">{desc}</p>
    </div>
  );
}
