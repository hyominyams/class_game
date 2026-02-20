import { StudentPixelCard } from "@/components/ui/student_pixel-card";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold pixel-font mb-4">SYSTEM SETTINGS</h2>

            <div className="grid gap-6">
                <StudentPixelCard title="시즌 초기화 (위험)" className="bg-red-50 border-red-500">
                    <div className="mt-2">
                        <p className="text-sm text-red-700 mb-4 font-medium">
                            주의: 시즌을 초기화하면 모든 학생의 랭킹 점수와 코인이 초기화될 수 있습니다.
                            백업이 자동으로 수행되지만 신중하게 결정하십시오.
                        </p>
                        <Button variant="destructive" className="border-2 border-black bg-red-500 hover:bg-red-600">
                            ⚠️ 새 시즌 시작 (데이터 초기화)
                        </Button>
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="시스템 공지사항" className="bg-white">
                    <div className="mt-2 space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">전체 공지 메시지</label>
                            <textarea className="w-full h-24 p-2 border-2 border-black rounded resize-none" placeholder="모든 사용자에게 노출될 공지사항을 입력하세요..."></textarea>
                        </div>
                        <div className="flex gap-2">
                            <Button className="bg-[#2d3436] text-white border-2 border-black">저장 및 게시</Button>
                            <Button variant="outline" className="border-2 border-black">미리보기</Button>
                        </div>
                    </div>
                </StudentPixelCard>

                <StudentPixelCard title="보안 설정" className="bg-white">
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="pw-policy" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" defaultChecked />
                            <label htmlFor="pw-policy" className="text-sm font-medium text-gray-900">비밀번호 강제 변경 주기 활성화 (90일)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="mfa" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                            <label htmlFor="mfa" className="text-sm font-medium text-gray-900">교사 계정 2단계 인증(MFA) 권장</label>
                        </div>
                    </div>
                </StudentPixelCard>
            </div>
        </div>
    );
}
