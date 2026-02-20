import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import { getAdminDashboardStats } from "./actions";

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats();

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
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
                    <p className="text-sm text-gray-500 mt-1">Today's Plays</p>
                </StudentPixelCard>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <StudentPixelCard title="최근 가입자 현황" className="bg-white col-span-1">
                    <div className="flex items-center justify-center h-40 text-gray-400">
                        데이터 준비 중...
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="학급별 활동 순위" className="bg-white col-span-1">
                    <div className="flex items-center justify-center h-40 text-gray-400">
                        데이터 준비 중...
                    </div>
                </StudentPixelCard>
            </div>
        </div>
    );
}

