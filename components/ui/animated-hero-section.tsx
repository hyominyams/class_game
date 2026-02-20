"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// Color placeholders - will be fetched from CSS variables in useEffect
let COLOR = "rgba(255, 255, 255, 0.8)"
let HIT_COLOR = "rgba(255, 255, 255, 0.1)"
let BACKGROUND_COLOR = "#000000"
let BALL_COLOR = "#FFFFFF"
let PADDLE_COLOR = "#FFFFFF"
let ACCENT_COLOR = "#FF00FF"

const LETTER_SPACING = 2
const WORD_SPACING = 4

const PIXEL_MAP = {
    S: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 1], [1, 1, 1, 1]],
    I: [[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
    N: [[1, 0, 0, 0, 1], [1, 1, 0, 0, 1], [1, 0, 1, 0, 1], [1, 0, 0, 1, 1], [1, 0, 0, 0, 1]],
    W: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 1, 0, 1], [1, 1, 0, 1, 1], [1, 0, 0, 0, 1]],
    O: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
    L: [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
    A: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
    R: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 1, 0], [1, 0, 0, 1]],
    E: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 1]],
    Y: [[1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
    U: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1]],
    D: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 0]],
    '?': [[1, 1, 1, 0], [0, 0, 0, 1], [0, 1, 1, 0], [0, 0, 0, 0], [0, 1, 0, 0]],
    F: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
    V: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]],
    C: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
    '!': [[1], [1], [1], [0], [1]],
    G: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 0], [1, 0, 1, 1, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]],
    M: [[1, 0, 0, 0, 1], [1, 1, 0, 1, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
    T: [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]],
    P: [[1, 1, 1, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0]],
}

interface Pixel { x: number; y: number; size: number; hit: boolean; color?: string }
interface Ball { x: number; y: number; dx: number; dy: number; radius: number }
interface Paddle { x: number; y: number; width: number; height: number }

type GameState = "PLAYING" | "FAILED" | "CLEAR"

