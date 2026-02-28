import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { getAdminDashboardStats } from "./actions";
import Link from "next/link";
import { ArrowRight, ShieldCheck, School, Users, Gamepad2, Bell } from "lucide-react";

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats();

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-pixel text-2xl md:text-3xl font-bold leading-tight">
                        서비스 현황, <span className="text-[#6c5ce7]">관리자</span>님
                    </h1>
                    <p className="font-bold text-gray-500 mt-1">오늘 운영 상태를 한눈에 확인해보세요.</p>
                </div>
                <div className="flex items-center gap-2 bg-[#fbbf24] px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_black] rounded-lg">
                    <Bell className="w-5 h-5 text-black" />
                    <span className="font-pixel font-bold text-sm">운영 알림 2건</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StudentPixelCard title="총 학생 수" className="bg-white">
                            <div className="mt-2 text-3xl font-bold">
                                {stats.totalStudents.toLocaleString()}명
                            </div>
                        </StudentPixelCard>

                        <StudentPixelCard title="총 교사 수" className="bg-white">
                            <div className="mt-2 text-3xl font-bold text-[#6c5ce7]">
                                {stats.totalTeachers.toLocaleString()}명
                            </div>
                        </StudentPixelCard>

                        <StudentPixelCard title="개설 학급 수" className="bg-white">
                            <div className="mt-2 text-3xl font-bold text-orange-600">
                                {stats.totalClasses.toLocaleString()}개 반
                            </div>
                        </StudentPixelCard>

                        <StudentPixelCard title="금일 게임 플레이" className="bg-white">
                            <div className="mt-2 text-3xl font-bold text-green-600">
                                {stats.gamePlays.toLocaleString()}회
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Today</p>
                        </StudentPixelCard>
                    </div>

                    <Link href="/admin/classes" className="block relative group cursor-pointer hover:no-underline">
                        <div className="absolute inset-0 bg-black rounded-lg translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
                        <div className="relative bg-[#dfe6ff] border-4 border-black rounded-lg p-6 md:p-8 flex items-center justify-between overflow-hidden group-hover:-translate-y-1 transition-transform">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')]"></div>
                            <div className="z-10 relative">
                                <span className="inline-block bg-[#6c5ce7] text-white text-xs font-bold px-2 py-1 rounded border-2 border-black mb-2 shadow-[2px_2px_0_0_black]">
                                    SYSTEM CONTROL
                                </span>
                                <h2 className="font-pixel text-2xl md:text-3xl font-bold mb-2">학교/학급 관리로 이동</h2>
                                <p className="font-bold text-slate-700 mb-4 max-w-sm">
                                    학년/반 구조와 계정 상태를 점검하고 필요한 운영 조치를 실행하세요.
                                </p>
                                <div className="inline-flex items-center justify-center h-10 px-4 py-2 bg-[#6c5ce7] text-white font-bold rounded border-2 border-black shadow-[2px_2px_0_0_black] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_black] transition-all">
                                    관리 화면 열기 <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>
                            <div className="hidden md:flex items-center justify-center opacity-80 rotate-[-10deg] mr-8">
                                <div className="w-28 h-28 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white">
                                    <ShieldCheck className="w-14 h-14 text-[#2d3436]" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="space-y-6">
                    <StudentPixelCard title="운영 요약" className="bg-white">
                        <ul className="space-y-3 mt-2">
                            <li className="flex items-center justify-between text-sm font-bold border-b border-gray-100 pb-2">
                                <span className="inline-flex items-center gap-2"><School className="w-4 h-4" /> 활동 학급</span>
                                <span>{stats.totalClasses}개</span>
                            </li>
                            <li className="flex items-center justify-between text-sm font-bold border-b border-gray-100 pb-2">
                                <span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> 총 사용자</span>
                                <span>{(stats.totalStudents + stats.totalTeachers).toLocaleString()}명</span>
                            </li>
                            <li className="flex items-center justify-between text-sm font-bold">
                                <span className="inline-flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> 오늘 플레이</span>
                                <span className="text-[#08d9d6]">{stats.gamePlays.toLocaleString()}회</span>
                            </li>
                        </ul>
                    </StudentPixelCard>

                    <StudentPixelCard title="시스템 메모" className="bg-white">
                        <div className="space-y-2 text-sm font-bold text-gray-600 mt-2">
                            <p>• 학년 대회 생성 전 문제세트 활성 상태를 확인하세요.</p>
                            <p>• 계정 일괄 생성 작업 전 중복 ID를 점검하세요.</p>
                            <p>• 코인 대량 지급은 로그와 함께 사유를 기록하세요.</p>
                        </div>
                    </StudentPixelCard>
                </div>
            </div>
        </div>
    );
}

