"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type AdminNavItem = {
    label: string;
    href: string;
};

const adminNavItems: AdminNavItem[] = [
    { label: "대시보드", href: "/admin/dashboard" },
    { label: "학급 관리", href: "/admin/classes" },
    { label: "계정 관리", href: "/admin/accounts" },
    { label: "문제 출제", href: "/admin/questions" },
    { label: "대회 관리", href: "/admin/tournaments" },
];

export function AdminNavBar() {
    const pathname = usePathname();

    return (
        <nav className="mb-6 border-b-4 border-black">
            <ul className="flex flex-wrap items-end gap-5 px-1">
                {adminNavItems.map((item) => {
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
