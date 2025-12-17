'use client';

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const router = useRouter();

    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogoutClick = () => {
        setShowLogoutDialog(true);
    };

    const handleConfirmLogout = async () => {
        try {
            // [MODIFIED] 로그아웃 시 페이지 이탈 경고 방지 플래그 설정
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('is_logout_process', 'true');
            }

            setIsLoggingOut(true);
            await supabase.auth.signOut();
            router.push("/"); // Go to home
            router.refresh();
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            setIsLoggingOut(false);
            setShowLogoutDialog(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl tracking-tighter hover:text-blue-600 transition-colors">
                        U.men.
                    </Link>

                    <div className="flex items-center gap-4">

                        <button
                            onClick={handleLogoutClick}
                            className="text-sm font-medium text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <LogOut size={16} />
                            로그아웃
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {children}
            </main>

            {/* Logout Confirmation Dialog */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>로그아웃 확인</DialogTitle>
                        <DialogDescription>
                            로그아웃을 진행해도 괜찮을까요?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
                            취소
                        </Button>
                        <Button
                            className="bg-pink-400 hover:bg-pink-500 text-white border-none focus-visible:ring-pink-400"
                            onClick={handleConfirmLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? '로그아웃 중...' : '네, 로그아웃 합니다'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
