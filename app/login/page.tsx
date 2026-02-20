"use client"

import { RetroLogin } from "@/components/auth/retro-login"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-[#b2c4ff] flex flex-col items-center justify-center relative overflow-hidden font-pixel">
            {/* Background Grid - From Reference 1 */}
            <div
                className="absolute inset-0 z-0 opacity-40"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, #ffffff 1px, transparent 1px),
                        linear-gradient(to bottom, #ffffff 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Floating Decorative Elements - From Reference 1 & 2 */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[10%] animate-floating animation-delay-500">
                    <div className="w-8 h-8 bg-[#ff71ce] border-2 border-black rotate-12" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                </div>
                <div className="absolute bottom-[15%] right-[15%] animate-floating-slow">
                    <div className="w-10 h-10 bg-[#01cdfe] border-2 border-black -rotate-12" style={{ clipPath: 'polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%)' }} />
                </div>
                <div className="absolute top-[30%] right-[10%] animate-pulse">
                    <div className="w-6 h-6 bg-[#fffb96] border-2 border-black rounded-full" />
                </div>
            </div>

            {/* Back to Home Button - Pixel Style */}
            <button
                onClick={() => router.push('/')}
                className="absolute top-8 left-8 z-20 flex items-center gap-3 bg-[#fdf5e6] border-[4px] border-[#18181b] px-4 py-2 shadow-[4px_4px_0px_#18181b] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#18181b] active:translate-y-[4px] active:shadow-none transition-all"
            >
                <span className="text-[10px] text-zinc-900 leading-none">BACK_HOME</span>
            </button>

            {/* Main Content Area */}
            <div className="relative z-10 w-full px-4 flex flex-col items-center">
                {/* Status Bar Deco */}
                <div className="mb-6 flex gap-3">
                    <div className="h-6 w-32 bg-[#34d399] border-[3px] border-black flex items-center px-2">
                        <div className="w-full h-2 bg-white/40" />
                    </div>
                    <div className="h-6 w-12 bg-[#ff2e63] border-[3px] border-black" />
                </div>

                <RetroLogin />

                {/* Footer Deco */}
                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="w-3 h-3 bg-white border-2 border-black" />
                        ))}
                    </div>
                    <p className="text-[8px] text-white bg-black px-4 py-1 tracking-[0.2em] shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                        USER_AUTHENTICATION_REQUIRED
                    </p>
                </div>
            </div>

            <style jsx>{`
                @font-face {
                    font-family: 'Pixel';
                    src: url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                }
                .font-pixel {
                    font-family: 'Press Start 2P', system-ui, sans-serif;
                }
                @keyframes floating {
                    0%, 100% { transform: translateY(0) rotate(12deg); }
                    50% { transform: translateY(-20px) rotate(12deg); }
                }
                @keyframes floating-slow {
                    0%, 100% { transform: translateY(0) rotate(-12deg); }
                    50% { transform: translateY(-10px) rotate(-12deg); }
                }
                .animate-floating {
                    animation: floating 3s ease-in-out infinite;
                }
                .animate-floating-slow {
                    animation: floating-slow 4.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
