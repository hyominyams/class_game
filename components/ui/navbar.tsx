'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell, Lock, LogOut, TrendingDown, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { getUserCoins } from '@/app/actions/store';
import { signOutAction } from '@/app/actions/auth';
import { getStudentNotificationsAction } from '@/app/actions/notifications';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StudentNotification = {
    id: string;
    type: 'coin_grant' | 'rank_up' | 'rank_down';
    title: string;
    description: string;
    createdAt: string;
    href: string;
};

const STUDENT_HEADER_CACHE_TTL_MS = 30_000;

function formatRelativeTime(iso: string) {
    const eventTime = new Date(iso).getTime();
    if (Number.isNaN(eventTime)) return '';

    const diffMs = Date.now() - eventTime;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;

    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
}

function notificationTone(type: StudentNotification['type']) {
    if (type === 'rank_up') return 'bg-emerald-300';
    if (type === 'rank_down') return 'bg-orange-300';
    return 'bg-yellow-300';
}

function notificationIcon(type: StudentNotification['type']) {
    if (type === 'rank_up') return <TrendingUp className="h-4 w-4" />;
    if (type === 'rank_down') return <TrendingDown className="h-4 w-4" />;
    return <span className="text-xs">💰</span>;
}

export function NavBar() {
    const pathname = usePathname();
    const isLogin = pathname !== '/' && pathname !== '/login';
    const isStudent = pathname.startsWith('/student');

    const navItems = [
        { label: '대시보드', href: '/student/dashboard' },
        { label: '게임목록', href: '/student/game' },
        { label: '학습기록', href: '/student/stats' },
        { label: '랭킹', href: '/student/ranking' },
        { label: '상점', href: '/student/store' },
        { label: '마이페이지', href: '/student/my' },
    ];

    const getDashboardLink = () => {
        if (pathname.includes('/teacher')) return '/teacher/dashboard';
        if (pathname.includes('/admin')) return '/admin/dashboard';
        return '/student/dashboard';
    };

    const [coins, setCoins] = useState<number | null>(null);
    const [notifications, setNotifications] = useState<StudentNotification[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const lastFetchedAtRef = useRef(0);

    useEffect(() => {
        let cancelled = false;

        const fetchStudentHeaderData = async (force = false) => {
            if (!isLogin || !isStudent) {
                if (!cancelled) {
                    setCoins(null);
                    setNotifications([]);
                    setIsLoadingNotifications(false);
                }
                lastFetchedAtRef.current = 0;
                return;
            }

            if (!force && Date.now() - lastFetchedAtRef.current < STUDENT_HEADER_CACHE_TTL_MS) {
                return;
            }

            setIsLoadingNotifications(true);
            try {
                const [balance, notificationResult] = await Promise.all([
                    getUserCoins(),
                    getStudentNotificationsAction(8),
                ]);

                if (cancelled) return;
                setCoins(balance);
                setNotifications(notificationResult.notifications || []);
                lastFetchedAtRef.current = Date.now();
            } catch (error) {
                if (!cancelled) {
                    setNotifications([]);
                }
                console.error('Failed to fetch student notifications:', error);
            } finally {
                if (!cancelled) {
                    setIsLoadingNotifications(false);
                }
            }
        };

        const refreshStudentHeader = () => {
            void fetchStudentHeaderData(true);
        };

        void fetchStudentHeaderData(false);
        window.addEventListener('student-header-refresh', refreshStudentHeader);
        return () => {
            cancelled = true;
            window.removeEventListener('student-header-refresh', refreshStudentHeader);
        };
    }, [isLogin, isStudent, pathname]);

    const unreadCount = notifications.length;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-16 bg-[#fdf5e6] border-b-[4px] border-[#18181b] font-pixel">
            <div className="flex items-center gap-2">
                <Link
                    href={isLogin ? getDashboardLink() : '/'}
                    className="text-sm sm:text-base font-black tracking-tighter text-[#3b82f6] hover:text-[#2563eb] transition-colors"
                >
                    SINWOL
                </Link>
            </div>

            {isStudent && (
                <div className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`text-[10px] font-bold transition-all ${isActive
                                    ? 'text-[#ff2e63] border-b-2 border-[#ff2e63] pb-1'
                                    : 'text-[#18181b]/60 hover:text-[#18181b]'
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

                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-transparent relative">
                                    <Bell className="h-6 w-6 text-[#18181b] hover:text-[#ff2e63] transition-colors" />
                                    {isStudent && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[#ff2e63] text-white text-[9px] leading-5 text-center rounded-full border-2 border-black">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[22rem] bg-[#fdf5e6] border-2 border-black font-pixel p-0">
                                <div className="px-3 py-2 border-b border-black/20 flex items-center justify-between">
                                    <DropdownMenuLabel className="p-0">알림</DropdownMenuLabel>
                                    {isStudent && (
                                        <span className="text-[10px] font-bold text-[#ff2e63]">{unreadCount}건</span>
                                    )}
                                </div>

                                {isStudent ? (
                                    <div className="max-h-80 overflow-y-auto">
                                        {isLoadingNotifications ? (
                                            <div className="px-3 py-6 text-center text-[10px] text-black/60">알림을 불러오는 중...</div>
                                        ) : notifications.length === 0 ? (
                                            <div className="px-3 py-6 text-center text-[10px] text-black/60">새로운 이슈가 없습니다.</div>
                                        ) : (
                                            notifications.map((item) => (
                                                <DropdownMenuItem asChild key={item.id} className="p-0 focus:bg-[#ff2e63]/10">
                                                    <Link href={item.href} className="w-full flex items-start gap-3 px-3 py-3 cursor-pointer">
                                                        <span className={`shrink-0 w-8 h-8 border-2 border-black rounded-md flex items-center justify-center ${notificationTone(item.type)}`}>
                                                            {notificationIcon(item.type)}
                                                        </span>
                                                        <span className="flex-1 min-w-0">
                                                            <span className="block text-[10px] font-bold text-black truncate">{item.title}</span>
                                                            <span className="block text-[10px] text-black/70 mt-1 leading-4 break-words">{item.description}</span>
                                                            <span className="block text-[9px] text-black/50 mt-1">{formatRelativeTime(item.createdAt)}</span>
                                                        </span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div className="px-3 py-6 text-center text-[10px] text-black/60">학생 페이지에서 알림을 확인할 수 있습니다.</div>
                                )}

                                {isStudent && notifications.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator className="bg-black/20 m-0" />
                                        <DropdownMenuItem asChild className="focus:bg-[#ff2e63]/10">
                                            <Link href="/student/ranking" className="w-full text-center justify-center text-[10px] font-bold py-2">
                                                랭킹 보기
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-transparent">
                                    <User className="h-6 w-6 text-[#18181b] hover:text-[#ff2e63] transition-colors" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-[#fdf5e6] border-2 border-black font-pixel">
                                <DropdownMenuLabel>계정</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-black/20" />
                                <DropdownMenuItem asChild className="cursor-pointer focus:bg-[#ff2e63]/10">
                                    <Link href={getDashboardLink()}>
                                        대시보드
                                    </Link>
                                </DropdownMenuItem>
                                {isStudent && (
                                    <DropdownMenuItem asChild className="cursor-pointer focus:bg-[#ff2e63]/10">
                                        <Link href="/student/my">마이페이지</Link>
                                    </DropdownMenuItem>
                                )}
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
        </nav>
    );
}
