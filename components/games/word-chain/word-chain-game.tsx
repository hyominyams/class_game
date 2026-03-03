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

const WORD_CHAIN_SCORE_RULE = {
    correctAnswer: 70,
} as const;

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
            setScore((prev) => prev + WORD_CHAIN_SCORE_RULE.correctAnswer);
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
            setCurrentCharacterIndex(nextQuestionIndex); // Match character index with question index.
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

    // We calculate activePlayer inline in the render loop now.
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
                    <div className="custom-scrollbar flex w-full max-w-3xl flex-col gap-4 overflow-y-auto max-h-[380px] p-4 pb-8 pt-6">
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

    const dynamicPlayers = questions.map((q, idx) => ({
        id: `q-${idx}`,
        name: `참여자 ${idx + 1}`,
        imageSrc: `/images/word-chain/char_${(idx % 10) + 1}.png`,
        hueRotate: 0
    }));

    return (
        <div className="relative overflow-hidden rounded-3xl border-[6px] border-[#ff0055] bg-[#1a1a2e] shadow-[0_0_30px_#ff0055] text-white min-h-[650px] flex flex-col pt-6 px-6">
            <Image
                src="/variety-bg.png"
                alt="Variety Show Background"
                fill
                className="pointer-events-none object-cover opacity-10"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
            />
            {/* Scanline Effect */}
            <div className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,3px_100%] rounded-3xl"></div>

            <div className="relative z-20 flex-1 flex flex-col h-full w-full">
                {/* Stats Header */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-3 shrink-0">
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md flex items-center justify-between">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-300">QUESTION</div>
                        <p className="font-pixel text-base sm:text-lg text-[#ffff00]">{currentQuestionIndex + 1} / {questions.length}</p>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md flex items-center justify-between">
                        <div className="text-[10px] sm:text-xs font-bold text-gray-300">CORRECT</div>
                        <p className="font-pixel text-base sm:text-lg text-[#55efc4]">{correctCount}</p>
                    </div>
                    <div className="rounded-xl border-2 border-black bg-white/10 backdrop-blur-sm p-3 shadow-md flex items-center justify-between col-span-2">
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-bold text-gray-300">
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400" /> SCORE
                        </div>
                        <p className="font-pixel text-base sm:text-lg text-[#74b9ff]">{score}</p>
                    </div>
                </div>

                <div className="rounded-xl border-2 border-black bg-white/90 p-2.5 mb-5 shrink-0 shadow-sm backdrop-blur-md">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] sm:text-xs font-bold text-gray-700">
                        <span className="font-pixel tracking-wider text-black">SHOW PROGRESS</span>
                        <span className="font-black">{progressPercent}%</span>
                    </div>
                    <div className="h-2.5 sm:h-3 overflow-hidden rounded-full border border-black bg-slate-200">
                        <div
                            className="h-full bg-[linear-gradient(90deg,#ff0055,#ffeb3b)] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* EMPHASIZED: Timer & PD Question */}
                <div className="rounded-2xl border-[6px] border-[#ff0055] bg-black shadow-[0_15px_30px_rgba(255,0,85,0.4)] text-center mb-6 relative transform transition-all duration-300 flex-1 flex flex-col justify-center overflow-visible mx-1 mt-4">
                    {/* The PD on top corner */}
                    <div className="absolute -top-12 -left-6 sm:-left-8 w-24 h-24 sm:w-28 sm:h-28 rotate-[-10deg] drop-shadow-[4px_4px_0_rgba(0,0,0,1)] z-30 transition-transform duration-300 ease-in-out hover:scale-110">
                        <Image src="/word-chain-pd.png" alt="PD" fill className="object-contain" />
                    </div>
                    <div className="absolute -top-5 left-16 sm:left-20 bg-[#ff0055] text-white px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-pixel border-[3px] border-black rounded-lg shadow-[3px_3px_0_0_#000] z-20 whitespace-nowrap animate-bounce">
                        <Mic2 className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 text-yellow-300" />
                        나영석 PD의 제시어!
                    </div>

                    <div className="absolute inset-0 bg-[url('/bg-noise.png')] mix-blend-overlay opacity-30 rounded-xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center p-6 sm:p-10 lg:p-12 gap-6 lg:gap-14 w-full h-full">
                        {/* Prominent Question */}
                        <div className="flex-1 flex flex-col justify-center items-center border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-dashed border-[#ff0055]/50 pb-6 lg:pb-0 lg:pr-10 w-full min-h-[140px] sm:min-h-[180px]">
                            <h2 className={`text-center font-pixel break-keep leading-tight drop-shadow-[5px_5px_0_#990033] ${currentQuestion.prompt.length > 8 ? "text-6xl sm:text-[80px] lg:text-[100px]" : "text-[80px] sm:text-[110px] lg:text-[150px]"} ${turnPhase === "pd_shout" ? "text-yellow-300 animate-pulse scale-105" : "text-white"}`}>
                                {currentQuestion.prompt}
                            </h2>
                            {turnPhase === "pd_shout" ? (
                                <p className="mt-4 sm:mt-6 text-center text-[14px] sm:text-[18px] font-bold text-[#00eaff] font-pixel animate-pulse">
                                    ▶ 빨리 대답하세요! ◀
                                </p>
                            ) : (
                                <p className="mt-4 sm:mt-6 text-center text-[12px] sm:text-[16px] font-bold text-gray-400 font-pixel opacity-70">
                                    * 제시어에 맞춰 연결되는 단어를 대답하라!
                                </p>
                            )}
                        </div>

                        {/* Smaller Timer */}
                        <div className="flex flex-col items-center justify-center min-w-[140px] sm:min-w-[180px]">
                            <div className="text-[12px] sm:text-[16px] font-pixel text-[#ff0055] tracking-widest mb-1 sm:mb-2 bg-[#ff0055]/20 px-4 py-1.5 rounded-full border border-[#ff0055]">남은 시간</div>
                            <div className={`font-pixel text-[60px] sm:text-[80px] lg:text-[100px] leading-none drop-shadow-[4px_4px_0_#990033] transition-colors duration-200 ${timeLeft <= 2 ? (turnPhase === "answering" ? "text-[#ff0055] animate-ping" : "text-gray-600") : "text-[#00eaff] [text-shadow:0_0_20px_rgba(0,234,255,0.4)]"}`}>
                                {turnPhase === "answering" ? timeLeft : "5"}<span className="text-2xl sm:text-4xl text-[#ff0055] ml-1">s</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input & Feedback Area */}
                <div className="mb-4 sm:mb-6 shrink-0 relative z-20">
                    <div className="flex flex-col gap-3 sm:flex-row max-w-4xl mx-auto">
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
                            placeholder={turnPhase === "answering" ? "제시어에 이어지는 단어를 입력!" : "잠시만 대기..."}
                            className={`h-14 sm:h-16 lg:h-20 border-[4px] border-black text-xl sm:text-2xl lg:text-3xl font-bold font-pixel text-center transition-colors placeholder:font-pixel placeholder:text-[14px] sm:placeholder:text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:border-[#ff0055] ${turnPhase === "answering" ? "bg-white text-black shadow-[4px_4px_0_0_#ff0055]" : "bg-gray-800 text-gray-500 border-gray-600"}`}
                        />
                        <Button
                            onClick={submitAnswer}
                            disabled={turnPhase !== "answering" || inputValue.trim().length === 0}
                            className={`h-14 sm:h-16 lg:h-20 min-w-[120px] sm:min-w-[160px] lg:min-w-[200px] border-[4px] border-black text-xl sm:text-2xl lg:text-3xl font-pixel shadow-[4px_4px_0_0_#000] hover:translate-y-1 hover:shadow-[0_0_0_0_#000] transition-all duration-200 ${turnPhase === "answering" && inputValue.trim().length > 0
                                ? "bg-[#ffff00] text-[#ff0055] hover:bg-[#ffe600]"
                                : "bg-gray-800 text-gray-500 border-gray-600 shadow-[0_0_0_0_#000]"
                                }`}
                        >
                            정답 제출!
                        </Button>
                    </div>

                    <div className="mt-4 sm:mt-5 flex min-h-[60px] sm:min-h-[80px] items-center justify-center text-center max-w-4xl mx-auto overflow-visible relative z-30">
                        {turnPhase === "pd_shout" && (
                            <div className="relative inline-flex items-center justify-center border-[4px] sm:border-[6px] border-[#312e81] bg-[#4f46e5] px-6 sm:px-10 py-3 sm:py-4 text-[16px] sm:text-[24px] lg:text-[28px] font-pixel text-[#ffeb3b] animate-pulse shadow-[6px_6px_0_0_#000] rotate-[-1deg]">
                                <div className="absolute inset-0 bg-[url('/bg-noise.png')] mix-blend-overlay opacity-30"></div>
                                <Mic2 className="w-5 h-5 sm:w-8 sm:h-8 mr-2 text-white relative z-10" />
                                <span className="relative z-10">PD님이 문제를 제시 중!</span>
                            </div>
                        )}
                        {turnPhase === "result" && resultMark === "O" && (
                            <div className="relative inline-flex flex-col sm:flex-row items-center justify-center border-[4px] sm:border-[6px] border-[#000] bg-[#ffff00] px-8 sm:px-14 py-3 sm:py-5 font-pixel shadow-[10px_10px_0_0_#ff0055,-6px_-6px_0_0_#00eaff] animate-bounce rotate-[2deg]">
                                <div className="absolute inset-0 border-[3px] sm:border-[4px] border-dashed border-black/20 m-1 pointer-events-none"></div>
                                <span className="text-[20px] sm:text-[32px] lg:text-[40px] text-[#ff0055] tracking-widest drop-shadow-[2px_2px_0_#fff] relative z-10 mr-0 sm:mr-4">
                                    🎉 정답!!!
                                </span>
                                <span className="text-[14px] sm:text-[20px] lg:text-[24px] text-black bg-white px-3 py-1 border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000] relative z-10 mt-1 sm:mt-0">
                                    +70 SCORE
                                </span>
                            </div>
                        )}
                        {turnPhase === "result" && resultMark === "X" && (
                            <div className="relative inline-flex flex-col sm:flex-row items-center justify-center border-[4px] sm:border-[6px] border-[#ff0055] bg-black px-8 sm:px-14 py-3 sm:py-5 font-pixel shadow-[10px_10px_0_0_#00eaff,-6px_-6px_0_0_#000] animate-shake rotate-[-2deg]">
                                <div className="absolute inset-0 border-[3px] sm:border-[4px] border-dashed border-[#ff0055]/40 m-1 pointer-events-none"></div>
                                <span className="text-[20px] sm:text-[32px] lg:text-[40px] text-white tracking-widest drop-shadow-[2px_2px_0_#ff0055] relative z-10 mr-0 sm:mr-4">
                                    💥 오답!
                                </span>
                                <span className="text-[14px] sm:text-[20px] lg:text-[24px] text-black bg-[#ff0055] text-white px-3 py-1 border-[2px] sm:border-[3px] border-[#fff] shadow-[2px_2px_0_0_#ff0055] relative z-10 mt-1 sm:mt-0">
                                    다음 기회에...
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Subordinate Characters List: Maps directly to question set */}
                <div className="mt-auto pt-4 sm:pt-6 border-t-[4px] border-dashed border-[#ff0055]/30 bg-black/40 rounded-t-[30px] -mx-6 -mb-6 px-6 sm:px-10 pb-6 backdrop-blur-md relative z-40">
                    <div className="text-center mb-0 font-pixel text-[10px] sm:text-xs text-[#00eaff] tracking-widest drop-shadow-[2px_2px_0_#000] relative z-10 pointer-events-none">
                        문제 리스트 및 순서 ( {currentQuestionIndex + 1} / {questions.length} )
                    </div>

                    <div className="flex flex-nowrap items-center justify-start sm:justify-center gap-4 sm:gap-6 pt-20 pb-10 px-4 -mt-6 overflow-x-auto custom-scrollbar relative z-20">
                        {dynamicPlayers.map((player, idx) => (
                            <div
                                key={player.id}
                                className={`shrink-0 relative flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 transition-all duration-300 ${idx === currentCharacterIndex
                                    ? "border-[3px] sm:border-[4px] border-[#ffff00] bg-black scale-110 sm:scale-125 shadow-[0_0_20px_#ffff00] z-10 mx-2 sm:mx-4"
                                    : idx < currentCharacterIndex
                                        ? "border-[2px] sm:border-[3px] border-green-800 bg-[#0f172a] opacity-30 grayscale"
                                        : "border-[2px] sm:border-[3px] border-slate-700 bg-[#1e293b] opacity-70 hover:opacity-100 hover:border-slate-500"
                                    }`}
                                style={{
                                    transform: idx === currentCharacterIndex ? "scale(1.15) translateY(-5px)" : "scale(1) translateY(0)",
                                }}
                            >
                                <div className="w-[52px] h-[52px] sm:w-[68px] sm:h-[68px] lg:w-[80px] lg:h-[80px] relative overflow-hidden rounded-lg bg-black border-[3px] border-white/10 shadow-inner">
                                    <img
                                        src={player.imageSrc}
                                        alt={player.name}
                                        className="w-full h-full object-contain p-1"
                                    />
                                </div>

                                {idx === currentCharacterIndex && (
                                    <>
                                        <span className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#ff0055] text-white text-[12px] sm:text-[14px] font-pixel flex items-center justify-center shadow-[2px_2px_0_0_#990033] border-[2px] sm:border-[3px] border-black animate-bounce z-20">
                                            Q
                                        </span>
                                        {turnPhase === "result" && charSpeech && (
                                            <div className="absolute -top-[50px] sm:-top-[60px] whitespace-nowrap z-50 animate-fade-in-up">
                                                <div className="relative rounded-xl border-2 sm:border-[3px] border-black bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[13px] font-bold text-black shadow-lg">
                                                    {charSpeech}
                                                    <div className="absolute -bottom-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-2 sm:border-b-[3px] border-r-2 sm:border-r-[3px] border-black bg-white" />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Custom Tailwind utilities for the game */}
            <style jsx global>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    50% { transform: translateX(5px); }
                    75% { transform: translateX(-5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
}
