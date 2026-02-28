"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "대시보드", href: "/teacher/dashboard" },
    { label: "계정관리", href: "/teacher/accounts" },
    { label: "코인지급", href: "/teacher/coins" },
    { label: "문제출제", href: "/teacher/questions" },
];

export function TeacherDashboardNavbar() {
    const pathname = usePathname();

    return (
        <nav className="border-b-[3px] border-black mt-2">
            <ul className="flex flex-wrap items-end gap-6 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <li key={item.href} className="relative z-10 -mb-[3px]">
                            <Link
                                href={item.href}
                                className={cn(
                                    "inline-flex h-10 items-center border-b-[3px] px-1 pb-1 text-[15px] md:text-[16px] font-black tracking-tight transition-colors",
                                    isActive
                                        ? "border-[#ff2e63] text-[#ff2e63]"
                                        : "border-transparent text-gray-500 hover:text-black"
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