export function PromptingIsAllYouNeed() {
    const router = useRouter()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pixelsRef = useRef<Pixel[]>([])
    const ballRef = useRef<Ball>({ x: 0, y: 0, dx: 0, dy: 0, radius: 0 })
    const paddleRef = useRef<Paddle>({ x: 0, y: 0, width: 0, height: 0 })
    const [gameState, setGameState] = useState<GameState>("PLAYING")
    const gameStateInternalRef = useRef<GameState>("PLAYING")
    const scaleRef = useRef(1)
    const mouseXRef = useRef(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const updateColors = () => {
            // Hardcode colors for reliable canvas rendering
            // Avoiding issues where getComputedStyle returns invalid color strings (e.g. "34 57% 95%")
            BACKGROUND_COLOR = "#000000"; // Retro Arcade Screen Look
            BALL_COLOR = "#ff2e63";       // Primary Pink
            PADDLE_COLOR = "#08d9d6";     // Secondary Mint
            ACCENT_COLOR = "#ff2e63";     // Accent Pink
            COLOR = "#ffffff";            // White Text on Black Screen
            HIT_COLOR = "rgba(255, 255, 255, 0.3)";
        }

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            scaleRef.current = Math.min(canvas.width / 1000, canvas.height / 1000);
            updateColors();
            initializeGame();
        }

        const calculateWordWidth = (word: string, pixelSize: number) => {
            return word.split("").reduce((width, letter) => {
                if (letter === " ") return width + WORD_SPACING * pixelSize;
                const letterWidth = PIXEL_MAP[letter as keyof typeof PIXEL_MAP]?.[0]?.length ?? 0
                return width + letterWidth * pixelSize + LETTER_SPACING * pixelSize
            }, 0) - LETTER_SPACING * pixelSize
        }

        const initializeGame = () => {
            const scale = scaleRef.current
            const isMobile = canvas.width < 640

            // Reduced Font Sizes Significantly
            const LARGE_PIXEL_SIZE = (isMobile ? 3 : 3.5) * scale
            const SMALL_PIXEL_SIZE = (isMobile ? 1.8 : 2.2) * scale
            const BALL_SPEED = (isMobile ? 5 : 6) * scale

            pixelsRef.current = []
            gameStateInternalRef.current = "PLAYING"
            setGameState("PLAYING")

            const words = ["SINWOL", "ARE YOU READY?"]
            const widthFactor = isMobile ? 0.7 : 0.6 // Increased to make text feel wider

            const totalWidthLarge = calculateWordWidth(words[0], LARGE_PIXEL_SIZE)
            const totalWidthSmall = calculateWordWidth(words[1], SMALL_PIXEL_SIZE)
            const totalWidth = Math.max(totalWidthLarge, totalWidthSmall)
            const scaleFactor = (canvas.width * widthFactor) / totalWidth

            const adjustedLargePixelSize = LARGE_PIXEL_SIZE * scaleFactor
            const adjustedSmallPixelSize = SMALL_PIXEL_SIZE * scaleFactor

            const largeTextHeight = 5 * adjustedLargePixelSize
            const smallTextHeight = 5 * adjustedSmallPixelSize

            const spaceBetweenLines = (isMobile ? 1.5 : 2) * adjustedLargePixelSize
            const totalTextHeight = largeTextHeight + spaceBetweenLines + smallTextHeight

            const topMargin = canvas.height * 0.15
            let startY = topMargin

            words.forEach((word, wordIndex) => {
                const pixelSize = wordIndex === 0 ? adjustedLargePixelSize : adjustedSmallPixelSize
                const tWidth = calculateWordWidth(word, pixelSize)
                let startX = (canvas.width - tWidth) / 2

                word.split("").forEach((letter) => {
                    if (letter === " ") { startX += WORD_SPACING * pixelSize; return; }
                    const pixelMap = PIXEL_MAP[letter as keyof typeof PIXEL_MAP]
                    if (!pixelMap) return
                    for (let i = 0; i < pixelMap.length; i++) {
                        for (let j = 0; j < pixelMap[i].length; j++) {
                            if (pixelMap[i][j]) {
                                pixelsRef.current.push({ x: startX + j * pixelSize, y: startY + i * pixelSize, size: pixelSize, hit: false, color: wordIndex === 0 ? "#FFC0CB" : "#FFFF00" })
                            }
                        }
                    }
                    startX += (pixelMap[0].length + LETTER_SPACING) * pixelSize
                })
                startY += wordIndex === 0 ? largeTextHeight + spaceBetweenLines : 0
            })

            // Ball and Paddle Sizes
            ballRef.current = {
                x: canvas.width / 2,
                y: canvas.height * 0.7,
                dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
                dy: -BALL_SPEED,
                radius: (isMobile ? 12 : 15) * scale
            }

            const pWidth = (isMobile ? 120 : 160) * scale
            const pHeight = (isMobile ? 8 : 10) * scale
            paddleRef.current = { x: canvas.width / 2 - pWidth / 2, y: canvas.height - pHeight - 40, width: pWidth, height: pHeight }
        }

        const handleMouseMove = (e: MouseEvent | TouchEvent) => {
            const rect = canvas.getBoundingClientRect()
            const x = 'touches' in e ? e.touches[0].clientX : e.clientX
            mouseXRef.current = x - rect.left
        }

        const handleCanvasClick = () => {
            if (gameStateInternalRef.current !== "PLAYING") initializeGame()
        }

        const updateGame = () => {
            if (gameStateInternalRef.current !== "PLAYING") return

            const ball = ballRef.current
            const paddle = paddleRef.current

            ball.x += ball.dx
            ball.y += ball.dy

            if (ball.x < ball.radius || ball.x > canvas.width - ball.radius) ball.dx *= -1
            if (ball.y < ball.radius) ball.dy *= -1

            if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                ball.dy = -Math.abs(ball.dy)
                const hitPoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)
                ball.dx = hitPoint * 10 * scaleRef.current
            }

            if (ball.y > canvas.height) {
                gameStateInternalRef.current = "FAILED"
                setGameState("FAILED")
            }

            let allHit = true
            pixelsRef.current.forEach((pixel) => {
                if (!pixel.hit) {
                    allHit = false
                    if (ball.x + ball.radius > pixel.x && ball.x - ball.radius < pixel.x + pixel.size &&
                        ball.y + ball.radius > pixel.y && ball.y - ball.radius < pixel.y + pixel.size) {
                        pixel.hit = true
                        ball.dy *= -1
                    }
                }
            })

            if (allHit) {
                gameStateInternalRef.current = "CLEAR"
                setGameState("CLEAR")
            }

            paddle.x = mouseXRef.current - paddle.width / 2
            if (paddle.x < 0) paddle.x = 0
            if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width
        }

        const drawGame = () => {
            ctx.fillStyle = BACKGROUND_COLOR
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            if (gameStateInternalRef.current !== "PLAYING") {
                const boxWidth = 300 * scaleRef.current
                const boxHeight = 150 * scaleRef.current
                const boxX = (canvas.width - boxWidth) / 2
                const boxY = (canvas.height - boxHeight) / 2

                // Shadow
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                ctx.fillRect(boxX + 10, boxY + 10, boxWidth, boxHeight)

                // Box Body
                const isFailed = gameStateInternalRef.current === "FAILED"
                ctx.fillStyle = "#fdf5e6"
                ctx.strokeStyle = "#18181b"
                ctx.lineWidth = 4
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

                // Text
                ctx.fillStyle = isFailed ? "#ff2e63" : "#34d399"
                ctx.font = `bold ${24 * scaleRef.current}px 'Press Start 2P', system-ui, sans-serif`
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillText(isFailed ? "FAILED" : "CLEAR!!", canvas.width / 2, boxY + boxHeight * 0.4)

                ctx.fillStyle = "#18181b"
                ctx.font = `${12 * scaleRef.current}px 'Press Start 2P', system-ui, sans-serif`
                ctx.fillText("RETRY?", canvas.width / 2, boxY + boxHeight * 0.7)

                return
            }

            pixelsRef.current.forEach((pixel) => {
                if (pixel.hit) { ctx.fillStyle = HIT_COLOR; ctx.globalAlpha = 0.3; ctx.fillRect(pixel.x, pixel.y, pixel.size, pixel.size); ctx.globalAlpha = 1.0 }
                else { ctx.fillStyle = pixel.color || COLOR; ctx.fillRect(pixel.x + 1, pixel.y + 1, pixel.size - 2, pixel.size - 2) }
            })

            const ball = ballRef.current; ctx.shadowBlur = 10; ctx.shadowColor = BALL_COLOR; ctx.fillStyle = BALL_COLOR; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
            const paddle = paddleRef.current; ctx.fillStyle = PADDLE_COLOR; ctx.shadowBlur = 10; ctx.shadowColor = PADDLE_COLOR; ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height); ctx.shadowBlur = 0
        }

        let animationFrameId: number;
        const gameLoop = () => { updateGame(); drawGame(); animationFrameId = requestAnimationFrame(gameLoop) }
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleMouseMove, { passive: false });
        canvas.addEventListener("click", handleCanvasClick);
        canvas.addEventListener("touchstart", handleCanvasClick);
        gameLoop()

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleMouseMove);
            canvas.removeEventListener("click", handleCanvasClick);
            canvas.removeEventListener("touchstart", handleCanvasClick);
            cancelAnimationFrame(animationFrameId)
        }
    }, [router])

    return (
        <div className="flex flex-col w-full h-full min-h-[600px] bg-[#fdf5e6] select-none border-[6px] border-[#18181b] shadow-[16px_16px_0px_#18181b] rounded-sm overflow-hidden font-pixel">
            {/* Arcade Screen Area */}
            <div className="flex-1 relative border-b-[6px] border-[#18181b] bg-black overflow-hidden cursor-none mx-4 mt-4 border-[6px]">
                <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: 'pixelated' }} />

                {/* Screen Glow / Shadow effects */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]" />
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-white/5 to-transparent" />
            </div>

            {/* Arcade Control Panel Area */}
            <div className="h-28 sm:h-32 bg-[#fdf5e6] flex flex-col items-center justify-center gap-4 relative z-10 w-full shrink-0">
                <div className="flex items-center gap-8 sm:gap-16">
                    <div className="hidden xs:flex flex-col items-center gap-2">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 border-[3px] border-black bg-white shadow-[2px_2px_0px_#000]" />
                        <span className="text-[7px] sm:text-[8px] text-zinc-600 font-bold uppercase tracking-tight">BTN_A</span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => router.push('/login')}
                            className="group relative px-8 sm:px-12 py-3 sm:py-4 bg-[#ff2e63] border-[4px] border-black shadow-[6px_6px_0px_#000] transition-all active:translate-y-[4px] active:shadow-none hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#000]"
                        >
                            <span className="relative flex items-center gap-3 sm:gap-4 text-white font-black italic tracking-tighter text-lg sm:text-2xl whitespace-nowrap uppercase">
                                INSERT COIN
                                <div className="w-1.5 h-4 sm:w-2 sm:h-6 bg-white/30 skew-x-12 animate-pulse" />
                            </span>
                        </button>
                    </div>

                    <div className="hidden xs:flex flex-col items-center gap-2 opacity-40">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 border-[3px] border-black bg-white shadow-[2px_2px_0px_#000]" />
                        <span className="text-[7px] sm:text-[8px] text-zinc-600 font-bold uppercase tracking-tight">BTN_B</span>
                    </div>
                </div>

                <div className="absolute top-6 left-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 animate-pulse border border-black" />
                    <span className="text-[8px] text-zinc-900 font-bold tracking-widest uppercase">SY_READY</span>
                </div>

                <div className="absolute bottom-6 right-8 text-[8px] sm:text-[9px] text-zinc-500 font-bold tracking-[0.2em] uppercase">
                    Made by Junhyo Park
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
                .cursor-none {
                    cursor: none !important;
                }
                @media (max-width: 450px) {
                    .xs\\:flex {
                        display: none;
                    }
                }
            `}</style>
        </div>
    )
}

export default PromptingIsAllYouNeed
