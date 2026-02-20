import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";
import { QuickActionsCarousel } from "@/components/ui/quick-actions-carousel";
import { ClassSettingsModal } from "@/components/teacher/class-settings-modal";

const quickActions = [
    {
        id: "tournament",
        title: "대회 개최",
        icon: "trophy",
        color: "#2d3436",
        path: "/teacher/tournaments",
    },
    {
        id: "add_student",
        title: "학생 추가",
        icon: "plus",
        color: "#6c5ce7",
        path: "/teacher/accounts",
    },
    {
        id: "give_coin",
        title: "코인 지급",
        icon: "coins",
        color: "#00b894",
        path: "/teacher/accounts",
    },
    {
        id: "create_problem",
        title: "문제 출제",
        icon: "pencil",
        color: "#fdcb6e",
        path: "/teacher/questions",
    },
];

export default function TeacherDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <StudentPixelCard title="학급 현황" className="bg-white" action={<ClassSettingsModal />}>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-sm text-gray-500">총 학생</p>
                            <p className="text-3xl font-bold">24명</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">평균 점수</p>
                            <p className="text-3xl font-bold text-[#08d9d6]">84.5</p>
                        </div>
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="진행 중인 대회" className="bg-white border-dashed border-[#ff2e63]">
                    <div className="mt-2">
                        <h3 className="font-bold text-lg">2월 학급 대항전</h3>
                        <p className="text-sm text-gray-500 mb-2">종료까지: 2일 5시간</p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-[#ff2e63] h-2.5 rounded-full" style={{ width: "75%" }}></div>
                        </div>
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="읽지 않은 알림" className="bg-white">
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-4xl">🔔</span>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-[#ff2e63]">3건</p>
                            <p className="text-xs text-gray-500">새로운 쿠폰 사용 요청</p>
                        </div>
                    </div>
                </StudentPixelCard>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <StudentPixelCard title="최근 학생 활동" className="bg-white col-span-1">
                    <ul className="space-y-3 mt-2">
                        <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span><span className="font-bold">김철수</span> 학생이 <span className="text-[#08d9d6]">구구단 챌린지</span>에서 신기록 달성!</span>
                            <span className="text-gray-400 text-xs">10분 전</span>
                        </li>
                        <li className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span><span className="font-bold">이영희</span> 학생이 <span className="text-[#ff2e63]">숙제 면제권</span>을 구매했습니다.</span>
                            <span className="text-gray-400 text-xs">30분 전</span>
                        </li>
                        <li className="flex justify-between items-center text-sm">
                            <span><span className="font-bold">박민수</span> 학생이 회원가입을 완료했습니다.</span>
                            <span className="text-gray-400 text-xs">1시간 전</span>
                        </li>
                    </ul>
                </StudentPixelCard>

                <div className="bg-white col-span-1 rounded-xl p-6 border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center">
                    <h3 className="text-xl font-bold mb-4 font-pixel w-full text-left">빠른 실행</h3>
                    <QuickActionsCarousel actions={quickActions} />
                </div>
            </div>
        </div>
    );
}
