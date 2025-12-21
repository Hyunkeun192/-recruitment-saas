'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

import { Menu, X } from "lucide-react";

export default function LandingHeader() {
    const [user, setUser] = useState<User | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            toast.success("See U");
            await supabase.auth.signOut();
            setUser(null);
            router.refresh();
            setIsMobileMenuOpen(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Close mobile menu when route changes (optional, but good UX)
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [user]); // Close when user state changes, can also listen to pathname if we had access

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100/50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="font-bold text-2xl tracking-tighter z-50 relative">U.men.</Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex gap-4 items-center">
                    <Link href="/community" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                        U-Talk
                    </Link>
                    {user ? (
                        <>
                            <Link
                                href="/candidate/dashboard"
                                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-4 py-2 rounded-full"
                            >
                                My Value Report
                            </Link>
                            <Link
                                href="/admin/login"
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Enter for Admin
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                See U
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login?next=/?loggedin=true"
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
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden z-50 relative p-2 -mr-2 text-slate-600"
                    onClick={toggleMobileMenu}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>

                {/* Mobile Fullscreen Menu */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-white z-40 flex flex-col items-center justify-center gap-8 md:hidden animate-in fade-in slide-in-from-top-10 duration-200">
                        <Link
                            href="/community"
                            className="text-2xl font-bold text-slate-800 hover:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            U-Talk
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/candidate/dashboard"
                                    className="text-xl font-bold text-blue-600 bg-blue-50 px-6 py-3 rounded-full"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    My Value Report
                                </Link>
                                <Link
                                    href="/admin/login"
                                    className="text-lg font-medium text-slate-500"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Enter for Admin
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-lg font-medium text-slate-500"
                                >
                                    See U
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login?next=/?loggedin=true"
                                    className="text-xl font-bold text-blue-600 hover:text-blue-700"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Enter U.
                                </Link>
                                <Link
                                    href="/admin/login"
                                    className="text-lg font-medium text-slate-500"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Enter for Admin
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
