'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, FileText, Users, Settings, LogOut, Briefcase } from 'lucide-react';

// ... imports ...

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
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 로그인 페이지는 인증 체크 제외
        if (pathname.startsWith('/admin/login')) {
            setLoading(false);
            return;
        }

        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/admin/login');
            } else {
                setLoading(false);
            }
        };
        checkAuth();
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            {/* 사이드바 */}
            <aside className="w-64 bg-white border-r shadow-sm hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        MEETUP
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">관리자 콘솔</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <NavLink href="/admin/dashboard" icon={<LayoutDashboard size={18} />}>
                        대시보드
                    </NavLink>
                    <NavLink href="/admin/postings" icon={<Briefcase size={18} />}>
                        채용 공고
                    </NavLink>

                    {/* 문제 관리 Submenu */}
                    <div className="pt-2 pb-1">
                        <div className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-500">
                            <FileText size={18} />
                            문제 관리
                        </div>
                        <div className="pl-4 space-y-1">
                            <NavLink href="/admin/questions?tab=APTITUDE" icon={<div className="w-1.5 h-1.5 rounded-full bg-slate-400" />} isSubItem>
                                적성검사
                            </NavLink>
                            <NavLink href="/admin/questions?tab=PERSONALITY" icon={<div className="w-1.5 h-1.5 rounded-full bg-slate-400" />} isSubItem>
                                인성검사
                            </NavLink>
                        </div>
                    </div>

                    <NavLink href="/admin/candidates" icon={<Users size={18} />}>
                        지원자 현황
                    </NavLink>
                </nav>

                <div className="p-4 border-t">
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                        <LogOut size={18} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* 메인 콘텐츠 영역 */}
            <main className="flex-1 overflow-auto">
                <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
                    <h2 className="font-semibold text-slate-800">관리자</h2>
                    <div className="flex items-center gap-4">
                        {/* 프로필 등 헤더 아이템 */}
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                            AD
                        </div>
                    </div>
                </header>
                <div className="p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

import { useSearchParams } from 'next/navigation';

function NavLink({ href, icon, children, isSubItem = false }: { href: string; icon: React.ReactNode; children: React.ReactNode; isSubItem?: boolean }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Construct full current path with query for accurate comparison if needed
    // But mostly we check if pathname starts with href's pathname
    // For sub-items with query (e.g. ?tab=X), we should check if current query matches

    const [targetPath, targetQuery] = href.split('?');
    const isActive = pathname === targetPath && (!targetQuery || searchParams.get('tab') === new URLSearchParams(targetQuery).get('tab'));

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors group
                ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}
                ${isSubItem ? 'text-sm' : ''}
            `}
        >
            <span className={`transition-transform duration-200 ${isActive ? 'scale-110 text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {icon}
            </span>
            {children}
        </Link>
    );
}
