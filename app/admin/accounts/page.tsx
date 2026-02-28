import { AccountManager } from "@/components/admin/account-manager";

export default function AdminAccountsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]">
                <div>
                    <h2 className="text-xl font-bold">계정 관리</h2>
                    <p className="text-sm text-gray-500">교사 및 학생 계정을 관리하고 일괄 등록(CSV)하거나 삭제할 수 있습니다.</p>
                </div>
            </div>

            <AccountManager />
        </div>
    );
}
