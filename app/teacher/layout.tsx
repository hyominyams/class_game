import { TeacherPixelTabs } from "@/components/ui/teacher_pixel-tabs";
import { NavBar } from "@/components/ui/navbar";

const routes = [
    { label: "학급 현황", href: "/teacher/dashboard", exact: true },
    { label: "계정 관리", href: "/teacher/accounts" },
    { label: "문제 관리", href: "/teacher/questions" },
    { label: "대회 관리", href: "/teacher/tournaments" },
];

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f0f0f0]">
            <NavBar />
            <div className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold mb-4 pixel-font text-[#2d3436]">TEACHER MODE</h1>
                    <TeacherPixelTabs routes={routes} />
                </header>
                <main className="pb-10 min-h-[600px] p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
