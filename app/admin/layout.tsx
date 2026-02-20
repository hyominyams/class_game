import { AdminPixelTabs } from "@/components/ui/admin_pixel-tabs";
import { NavBar } from "@/components/ui/navbar";

const routes = [
    { label: "전체 현황", href: "/admin/dashboard", exact: true },
    { label: "학교/학급 관리", href: "/admin/classes" },
    { label: "학년 대회", href: "/admin/tournaments" },
    { label: "시스템 설정", href: "/admin/settings" },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#b2bec3]">
            <NavBar />
            <div className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold mb-4 pixel-font text-[#2d3436]">ADMIN CONTROLLER</h1>
                    <AdminPixelTabs routes={routes} />
                </header>
                <main className="pb-10 bg-transparent min-h-[600px] p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
