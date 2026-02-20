"use client";

import React, { useState } from "react";
import { PixelButton } from "@/components/ui/pixel-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelInput } from "@/components/ui/pixel-input";
import { PixelBadge } from "@/components/ui/pixel-badge";
import { PixelModal } from "@/components/ui/pixel-modal";
import { PixelTabs } from "@/components/ui/pixel-tabs";

export default function DemoPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#fdf5e6] p-8 space-y-12 pb-32">
            <header className="space-y-4 text-center">
                <h1 className="font-pixel text-4xl font-bold text-[#ff2e63] drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">Pixel Art UI Kit Demo</h1>
                <p className="font-bold text-gray-700 text-lg">ClassQuest Design System Verification</p>
            </header>

            {/* Colors Section */}
            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-[#b2c4ff]">0. Color Palette</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-24 bg-[#ff2e63] border-4 border-black shadow-[4px_4px_0_0_black] flex items-center justify-center font-bold text-white">Primary (#ff2e63)</div>
                    <div className="h-24 bg-[#08d9d6] border-4 border-black shadow-[4px_4px_0_0_black] flex items-center justify-center font-bold text-black">Secondary (#08d9d6)</div>
                    <div className="h-24 bg-[#fdf5e6] border-4 border-black shadow-[4px_4px_0_0_black] flex items-center justify-center font-bold text-black">Background (#fdf5e6)</div>
                    <div className="h-24 bg-[#fbbf24] border-4 border-black shadow-[4px_4px_0_0_black] flex items-center justify-center font-bold text-black">Amber (#fbbf24)</div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-[#ff2e63] text-white">1. Buttons</h2>
                <div className="flex flex-wrap gap-4 p-6 border-4 border-black bg-white shadow-[8px_8px_0_0_black] rounded-lg">
                    <PixelButton>Default (Pink)</PixelButton>
                    <PixelButton className="bg-[#08d9d6] text-black hover:bg-[#06b6b3]">Mint Button</PixelButton>
                    <PixelButton className="bg-[#fbbf24] text-black hover:bg-[#d9a51f]">Amber Button</PixelButton>
                    <PixelButton variant="destructive">Destructive (Red)</PixelButton>
                    <PixelButton variant="outline" className="bg-white">Outline</PixelButton>
                    <PixelButton className="bg-[#8b5cf6] text-white hover:bg-[#7c3aed]">Purple Action</PixelButton>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-[#08d9d6]">2. Cards & Panels</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PixelCard title="Primary Card" className="bg-white">
                        <div className="p-4 bg-pink-50 border-2 border-dashed border-pink-300 rounded text-pink-700 font-bold">
                            Content in a standard card using pink accents.
                        </div>
                    </PixelCard>
                    <PixelCard title="Mint Card" className="bg-[#e0fafa]">
                        <div className="p-4 bg-white border-2 border-black rounded font-bold">
                            Mint background variant.
                        </div>
                    </PixelCard>
                    <PixelCard title="Amber Alert" className="bg-[#fffbeb] border-[#fbbf24]">
                        <p className="text-sm font-bold text-amber-900">
                            Warning or Alert style card content.
                        </p>
                    </PixelCard>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-[#fbbf24]">3. Badges & Interactions</h2>
                <div className="flex flex-wrap gap-4 p-6 border-4 border-black bg-[#ffedd5] shadow-[8px_8px_0_0_black] rounded-lg items-center">
                    <PixelBadge className="bg-[#ff2e63] text-white text-lg py-1 px-3">New!</PixelBadge>
                    <PixelBadge className="bg-[#08d9d6] text-black text-base">Level 10</PixelBadge>
                    <PixelBadge className="bg-[#fbbf24] text-black">300 Gold</PixelBadge>
                    <PixelBadge variant="outline" className="bg-white">Rank: Silver</PixelBadge>
                    <PixelInput placeholder="Colorful Input..." className="w-64 border-blue-500 focus:ring-blue-500" />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-[#8b5cf6] text-white">4. Tabs & Navigation</h2>
                <div className="border-4 border-black bg-white p-8 rounded-lg shadow-[12px_12px_0_0_black]">
                    <PixelTabs
                        routes={[
                            { label: "Dashboard", href: "/demo" },
                            { label: "Store", href: "/demo/store" },
                            { label: "Settings", href: "/demo/settings" },
                        ]}
                    />
                    <div className="bg-[#08d9d6] border-4 border-black border-t-0 p-8 min-h-[150px] shadow-[8px_8px_0_0_black] flex flex-col items-center justify-center text-center">
                        <h3 className="font-pixel text-2xl mb-2">Active Tab Content</h3>
                        <p className="font-bold text-lg">The active tab connects seamlessly to this content area!</p>
                        <PixelButton className="mt-4 bg-[#ff2e63] text-white">Call to Action</PixelButton>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="font-pixel text-2xl border-b-4 border-black w-fit px-4 bg-black text-white">5. Modals</h2>
                <div className="p-6 border-4 border-black bg-gray-100 rounded-lg">
                    <PixelButton onClick={() => setIsModalOpen(true)} className="w-full h-16 text-xl">
                        Open Colorful Modal
                    </PixelButton>

                    <PixelModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="✨ LEVEL UP! ✨"
                    >
                        <div className="space-y-6 text-center">
                            <div className="w-24 h-24 bg-[#fbbf24] border-4 border-black mx-auto rounded-full flex items-center justify-center text-4xl shadow-[4px_4px_0_0_black]">
                                🏆
                            </div>
                            <h3 className="font-pixel text-xl text-[#ff2e63]">Congratulation!</h3>
                            <p className="font-bold text-lg">You earned mock data coins!</p>
                            <div className="flex justify-center gap-4 mt-6">
                                <PixelButton variant="outline" onClick={() => setIsModalOpen(false)}>Close</PixelButton>
                                <PixelButton className="bg-[#08d9d6] text-black hover:bg-[#06b6b3]" onClick={() => setIsModalOpen(false)}>Claim Reward</PixelButton>
                            </div>
                        </div>
                    </PixelModal>
                </div>
            </section>
        </div>
    );
}
