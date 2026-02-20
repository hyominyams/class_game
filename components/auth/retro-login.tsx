"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'

export function RetroLogin() {
    const router = useRouter()
    const [id, setId] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [loginResult, setLoginResult] = useState<{ success: boolean; message: string; destination?: string } | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const result = await loginAction({ id, password })

        if (result.success) {
            setLoginResult({
                success: true,
                message: "WELCOME TO PIXEL WORLD!",
                destination: result.destination
            })
            setShowModal(true)
            // 1.5초 후 이동
            setTimeout(() => {
                router.push(result.destination!)
            }, 1500)
        } else {
            setLoginResult({
                success: false,
                message: "ACCESS DENIED: CHECK YOUR ID/CODE"
            })
            setShowModal(true)
            setTimeout(() => setShowModal(false), 2000)
        }
        setIsLoading(false)
    }

    return (
        <>
            <div className="pixel-window w-full max-w-[400px] bg-[#fdf5e6] border-[4px] border-[#18181b] shadow-[12px_12px_0px_#18181b] relative overflow-hidden">
                {/* Window Title Bar */}
                <div className="h-10 bg-[#34d399] border-b-[4px] border-[#18181b] flex items-center justify-between px-4">
                    <span className="font-pixel text-[12px] text-zinc-900 uppercase tracking-wider">Login.exe</span>
                    <div className="flex gap-2">
                        <div className="w-5 h-5 bg-[#fdf5e6] border-[2px] border-[#18181b]" />
                        <div className="w-5 h-5 bg-[#fdf5e6] border-[2px] border-[#18181b] flex items-center justify-center font-bold text-[10px]">X</div>
                    </div>
                </div>

                <div className="p-8">
                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4">
                            <div className="w-16 h-16 bg-[#fbbf24] border-[4px] border-[#18181b] rounded-lg shadow-[4px_4px_0px_#18181b] flex items-center justify-center">
                                {/* Simple Pixel Face */}
                                <div className="relative w-8 h-8">
                                    <div className="absolute top-1 left-1 w-2 h-2 bg-zinc-900" />
                                    <div className="absolute top-1 right-1 w-2 h-2 bg-zinc-900" />
                                    <div className="absolute bottom-1 left-1 w-6 h-2 bg-zinc-900" />
                                </div>
                            </div>
                            {/* Pixel Hearts Decoration */}
                            <div className="absolute -top-4 -right-4 animate-bounce">
                                <div className="pixel-heart w-6 h-6 bg-[#ff2e63]" />
                            </div>
                        </div>
                        <h2 className="font-pixel text-xl text-zinc-900">SHINWOL LOGIN</h2>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="font-pixel text-[10px] text-zinc-600 uppercase">Input ID</label>
                                <input
                                    type="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full bg-white border-[4px] border-[#18181b] px-4 py-3 font-pixel text-sm focus:outline-none focus:bg-[#ecfdf5] transition-colors"
                                    placeholder="..."
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-pixel text-[10px] text-zinc-600 uppercase">Secret Code</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border-[4px] border-[#18181b] px-4 py-3 font-pixel text-sm focus:outline-none focus:bg-[#ecfdf5] transition-colors"
                                    placeholder="****"
                                    required
                                />
                            </div>
                        </div>

                        {/* OK Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-[#fdf5e6] border-[4px] border-[#18181b] shadow-[4px_4px_0px_#18181b] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#18181b] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center group relative"
                        >
                            <span className="font-pixel text-2xl text-zinc-900 group-disabled:opacity-50">
                                {isLoading ? "Wait..." : "OK"}
                            </span>
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="pixel-cursor" />
                            </div>
                        </button>
                    </form>
                </div>
            </div>

            {/* Pixel Art Login Notification Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
                    <div className={`
                        pixel-modal min-w-[300px] border-[4px] border-black p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.3)]
                        ${loginResult?.success ? 'bg-[#08d9d6]' : 'bg-[#ff2e63]'}
                        animate-in zoom-in duration-200
                    `}>
                        <div className="flex flex-col items-center gap-6">
                            {/* Pixel Icon based on status */}
                            <div className="w-12 h-12 bg-white border-[3px] border-black flex items-center justify-center">
                                {loginResult?.success ? (
                                    <div className="w-6 h-6 bg-[#34d399]" style={{ clipPath: 'polygon(20% 50%, 40% 70%, 80% 30%, 70% 20%, 40% 50%, 30% 40%)' }} />
                                ) : (
                                    <div className="w-6 h-6 bg-[#ff2e63]" style={{ clipPath: 'polygon(20% 20%, 35% 20%, 50% 35%, 65% 20%, 80% 20%, 80% 35%, 65% 50%, 80% 65%, 80% 80%, 65% 80%, 50% 65%, 35% 80%, 20% 80%, 20% 65%, 35% 50%, 20% 35%)' }} />
                                )}
                            </div>

                            <div className="text-center space-y-2">
                                <p className="font-pixel text-[12px] text-black leading-relaxed">
                                    {loginResult?.message}
                                </p>
                                {loginResult?.success && (
                                    <p className="font-pixel text-[8px] text-black/60">
                                        REDIRECTING TO DASHBOARD...
                                    </p>
                                )}
                            </div>

                            {/* Decorative Progress Bar */}
                            <div className="w-full h-4 bg-black/10 border-[2px] border-black overflow-hidden">
                                <div className="h-full bg-white w-full animate-loader shadow-[inset_-4px_0px_0px_rgba(0,0,0,0.1)]" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @font-face {
                    font-family: 'Pixel';
                    src: url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                }
                .font-pixel {
                    font-family: 'Press Start 2P', system-ui, sans-serif;
                }
                .pixel-window, .pixel-modal {
                    image-rendering: pixelated;
                }
                .pixel-heart {
                    clip-path: polygon(
                        0 25%, 25% 25%, 25% 0, 50% 0, 50% 25%, 75% 25%, 75% 0, 100% 0, 100% 25%, 100% 50%, 75% 50%, 75% 75%, 50% 75%, 50% 100%, 25% 100%, 25% 75%, 0 75%, 0 50%
                    );
                }
                .pixel-cursor {
                    width: 20px;
                    height: 20px;
                    background: black;
                    clip-path: polygon(
                        0 0, 100% 70%, 50% 70%, 70% 100%, 50% 100%, 30% 70%, 0 70%
                    );
                }
                @keyframes loader {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-loader {
                    animation: loader 1.5s linear infinite;
                }
            `}</style>
        </>
    )
}
