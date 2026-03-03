import { AdminNavBar } from "@/components/admin/admin-navbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#fdf5e6] font-sans selection:bg-[#ff2e63] selection:text-white">
            <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-12">
                <header className="mb-6 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <h1 className="font-pixel text-2xl md:text-3xl text-[#2d3436]">관리자 대시보드</h1>
                        <span className="inline-flex items-center justify-center w-fit px-3 py-1 bg-[#6c5ce7] border-2 border-black rounded text-xs font-black text-white shadow-[2px_2px_0_0_black]">
                            ADMIN MODE
                        </span>
                    </div>

                    <AdminNavBar />
                </header>

                <main className="min-h-[600px]">{children}</main>
            </div>
        </div>
    );
}
