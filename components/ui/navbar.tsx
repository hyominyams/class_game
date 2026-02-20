'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bell, User, LogOut, Lock } from 'lucide-react';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { useState, useEffect } from 'react';
import { getUserCoins } from '@/app/actions/store';
import { signOutAction } from '@/app/actions/auth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NavBar() {
    const pathname = usePathname();
    const isLogin = pathname !== '/' && pathname !== '/login';

    const isStudent = pathname.startsWith('/student');

    const navItems = [
        { label: "대시보드", href: "/student/dashboard" },
        { label: "게임목록", href: "/student/game" },
        { label: "학습기록", href: "/student/stats" },
        { label: "랭킹", href: "/student/ranking" },
        { label: "상점", href: "/student/store" },
    ];

    // Determine dashboard link based on current section
    const getDashboardLink = () => {
        if (pathname.includes('/teacher')) return '/teacher/dashboard';
        if (pathname.includes('/admin')) return '/admin/dashboard';
        return '/student/dashboard'; // Default fallback
    };

    // State for user coins
    const [coins, setCoins] = useState<number | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        const fetchCoins = async () => {
            if (isLogin && isStudent) {
                const balance = await getUserCoins();
                setCoins(balance);
            }
        };
        fetchCoins();
    }, [isLogin, isStudent, pathname]); // Re-fetch on pathname change in case balance updates

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[#fdf5e6] border-b-[4px] border-[#18181b] font-pixel">
            <div className="flex items-center gap-2">
                <Link href={isLogin ? getDashboardLink() : "/"} className="text-sm sm:text-base font-black tracking-tighter text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                    SINWOL
                </Link>
            </div>

            {/* Central Navigation for Student Section */}
            {isStudent && (
                <div className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-[10px] font-bold transition-all ${isActive
                                    ? "text-[#ff2e63] border-b-2 border-[#ff2e63] pb-1"
                                    : "text-[#18181b]/60 hover:text-[#18181b]"
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center gap-4">
                {isLogin ? (
                    <>
                        {isStudent && (
                            <div className="hidden sm:flex items-center gap-1 bg-[#fbbf24] px-2 py-1 border-2 border-[#18181b] shadow-[2px_2px_0px_#18181b] mr-2">
                                <span className="text-sm">🪙</span>
                                <span className="text-[10px] font-black">{coins !== null ? coins.toLocaleString() : '...'}</span>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="hover:bg-transparent">
                            <Bell className="h-6 w-6 text-[#18181b] hover:text-[#ff2e63] transition-colors" />
                        </Button>

                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-transparent">
                                    <User className="h-6 w-6 text-[#18181b] hover:text-[#ff2e63] transition-colors" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-[#fdf5e6] border-2 border-black font-pixel">
                                <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-black/20" />
                                <DropdownMenuItem asChild className="cursor-pointer focus:bg-[#ff2e63]/10">
                                    <Link href={getDashboardLink()}>
                                        대시보드
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer focus:bg-[#ff2e63]/10"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsPasswordModalOpen(true);
                                    }}
                                >
                                    <Lock className="mr-2 h-4 w-4" />
                                    <span>비밀번호 변경</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-black/20" />

                                <DropdownMenuItem
                                    className="cursor-pointer text-[#ff2e63] focus:text-[#ff2e63] focus:bg-[#ff2e63]/10"
                                    onClick={async () => {
                                        await signOutAction();
                                    }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>로그아웃</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <ChangePasswordModal
                            open={isPasswordModalOpen}
                            onOpenChange={setIsPasswordModalOpen}
                        />
                    </>
                ) : (
                    <Link href="/login">
                        <button className="px-4 py-2 bg-white border-[3px] border-[#18181b] shadow-[4px_4px_0px_#18181b] text-[10px] font-black hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#18181b] active:translate-y-[2px] active:shadow-none transition-all">
                            LOGIN
                        </button>
                    </Link>
                )}
            </div>

            <style jsx>{`
                @font-face {
                    font-family: 'Pixel';
                    src: url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                }
                .font-pixel {
                    font-family: 'Press Start 2P', system-ui, sans-serif;
                }
            `}</style>
        </nav >
    );
}
