import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";

export default function AdminTournamentsPage() {
    return (
        <div className="space-y-6">
            <div className="bg-[#6c5ce7] text-white p-6 rounded border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
                <div>
                    <span className="inline-block px-2 py-1 bg-black text-[#fdcb6e] font-bold text-xs mb-2">GRADE TOURNAMENT</span>
                    <h2 className="text-3xl font-bold pixel-font">학년별 대항전 관리</h2>
                    <p className="opacity-90 mt-1">학년 전체가 참여하는 대규모 이벤트를 주최합니다.</p>
                </div>
                <Button className="bg-[#fdcb6e] text-black border-2 border-black font-bold h-12 px-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transform hover:scale-105 transition-transform">
                    🚀 새 대회 개최하기
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <StudentPixelCard title="진행 중인 대회" className="bg-white border-2 border-[#6c5ce7]">
                    <div className="p-4 bg-gray-50 rounded border border-gray-200 text-center py-10">
                        <p className="text-gray-500">현재 진행 중인 학년 대회가 없습니다.</p>
                        <Button variant="link" className="mt-2 text-[#6c5ce7]">지난 대회 기록 보기</Button>
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="랭킹 리보드 (전체)" className="bg-white">
                    <div className="space-y-2 mt-2">
                        <div className="flex justify-between items-center p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <span className="font-bold">🥇 5학년 2반</span>
                            <span className="font-mono font-bold">45,200 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded">
                            <span className="font-bold">🥈 6학년 1반</span>
                            <span className="font-mono font-bold">42,850 pts</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-200 rounded">
                            <span className="font-bold">🥉 5학년 3반</span>
                            <span className="font-mono font-bold">40,100 pts</span>
                        </div>
                    </div>
                </StudentPixelCard>
            </div>
        </div>
    );
}
