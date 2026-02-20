"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const tabVariants = cva(
    "inline-flex h-12 items-center justify-center whitespace-nowrap px-6 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "border-2 border-transparent hover:bg-black/5 text-gray-700",
                active: "bg-[#6c5ce7] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px] rubik-font font-bold",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface TabRoute {
    label: string;
    href: string;
    exact?: boolean;
}

interface AdminPixelTabsProps {
    className?: string;
    routes: TabRoute[];
}

export function AdminPixelTabs({ className, routes }: AdminPixelTabsProps) {
    const pathname = usePathname();

    return (
        <div className={cn("flex space-x-2 border-b-4 border-black bg-transparent p-2", className)}>
            {routes.map((route) => {
                const isActive = route.exact
                    ? pathname === route.href
                    : pathname.startsWith(route.href);

                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            tabVariants({ variant: isActive ? "active" : "default" }),
                            "rounded-t-lg transition-transform active:translate-y-[0px] active:shadow-none"
                        )}
                    >
                        {route.label}
                    </Link>
                );
            })}
        </div>
    );
}
