"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Bell, User } from "lucide-react";
import { PixelBadge } from "@/components/ui/pixel-badge";

const navItems = [
    { label: "대시보드", href: "/student/dashboard" },
    { label: "게임목록", href: "/student/game" },
    { label: "랭킹", href: "/student/stats" },
    { label: "상점", href: "/student/store" },
];

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#fdf5e6] font-sans selection:bg-[#ff2e63] selection:text-white">
            {/* Content Area */}
            <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                {children}
            </main>
        </div>
    );
}
