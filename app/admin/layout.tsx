'use client';

import { Sidebar } from '@/components/admin/sidebar';
import { usePathname } from 'next/navigation';

/**
 * 관리자 레이아웃 (AdminLayout)
 * 
 * 관리자 페이지의 공통 껍데기입니다. 좌측 사이드바 및 상단 헤더를 포함합니다.
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    return (
        <div className="flex h-screen bg-gray-50">
            {/* 사이드바 - 로그인 페이지에서는 숨김 */}
            {!isLoginPage && <Sidebar />}

            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 overflow-auto">
                {!isLoginPage && (
                    <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
                        <h2 className="font-semibold text-slate-800">관리자</h2>
                        <div className="flex items-center gap-4">
                            {/* 프로필 등 헤더 아이템 */}
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                AD
                            </div>
                        </div>
                    </header>
                )}
                <div className={!isLoginPage ? "p-6 max-w-7xl mx-auto" : ""}>
                    {children}
                </div>
            </main>
        </div>
    );
}
