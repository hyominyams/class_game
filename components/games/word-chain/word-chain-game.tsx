"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mic2, Trophy, Users, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GameResultModal } from "@/components/game/game-result-modal";
import { getQuestions } from "@/app/actions/game-data";
import { saveGameResult } from "@/app/actions/game";
import { DAILY_GAME_COIN_LIMIT } from "@/app/constants/economy";
import { getTournamentQuestionSetSelection, recordTournamentAttempt } from "@/app/actions/tournament";

type GameState = "menu" | "loading" | "playing" | "gameover";
type TurnPhase = "pd_shout" | "answering" | "result";

interface RuntimeQuestionsData {
    setId: string | null;
    sourceScope: "CLASS" | "GLOBAL" | null;
    questions: unknown[];
}

interface StartPayload {
    setId: string;
    title: string;
    questions: unknown[];
}

interface RawWordChainQuestion {
    id: string | number;
    prompt?: unknown;
    answer?: unknown;
    accepted_answers?: unknown;
}

interface WordChainQuestion {
    id: string;
    prompt: string;
    answers: string[];
}

interface PlayerCharacter {
    id: number;
    name: string;
    emoji: string;
    color: string;
    bg: string;
    border: string;
}

const PLAYERS: PlayerCharacter[] = [
    { id: 1, name: "Fox", emoji: "🦊", color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-300" },
    { id: 2, name: "Rabbit", emoji: "🐰", color: "text-pink-600", bg: "bg-pink-100", border: "border-pink-300" },
    { id: 3, name: "Dog", emoji: "🐶", color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300" },
    { id: 4, name: "Cat", emoji: "🐱", color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-300" },
    { id: 5, name: "Bear", emoji: "🐻", color: "text-stone-700", bg: "bg-stone-100", border: "border-stone-300" },
    { id: 6, name: "Frog", emoji: "🐸", color: "text-green-700", bg: "bg-green-100", border: "border-green-300" },
    { id: 7, name: "Penguin", emoji: "🐧", color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-300" },
    { id: 8, name: "Tiger", emoji: "🐯", color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300" },
    { id: 9, name: "Koala", emoji: "🐨", color: "text-zinc-700", bg: "bg-zinc-100", border: "border-zinc-300" },
    { id: 10, name: "Panda", emoji: "🐼", color: "text-neutral-700", bg: "bg-neutral-100", border: "border-neutral-300" },
];

function normalizeAnswer(value: string) {
    return value.trim().replace(/\s+/g, "").toLowerCase();
}

function parseAcceptedAnswers(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }

    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
            }
        } catch {
            return [];
        }
    }

    return [];
}

function SpeechBubble({
    text,
    isPd,
    visible,
    style,
}: {
    text: string | null;
    isPd: boolean;
    visible: boolean;
    style?: { bg: string; color: string; border: string };
}) {
    if (!visible || !text) return <div className="h-14 opacity-0" />;

    const baseClass = isPd
        ? "bg-indigo-600 text-white border-indigo-700"
        : `${style?.bg || "bg-white"} ${style?.color || "text-black"} ${style?.border || "border-black"}`;

    return (
        <div className={`relative max-w-[240px] rounded-2xl border-2 px-4 py-2 text-center text-sm font-black shadow-lg md:text-base ${baseClass}`}>
            {text}
            <div className={`absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 ${isPd ? "bg-indigo-600 border-indigo-700" : `${style?.bg || "bg-white"} ${style?.border || "border-black"}`}`} />
        </div>
    );
}

export function WordChainGame({ runtimeData }: { runtimeData: RuntimeQuestionsData }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState<GameState>("menu");
    const [turnPhase, setTurnPhase] = useState<TurnPhase>("pd_shout");
    const [retryPayload, setRetryPayload] = useState<StartPayload | null>(null);
    const [questions, setQuestions] = useState<WordChainQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);

    const [pdSpeech, setPdSpeech] = useState<string | null>(null);
    const [charSpeech, setCharSpeech] = useState<string | null>(null);
    const [resultMark, setResultMark] = useState<"O" | "X" | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [correctCount, setCorrectCount] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(5);

    const [isTournamentInitializing, setIsTournamentInitializing] = useState(false);
    const [tournamentInitError, setTournamentInitError] = useState<string | null>(null);

    const [result, setResult] = useState<{
        isOpen: boolean;
        isClear: boolean;
        score: number;
        coinsEarned: number;
        dailyCoinsTotal: number;
        dailyLimit: number;
        title?: string;
    }>({
        isOpen: false,
        isClear: false,
        score: 0,
        coinsEarned: 0,
        dailyCoinsTotal: 0,
        dailyLimit: DAILY_GAME_COIN_LIMIT,
    });

    const timersRef = useRef<number[]>([]);
    const gameEndLockRef = useRef(false);
    const startTimeRef = useRef(0);
    const tournamentBootstrapRef = useRef(false);

    const currentQuestion = questions[currentQuestionIndex] || null;

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
        timersRef.current = [];
    }, []);

    const schedule = useCallback((callback: () => void, delay: number) => {
        const timerId = window.setTimeout(callback, delay);
        timersRef.current.push(timerId);
    }, []);

    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);

    const announcePrompt = useCallback((question: WordChainQuestion) => {
        clearTimers();
        setTurnPhase("pd_shout");
        setPdSpeech(`${question.prompt}!`);
        setCharSpeech(null);
        setResultMark(null);
        setInputValue("");
        setTimeLeft(5);

        schedule(() => {
            setTurnPhase("answering");
        }, 1100);
    }, [clearTimers, schedule]);

    const endGame = useCallback(async (isClear: boolean) => {
        if (gameEndLockRef.current) return;
        gameEndLockRef.current = true;
        clearTimers();

        setGameState("gameover");

        const playTime = Math.max(1, Math.floor((performance.now() - startTimeRef.current) / 1000));
        const saveResult = await saveGameResult("word-chain", score, playTime, {
            correctCount,
            totalQuestions: questions.length,
            isPerfect: isClear && correctCount === questions.length,
        });

        if (saveResult.success) {
            setResult({
                isOpen: true,
                isClear,
                score,
                coinsEarned: saveResult.coinsEarned || 0,
                dailyCoinsTotal: saveResult.dailyCoinsTotal || 0,
                dailyLimit: saveResult.dailyLimit || DAILY_GAME_COIN_LIMIT,
                title: isClear ? "CHAIN CLEAR!" : "CHAIN FINISHED",
            });
        }

        const mode = searchParams.get("mode");
        const tournamentId = searchParams.get("tournamentId");
        if (mode === "tournament" && tournamentId) {
            await recordTournamentAttempt(tournamentId, score);
        }
    }, [clearTimers, correctCount, questions.length, score, searchParams]);

    const startGame = useCallback(async (payload: StartPayload) => {
        setGameState("loading");
        clearTimers();

        const parsedQuestions = ((payload.questions || []) as RawWordChainQuestion[])
            .map((raw) => {
                if (typeof raw.prompt !== "string" || typeof raw.answer !== "string") return null;

                const accepted = parseAcceptedAnswers(raw.accepted_answers);
                const answers = Array.from(
                    new Set([raw.answer, ...accepted].map((item) => item.trim()).filter((item) => item.length > 0))
                );
                if (answers.length === 0) return null;

                return {
                    id: String(raw.id),
                    prompt: raw.prompt.trim(),
                    answers,
                } satisfies WordChainQuestion;
            })
            .filter((item): item is WordChainQuestion => item !== null)
            .sort(() => Math.random() - 0.5);

        if (parsedQuestions.length === 0) {
            alert("This question set has no playable prompts.");
            setGameState("menu");
            return;
        }

        setRetryPayload(payload);
        gameEndLockRef.current = false;
        startTimeRef.current = performance.now();

        setQuestions(parsedQuestions);
        setCurrentQuestionIndex(0);
        setCurrentCharacterIndex(0);
        setCorrectCount(0);
        setScore(0);
        setTimeLeft(5);
        setResultMark(null);
        setCharSpeech(null);
        setPdSpeech(null);
        setInputValue("");
        setGameState("playing");

        announcePrompt(parsedQuestions[0]);
    }, [announcePrompt, clearTimers]);

    useEffect(() => {
        const mode = searchParams.get("mode");
        const tournamentId = searchParams.get("tournamentId");
        if (mode !== "tournament" || !tournamentId || tournamentBootstrapRef.current) {
            return;
        }

        tournamentBootstrapRef.current = true;
        let cancelled = false;

        const bootstrap = async () => {
            setTournamentInitError(null);
            setIsTournamentInitializing(true);

            const selection = await getTournamentQuestionSetSelection(tournamentId, "word-chain");
            if (!selection.success || !selection.questionSetId) {
                if (!cancelled) {
                    setTournamentInitError(selection.error || "Failed to load tournament question set.");
                    setIsTournamentInitializing(false);
                }
                return;
            }

            if (cancelled) return;

            const tournamentQuestions = (await getQuestions(selection.questionSetId)) as unknown as RawWordChainQuestion[];
            await startGame({
                setId: selection.questionSetId,
                title: selection.tournamentTitle ? `${selection.tournamentTitle} Tournament Set` : "Tournament Set",
                questions: tournamentQuestions,
            });

            if (!cancelled) {
                setIsTournamentInitializing(false);
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
        };
    }, [searchParams, startGame]);

    const processAnswerResult = useCallback((isCorrect: boolean, answerText: string) => {
        setTurnPhase("result");
        setCharSpeech(`${answerText}!`);
        setResultMark(isCorrect ? "O" : "X");

        if (isCorrect) {
            setCorrectCount((prev) => prev + 1);
            setScore((prev) => prev + 100);
        }

        const isLastQuestion = currentQuestionIndex >= questions.length - 1;
        const nextQuestionIndex = currentQuestionIndex + 1;
        const projectedCorrectCount = isCorrect ? correctCount + 1 : correctCount;

        clearTimers();
        schedule(() => {
            if (isLastQuestion) {
                const clearCut = Math.ceil(questions.length * 0.6);
                void endGame(projectedCorrectCount >= clearCut);
                return;
            }

            const nextQuestion = questions[nextQuestionIndex];
            setCurrentQuestionIndex(nextQuestionIndex);
            setCurrentCharacterIndex((prev) => (prev + 1) % PLAYERS.length);
            announcePrompt(nextQuestion);
        }, 1500);
    }, [announcePrompt, clearTimers, correctCount, currentQuestionIndex, endGame, questions, schedule]);

    const handleTimeOut = useCallback(() => {
        if (gameState !== "playing" || turnPhase !== "answering") return;
        processAnswerResult(false, "... (시간 초과)");
    }, [gameState, turnPhase, processAnswerResult]);

    useEffect(() => {
        if (gameState !== "playing" || turnPhase !== "answering") return;

        if (timeLeft <= 0) {
            const timeout = window.setTimeout(() => {
                handleTimeOut();
            }, 0);
            return () => window.clearTimeout(timeout);
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, turnPhase, timeLeft, handleTimeOut]);

    const submitAnswer = useCallback(() => {
        if (gameState !== "playing" || turnPhase !== "answering" || !currentQuestion) return;

        const answerText = inputValue.trim();
        if (!answerText) return;

        const normalizedInput = normalizeAnswer(answerText);
        const isCorrect = currentQuestion.answers.some((candidate) => normalizeAnswer(candidate) === normalizedInput);

        processAnswerResult(isCorrect, answerText);
    }, [currentQuestion, gameState, inputValue, processAnswerResult, turnPhase]);

    const progressPercent = useMemo(() => {
        if (questions.length === 0) return 0;
        return Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
    }, [currentQuestionIndex, questions.length]);

    const activePlayer = PLAYERS[currentCharacterIndex] || PLAYERS[0];

    if (gameState === "menu") {
        if (isTournamentInitializing) {
            return (
                <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border-[6px] border-[#312e81] bg-[#1e1b4b] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    <Loader2 className="h-16 w-16 animate-spin text-[#00eaff]" />
                    <p className="mt-8 font-pixel text-xl text-[#a5b4fc] animate-pulse">스튜디오 세팅 중...</p>
                </div>
            );
        }

        if (tournamentInitError) {
            return (
                <div className="relative flex min-h-[500px] flex-col items-center justify-center rounded-3xl border-[6px] border-[#991b1b] bg-[#450a0a] p-8 shadow-[10px_10px_0_0_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/bg-noise.png')] opacity-20 mix-blend-overlay" />
                    <h2 className="relative font-pixel text-3xl text-[#f87171] drop-shadow-[2px_2px_0_#000] mb-4">방송 송출 실패</h2>
                    <p className="relative font-bold text-[#fecaca] text-center max-w-md mb-8">{tournamentInitError}</p>
                    <Button className="relative h-14 px-8 border-[4px] border-[#000] bg-[#ef4444] font-pixel text-lg text-white shadow-[4px_4px_0_0_#000] hover:bg-[#dc2626] hover:translate-y-1 hover:shadow-[0_0_0_0_#000] transition-all" onClick={() => router.back()}>
                        돌아가기
                    </Button>
                </div>
            );
        }

        return (
            <div className="relative mx-auto flex min-h-[600px] w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-[40px] border-[8px] border-[#ff0055] bg-[#0c0a20] p-10 shadow-[0_20px_60px_rgba(255,0,85,0.4),inset_0_0_40px_rgba(255,0,85,0.2)]">
                <style>{`
                    @keyframes floatPulse {
                        0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 10px 15px rgba(255,0,85,0.3)); }
                        50% { transform: translateY(-12px) scale(1.02); filter: drop-shadow(0 20px 25px rgba(255,0,85,0.5)); }
                    }
                    @keyframes marqueeScroll {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    @keyframes blinkWarning {
                        0%, 100% { opacity: 1; color: #ffff00; filter: drop-shadow(0 0 5px #ffff00); }
                        50% { opacity: 0.7; color: #ffeb3b; filter: none; }
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 12px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(0,0,0,0.5);
                        border-radius: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: linear-gradient(to bottom, #ff0055, #a20036);
                        border-radius: 6px;
                        border: 2px solid #0c0a20;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(to bottom, #ff3377, #ff0055);
                    }
                `}</style>

                {/* Background Parallax & Textures */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/variety-bg.png"
                        alt="Variety Show Background"
                        fill
                        className="pointer-events-none object-cover opacity-[0.15] mix-blend-screen scale-110"
                        sizes="(max-width: 768px) 100vw, 1200px"
                        priority
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(12,10,32,0.95)_100%)] z-10" />

                    {/* Live Broadcast Lights */}
                    <div className="absolute top-0 left-1/4 w-32 h-[400px] bg-gradient-to-b from-[#ff0055] to-transparent opacity-20 blur-3xl transform -rotate-12 z-10 animate-pulse" />
                    <div className="absolute top-0 right-1/4 w-64 h-[400px] bg-gradient-to-b from-[#00eaff] to-transparent opacity-10 blur-3xl transform rotate-12 z-10" />
                </div>

                <div className="relative z-20 flex w-full flex-col items-center">
                    {/* "LIVE" Indicator */}
                    <div className="absolute -top-4 right-0 md:right-8 flex items-center gap-2 bg-black border-2 border-[#ff0055] px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(255,0,85,0.6)] animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-[#ff0055] shadow-[0_0_8px_#ff0055]" />
                        <span className="font-pixel text-[#ff0055] text-[10px] tracking-widest mt-0.5">ON AIR</span>
                    </div>

                    {/* Title Area */}
                    <div className="mb-12 relative flex flex-col items-center justify-center">
                        <div className="absolute -left-16 -top-12 h-24 w-24 md:-left-24 md:-top-16 md:h-36 md:w-36 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)] z-30 transition-transform hover:scale-110 duration-300">
                            <Image src="/word-chain-pd.png" alt="PD Character" fill className="object-contain" sizes="144px" />
                            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 hover:opacity-100 transition-opacity rounded-full mix-blend-overlay" />
                        </div>

                        <div className="relative z-20 flex flex-col items-center" style={{ animation: 'floatPulse 4s infinite ease-in-out' }}>
                            <h1 className="whitespace-nowrap font-pixel text-[44px] leading-[1.05] text-[#ffff00] drop-shadow-[6px_6px_0_#990033] [text-shadow:0_0_20px_rgba(255,255,0,0.5)] md:text-[84px] text-center tracking-tight">
                                WORD CHAIN
                            </h1>
                            <div className="mt-2 inline-block transform -rotate-2 bg-[#ff0055] px-6 py-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
                                <span className="font-pixel text-[#ffffff] text-xl md:text-3xl tracking-widest block transform -skew-x-12">
                                    SHOWDOWN
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Studio Marquee / Instruction */}
                    <div className="mb-10 w-full max-w-3xl overflow-hidden rounded-xl border-[4px] border-[#312e81] bg-black shadow-[0_0_30px_rgba(49,46,129,0.8)__inset]">
                        <div className="flex whitespace-nowrap py-3 items-center border-y-2 border-[#4338ca] bg-[#1e1b4b] opacity-90">
                            <span className="font-pixel text-[13px] tracking-wider text-[#a5b4fc] px-4 animate-[marqueeScroll_15s_linear_infinite] inline-flex gap-8">
                                <span>▶ 제시어에 맞춰 연결되는 단어를 대답하라!</span>
                                <span className="text-[#ffeb3b]">단 5초의 시간 제한!</span>
                                <span className="text-[#fca5a5]">순발력이 생명이다!</span>
                                <span>▶ 방송 사고 주의!</span>

                                <span aria-hidden="true">▶ 제시어에 맞춰 연결되는 단어를 대답하라!</span>
                                <span aria-hidden="true" className="text-[#ffeb3b]">단 5초의 시간 제한!</span>
                                <span aria-hidden="true" className="text-[#fca5a5]">순발력이 생명이다!</span>
                                <span aria-hidden="true">▶ 방송 사고 주의!</span>
                            </span>
                        </div>
                    </div>

                    {/* Stage Selection */}
                    <div className="custom-scrollbar flex w-full max-w-3xl flex-col gap-4 overflow-y-auto max-h-[340px] pr-4 pb-2">
                        {runtimeData.questions.length > 0 && runtimeData.setId ? (
                            <button
                                key={runtimeData.setId}
                                className="group relative flex w-full items-center justify-between rounded-2xl border-[4px] border-[#1e1b4b] bg-[#0f0e17] p-5 shadow-[0_8px_0_0_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-2 hover:border-[#00eaff] hover:bg-[#16161a] hover:shadow-[0_12px_30px_rgba(0,234,255,0.2),0_8px_0_0_#000] active:translate-y-[4px] active:shadow-[0_0px_0_0_#000] overflow-hidden"
                                onClick={() =>
                                    void startGame({
                                        setId: runtimeData.setId!,
                                        title: runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set",
                                        questions: runtimeData.questions,
                                    })
                                }
                            >
                                {/* Hover Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00eaff]/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />

                                <div className="flex items-center gap-5 relative z-10 w-full pl-2">
                                    <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-lg border-2 border-[#312e81] bg-black font-pixel text-2xl text-[#6366f1] group-hover:border-[#00eaff] group-hover:text-[#00eaff] group-hover:shadow-[0_0_15px_#00eaff] transition-all duration-300">
                                        Q1
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4 text-left">
                                        <h2 className="truncate w-full font-pixel text-[22px] text-white transition-colors group-hover:text-[#ffff00] drop-shadow-[2px_2px_0_#000]">
                                            {runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set"}
                                        </h2>
                                        <div className="mt-3 flex items-center gap-3">
                                            <span className="flex items-center gap-1 font-pixel text-[11px] text-[#9ca3af] bg-black px-3 py-1 rounded-md border border-[#374151]">
                                                <Mic2 className="h-3 w-3 text-[#ff0055]" /> AUTO APPLIED
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center justify-center h-14 px-8 rounded-lg border-[3px] border-black bg-[#ff0055] font-pixel text-white shadow-[0_4px_0_0_#000] transition-all group-hover:bg-[#ff3377] group-hover:shadow-[0_0_20px_#ff0055,0_2px_0_0_#000] group-hover:translate-y-[2px]">
                                        PLAY
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-[#ff0055]/50 bg-black/40 p-16 text-center backdrop-blur-sm">
                                <div className="h-20 w-20 relative mb-6">
                                    <Image src="/word-chain-pd.png" alt="Empty" fill className="object-contain grayscale opacity-50" />
                                </div>
                                <h3 className="font-pixel text-2xl text-[#fca5a5] mb-3 drop-shadow-[2px_2px_0_#000]">편성된 방송이 없습니다</h3>
                                <p className="font-bold text-[#9ca3af]">
                                    선생님이 관련 문제 세트를 활성화해야<br />참여할 수 있습니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === "loading") {
        return (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-4 border-black bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-[#6366f1]" />
                <p className="mt-4 font-pixel text-lg">Preparing character stage...</p>
            </div>
        );
    }

    if (gameState === "gameover") {
        return (
            <GameResultModal
                isOpen={result.isOpen}
                isClear={result.isClear}
                score={result.score}
                coinsEarned={result.coinsEarned}
                dailyCoinsTotal={result.dailyCoinsTotal}
                dailyLimit={result.dailyLimit}
                title={result.title}
                onRetry={() => {
                    setResult((prev) => ({ ...prev, isOpen: false }));
                    if (retryPayload) {
                        void startGame(retryPayload);
                    }
                }}
                onExit={() => {
                    setResult((prev) => ({ ...prev, isOpen: false }));
                    router.back();
                }}
            />
        );
    }

    if (!currentQuestion) return null;

    return (
        <div className="relative overflow-hidden rounded-3xl border-[6px] border-[#ff0055] bg-[#1a1a2e] p-6 shadow-[12px_12px_0_0_#ff0055] text-white min-h-[600px]">
            <Image
                src="/variety-bg.png"
                alt="Variety Show Background"
                fill
                className="pointer-events-none object-cover opacity-20"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
            />
            {/* CRT / Scanline Effect */}
            <div className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay opacity-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%]"></div>

            <div className="relative z-20 space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md">
                        <div className="text-xs font-bold text-gray-300">TIME</div>
                        <p className={`font-pixel text-2xl ${timeLeft <= 2 ? "text-[#ff0055] animate-pulse" : "text-[#00eaff]"}`}>{timeLeft}s</p>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md">
                        <div className="text-xs font-bold text-gray-300">QUESTION</div>
                        <p className="font-pixel text-lg text-[#ffff00]">
                            {currentQuestionIndex + 1} / {questions.length}
                        </p>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md">
                        <div className="text-xs font-bold text-gray-300">CORRECT</div>
                        <p className="font-pixel text-lg text-[#55efc4]">{correctCount}</p>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                            <Trophy className="h-4 w-4" /> SCORE
                        </div>
                        <p className="font-pixel text-lg text-[#74b9ff]">{score}</p>
                    </div>
                </div>

                <div className="rounded-xl border-2 border-black bg-white p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-600">
                        <span>SHOW PROGRESS</span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full border border-black bg-slate-200">
                        <div
                            className="h-full bg-[linear-gradient(90deg,#6366f1,#22d3ee)] transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
                    <div className="rounded-2xl border-4 border-black bg-black/40 backdrop-blur-sm p-4 shadow-[5px_5px_0_0_#000]">
                        <div className="mb-4 rounded-xl border-2 border-black bg-slate-800 p-3 pt-6 relative">
                            <div className="absolute -top-4 -left-4 w-12 h-12 rotate-[-5deg]">
                                <Image src="/word-chain-pd.png" alt="PD" fill className="object-contain" />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-black text-amber-300 ml-8 mb-2">
                                <Mic2 className="h-4 w-4" /> PD 나영석
                            </div>
                            <div className="mt-2 flex min-h-[80px] items-center justify-center">
                                <SpeechBubble text={pdSpeech} isPd visible={turnPhase !== "result" || !!pdSpeech} />
                            </div>
                        </div>

                        <div className={`rounded-xl border-2 border-black p-3 ${activePlayer.bg}`}>
                            <div className="text-center">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-black bg-white text-5xl shadow-md">
                                    {activePlayer.emoji}
                                </div>
                                <p className={`mt-2 font-pixel text-lg ${activePlayer.color}`}>{activePlayer.name}</p>
                                <p className="text-xs font-bold text-gray-500">Active Character</p>
                            </div>
                            <div className="mt-3 flex min-h-[66px] items-center justify-center">
                                <SpeechBubble
                                    text={charSpeech}
                                    isPd={false}
                                    visible={!!charSpeech}
                                    style={{ bg: activePlayer.bg, color: activePlayer.color, border: activePlayer.border }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border-4 border-black bg-black/40 backdrop-blur-sm p-5 shadow-[5px_5px_0_0_#000]">
                        <h2 className="text-center font-pixel text-3xl text-white">{currentQuestion.prompt}</h2>
                        <p className="mt-2 text-center text-sm font-bold text-gray-400">
                            Enter the connected word for this prompt.
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
                            {PLAYERS.map((player, idx) => (
                                <div
                                    key={player.id}
                                    className={`flex flex-col items-center rounded-lg border-2 px-2 py-2 transition-all ${idx === currentCharacterIndex
                                        ? `${player.bg} ${player.border} scale-105 shadow`
                                        : "border-slate-200 bg-slate-50 opacity-70"
                                        }`}
                                >
                                    <span className="text-2xl">{player.emoji}</span>
                                    <span className="mt-1 text-[11px] font-black text-slate-700">{player.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 md:flex-row">
                            <Input
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        submitAnswer();
                                    }
                                }}
                                disabled={turnPhase !== "answering"}
                                placeholder={turnPhase === "answering" ? "Type answer..." : "Wait for PD cue..."}
                                className="h-14 border-2 border-black bg-slate-50 text-lg font-bold text-black"
                            />
                            <Button
                                onClick={submitAnswer}
                                disabled={turnPhase !== "answering" || inputValue.trim().length === 0}
                                className="h-14 min-w-[140px] border-2 border-black bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                            >
                                Submit
                            </Button>
                        </div>

                        <div className="mt-4 min-h-[56px] text-center">
                            {turnPhase === "pd_shout" && (
                                <div className="inline-flex rounded-full border-2 border-black bg-indigo-100 px-4 py-2 text-sm font-black text-indigo-700">
                                    PD is shouting the prompt...
                                </div>
                            )}
                            {turnPhase === "result" && resultMark === "O" && (
                                <div className="inline-flex rounded-full border-2 border-black bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-700">
                                    Correct! +100 points
                                </div>
                            )}
                            {turnPhase === "result" && resultMark === "X" && (
                                <div className="inline-flex rounded-full border-2 border-black bg-rose-100 px-4 py-2 text-sm font-black text-rose-700">
                                    Wrong answer. Next character turn.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
