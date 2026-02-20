"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { PixelButton } from "./pixel-button"
import { X } from "lucide-react"

interface PixelModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
}

export function PixelModal({ isOpen, onClose, title, children, className }: PixelModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div
                className={cn(
                    "relative w-full max-w-lg overflow-hidden bg-[#fdf5e6] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-lg border-4 border-black",
                    className
                )}
            >
                {/* Title Bar */}
                <div className="flex items-center justify-between border-b-4 border-black bg-[#ff2e63] px-4 py-2 text-white">
                    <h2 className="font-pixel text-lg font-bold truncate">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-sm hover:bg-black/20 p-1 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
