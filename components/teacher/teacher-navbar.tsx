"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TeacherNavItem = {
    label: string;
    href: string;
};

const teacherNavItems: TeacherNavItem[] = [
    { label: "대시보드", href: "/teacher/dashboard" },
    { label: "계정관리", href: "/teacher/accounts" },
    { label: "코인지급", href: "/teacher/coins" },
    { label: "문제출제", href: "/teacher/questions" },
];

export function TeacherNavBar() {
    const pathname = usePathname();

    return (
        <nav className="mb-6 border-b-4 border-black">
            <ul className="flex flex-wrap items-end gap-5 px-1">
                {teacherNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "inline-flex h-10 items-center pb-2 text-[12px] md:text-sm font-black transition-colors",
                                    isActive
                                        ? "text-[#ff2e63] border-b-2 border-[#ff2e63]"
                                        : "text-[#18181b]/60 hover:text-[#18181b]"
                                )}
                            >
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}