'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export default function LandingHeader() {
    const [user, setUser] = useState<User | null>(null);
    const supabase = createClient();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            toast.success("See U");
            await supabase.auth.signOut();
            setUser(null);
            router.refresh();
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

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

    return (
        <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="font-bold text-2xl tracking-tighter">U.men.</div>
                <div className="flex gap-4 items-center">
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
            </div>
        </nav>
    );
}
