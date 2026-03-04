"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Gem, Heart, Loader2, Timer, Trophy, Swords, ScrollText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GameResultModal } from "@/components/game/game-result-modal";
import { getQuestions } from "@/app/actions/game-data";
import { saveGameResult } from "@/app/actions/game";
import { DAILY_GAME_COIN_LIMIT } from "@/app/constants/economy";
import { getTournamentQuestionSetSelection, recordTournamentAttempt } from "@/app/actions/tournament";

type GameState = "menu" | "loading" | "playing" | "gameover";
type FeedbackState = "correct" | "wrong" | null;
type QuestionType = "multiple-choice" | "short-answer";

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

interface PreparedQuestion {
    id: string;
    question_text: string;
    answer_text: string;
    options: string[];
    correct_answer: number | null;
    type: QuestionType;
}

interface RawQuestion {
    id: string | number;
    question_text?: unknown;
    answer_text?: unknown;
    correct_answer?: unknown;
    options?: unknown;
    type?: unknown;
}

const START_TIME = 150;
const START_HEARTS = 3;
const HISTORY_SCORE_RULE = {
    baseCorrect: 80,
    bossBonus: 40,
    streakBonusPerStep: 5,
    streakBonusCap: 50,
} as const;
const HISTORY_MAP_BG = "/images/history-quiz/bg-korean.png";
const HISTORY_RELIC = "/relic.png";
const HISTORY_BOSS_BADGE = "/bosss-badge.png";
const HISTORY_BOSS_TIGER = "/images/history-quiz/enemy-tiger.png";
const HISTORY_NPC = "/images/history-quiz/enemy-npc.png";
const HISTORY_PLAYER = "/images/history-quiz/player-character.png";
const HISTORY_BOSS_TIGER_ATTACK = "/images/history-quiz/enemy-tiger-attack.png";
const HISTORY_NPC_ATTACK = "/images/history-quiz/enemy-npc-attack.png";
const HISTORY_PLAYER_ATTACK = "/images/history-quiz/player-character-attack-2.png";

function parseOptions(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string");

    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((item): item is string => typeof item === "string");
            }
        } catch {
            return [];
        }
    }

    return [];
}

function normalizeAnswer(text: string) {
    return text.trim().toLowerCase();
}

export function HistoryQuizGame({ runtimeData }: { runtimeData: RuntimeQuestionsData }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState<GameState>("menu");
    const [retryPayload, setRetryPayload] = useState<StartPayload | null>(null);
    const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [timeLeft, setTimeLeft] = useState(START_TIME);
    const [hearts, setHearts] = useState(START_HEARTS);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [relicCount, setRelicCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [inputAnswer, setInputAnswer] = useState("");
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

    const gameEndLockRef = useRef(false);
    const startTimeRef = useRef(0);
    const tournamentBootstrapRef = useRef(false);

    const currentQuestion = questions[currentIndex] || null;

    const progressPercent = useMemo(() => {
        if (questions.length === 0) return 0;
        return Math.round(((currentIndex + 1) / questions.length) * 100);
    }, [currentIndex, questions.length]);

    const isBossRound = useMemo(() => {
        if (!currentQuestion) return false;
        return (currentIndex + 1) % 5 === 0;
    }, [currentIndex, currentQuestion]);

    const endGame = useCallback(
        async (isClearOverride?: boolean) => {
            if (gameEndLockRef.current) return;
            gameEndLockRef.current = true;

            setGameState("gameover");
            const isClear = isClearOverride ?? currentIndex >= questions.length - 1;
            const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);

            const saveResult = await saveGameResult("history-quiz", score, playTime, {
                correctCount,
                totalQuestions: questions.length,
                isPerfect: isClear && hearts > 0 && correctCount === questions.length,
                didClear: isClear,
            });

            if (saveResult.success) {
                setResult({
                    isOpen: true,
                    isClear,
                    score,
                    coinsEarned: saveResult.coinsEarned || 0,
                    dailyCoinsTotal: saveResult.dailyCoinsTotal || 0,
                    dailyLimit: saveResult.dailyLimit || DAILY_GAME_COIN_LIMIT,
                    title: isClear ? "QUIZ CLEAR!" : "QUIZ ENDED",
                });
            } else {
                console.error("Game result save failed:", saveResult.error);
                setResult({
                    isOpen: true,
                    isClear,
                    score,
                    coinsEarned: 0,
                    dailyCoinsTotal: 0,
                    dailyLimit: DAILY_GAME_COIN_LIMIT,
                    title: isClear ? "CLEAR! (NOT SAVED)" : "ENDED (NOT SAVED)",
                });
            }

            const mode = searchParams.get("mode");
            const tournamentId = searchParams.get("tournamentId");
            if (mode === "tournament" && tournamentId) {
                await recordTournamentAttempt(tournamentId, score);
            }
        },
        [correctCount, currentIndex, hearts, questions.length, score, searchParams],
    );

    useEffect(() => {
        if (gameState !== "playing") return;

        if (timeLeft <= 0) {
            const timeout = setTimeout(() => {
                void endGame(false);
            }, 0);
            return () => clearTimeout(timeout);
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [endGame, gameState, timeLeft]);

    const startGame = useCallback(async (payload: StartPayload) => {
        setGameState("loading");

        const parsed = ((payload.questions || []) as RawQuestion[])
            .map((item) => {
                const options = parseOptions(item.options);
                const type: QuestionType =
                    item.type === "short-answer" || options.length === 0 ? "short-answer" : "multiple-choice";

                const answerTextFromOptions =
                    typeof item.correct_answer === "number" && options[item.correct_answer]
                        ? options[item.correct_answer]
                        : "";

                const answerText =
                    typeof item.answer_text === "string" && item.answer_text.trim().length > 0
                        ? item.answer_text
                        : answerTextFromOptions;

                if (typeof item.question_text !== "string" || answerText.length === 0) {
                    return null;
                }

                return {
                    id: String(item.id),
                    question_text: item.question_text,
                    answer_text: answerText,
                    options,
                    correct_answer: typeof item.correct_answer === "number" ? item.correct_answer : null,
                    type,
                } satisfies PreparedQuestion;
            })
            .filter((item): item is PreparedQuestion => item !== null)
            .sort(() => Math.random() - 0.5);

        if (parsed.length === 0) {
            alert("This question set has no playable questions.");
            setGameState("menu");
            return;
        }

        setRetryPayload(payload);
        gameEndLockRef.current = false;
        startTimeRef.current = performance.now();
        setQuestions(parsed);
        setCurrentIndex(0);
        setTimeLeft(START_TIME);
        setHearts(START_HEARTS);
        setScore(0);
        setCorrectCount(0);
        setRelicCount(0);
        setStreak(0);
        setFeedback(null);
        setShowFeedbackModal(false);
        setInputAnswer("");
        setGameState("playing");
    }, []);

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

            const selection = await getTournamentQuestionSetSelection(tournamentId, "history-quiz");
            if (!selection.success || !selection.questionSetId) {
                if (!cancelled) {
                    setTournamentInitError(selection.error || "Failed to load tournament question set.");
                    setIsTournamentInitializing(false);
                }
                return;
            }

            if (cancelled) return;

            const tournamentQuestions = (await getQuestions(selection.questionSetId)) as unknown as RawQuestion[];
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

    const advanceRound = (isCorrect: boolean) => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= questions.length) {
            void endGame(true);
            return;
        }

        setCurrentIndex(nextIndex);
        setInputAnswer("");
        if (!isCorrect) {
            setStreak(0);
        }
    };

    const resolveAnswer = (isCorrect: boolean) => {
        let nextHearts = hearts;
        const bossBonus = isBossRound ? HISTORY_SCORE_RULE.bossBonus : 0;

        if (isCorrect) {
            const streakBonus = Math.min(streak * HISTORY_SCORE_RULE.streakBonusPerStep, HISTORY_SCORE_RULE.streakBonusCap);
            const earned = HISTORY_SCORE_RULE.baseCorrect + bossBonus + streakBonus;
            setScore((prev) => prev + earned);
            setCorrectCount((prev) => prev + 1);
            setRelicCount((prev) => prev + 1);
            setStreak((prev) => prev + 1);
            setFeedback("correct");
        } else {
            nextHearts = hearts - 1;
            setHearts(nextHearts);
            setFeedback("wrong");
        }

        setTimeout(() => {
            setShowFeedbackModal(true);
            setTimeout(() => {
                setShowFeedbackModal(false);
                setFeedback(null);

                if (nextHearts <= 0) {
                    void endGame(false);
                    return;
                }

                advanceRound(isCorrect);
            }, 800);
        }, 600);
    };

    const handleMcSubmit = (optionIndex: number) => {
        if (!currentQuestion || feedback !== null || gameState !== "playing") return;

        const correctByIndex =
            currentQuestion.correct_answer !== null && optionIndex === currentQuestion.correct_answer;
        const correctByText =
            normalizeAnswer(currentQuestion.options[optionIndex] || "") ===
            normalizeAnswer(currentQuestion.answer_text);

        resolveAnswer(correctByIndex || correctByText);
    };

    const handleShortSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!currentQuestion || feedback !== null || gameState !== "playing") return;

        const isCorrect = normalizeAnswer(inputAnswer) === normalizeAnswer(currentQuestion.answer_text);
        resolveAnswer(isCorrect);
    };

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

    return (
        <div className="relative w-full overflow-hidden rounded-2xl border-[6px] border-[#4e342e] bg-[#271c19] shadow-[0_20px_50px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'NeoDungGeunMo', 'Galmuri11', 'Press Start 2P', system-ui, sans-serif" }}>
            <AnimatePresence mode="wait">
                {gameState === "menu" && (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative flex min-h-[580px] flex-col items-center justify-center p-8 overflow-hidden"
                    >
                        <style>{`
                            @keyframes floatGold {
                                0%, 100% { transform: translateY(0); filter: drop-shadow(0 4px 6px rgba(255, 215, 0, 0.4)); }
                                50% { transform: translateY(-8px); filter: drop-shadow(0 12px 15px rgba(255, 215, 0, 0.6)); }
                            }
                            .custom-scrollbar::-webkit-scrollbar {
                                width: 14px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-track {
                                background: #1c110a;
                                border-left: 2px solid #3e2723;
                                border-radius: 0 8px 8px 0;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb {
                                background: #8d6e63;
                                border: 3px solid #1c110a;
                                border-radius: 8px;
                            }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                background: #d7ccc8;
                            }
                        `}</style>

                        {/* Background Parallax */}
                        <Image
                            src={HISTORY_MAP_BG}
                            alt="History map background"
                            fill
                            className="pointer-events-none object-cover opacity-35 mix-blend-luminosity brightness-90"
                            sizes="(max-width: 768px) 100vw, 1200px"
                            priority
                        />

                        {/* Overlays */}
                        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,rgba(45,28,21,0.2)_0%,rgba(28,17,10,0.95)_100%)]"></div>
                        <div className="pointer-events-none absolute left-0 top-0 h-full w-full bg-[linear-gradient(45deg,rgba(255,215,0,0.03)_0%,transparent_50%,rgba(255,215,0,0.03)_100%)] mix-blend-overlay z-10"></div>

                        <div className="relative z-20 flex w-full max-w-4xl flex-col items-center">
                            {/* Header */}
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="mb-8 flex items-center justify-center gap-6"
                            >
                                <div className="relative hidden h-20 w-20 drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] md:block group">
                                    <Image src={HISTORY_RELIC} alt="Relic icon" fill className="object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" sizes="80px" />
                                    <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity" />
                                </div>

                                <div className="relative z-10 flex flex-col items-center">
                                    <h1
                                        className="whitespace-nowrap font-pixel text-5xl leading-[1.2] text-transparent bg-clip-text bg-gradient-to-b from-[#ffeaa7] to-[#fdcb6e] drop-shadow-[4px_4px_0_#5d4037] [text-shadow:4px_4px_0_#5d4037,_8px_8px_0_#1c110a] md:text-6xl text-center tracking-wide"
                                        style={{ animation: 'floatGold 3s infinite ease-in-out' }}
                                    >
                                        HISTORY<br />QUIZ
                                    </h1>
                                    <div className="mt-4 px-6 py-2 bg-[#1c110a]/80 border-2 border-[#5d4037] rounded-full backdrop-blur-sm shadow-[0_4px_0_0_#111]">
                                        <span className="font-pixel text-[#ffd54f] tracking-widest text-sm">역사 퀴즈: 클래스 퀘스트</span>
                                    </div>
                                </div>

                                <div className="relative hidden h-20 w-20 drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] md:block group">
                                    <Image src={HISTORY_BOSS_BADGE} alt="Boss badge" fill className="object-contain transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" sizes="80px" />
                                    <div className="absolute inset-0 bg-red-500 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity" />
                                </div>
                            </motion.div>

                            {/* Rule Notice */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-10 w-full max-w-2xl rounded-2xl border-4 border-[#5d4037] bg-[url('/wood-texture.png')] bg-[#3e2723]/90 bg-blend-multiply p-6 text-center shadow-[6px_6px_0_0_#1c110a]"
                            >
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <Swords className="text-[#ffd54f] h-6 w-6" />
                                    <h3 className="font-pixel text-xl text-[#f5efe0]">퀴즈 규칙</h3>
                                    <Swords className="text-[#ffd54f] h-6 w-6" />
                                </div>
                                <p className="font-pixel text-[14px] leading-relaxed text-[#d7ccc8] md:text-base border-t border-[#5d4037] pt-4 mt-2">
                                    단 <span className="text-[#ff7675] text-lg">3번의 생명</span>, 퀴즈를 풀고 유물을 획득하라!<br />
                                    STAGES <span className="text-[#ffab00] bg-[#1c110a] px-2 py-1 rounded">5, 10, 15</span> ARE BOSS ROUNDS!
                                </p>
                            </motion.div>

                            {/* Stage Selection */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="w-full max-w-2xl"
                            >
                                {runtimeData.questions.length > 0 && runtimeData.setId ? (
                                    <div className="w-full">
                                        <button
                                            className="group relative flex w-full flex-col md:flex-row items-center justify-between rounded-xl border-[4px] border-black bg-[#fdf5e6] p-4 text-left shadow-[6px_6px_0_0_#000] transition-all duration-200 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] active:translate-y-[4px] active:shadow-[2px_2px_0_0_#000] overflow-hidden"
                                            onClick={() =>
                                                void startGame({
                                                    setId: runtimeData.setId!,
                                                    title: runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set",
                                                    questions: runtimeData.questions,
                                                })
                                            }
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.2] to-transparent -translate-x-full group-hover:translate-x-full duration-700 transition-transform" />

                                            <div className="flex items-center gap-4 relative z-10 w-full mb-4 md:mb-0">
                                                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black bg-[#ff2e63] font-pixel text-xl text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]">
                                                    1
                                                </div>
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h2 className="truncate w-full font-pixel text-xl text-black transition-colors group-hover:text-[#ff2e63]">
                                                        {runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set"}
                                                    </h2>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <span className="flex items-center gap-1 font-pixel text-[11px] text-gray-700 bg-black/5 px-2 py-0.5 rounded border border-gray-400">
                                                            <ScrollText className="h-3 w-3" /> AUTO APPLIED
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center justify-center w-full md:w-auto h-14 md:h-12 px-8 rounded-lg border-[3px] border-black bg-[#ff2e63] font-pixel text-xl text-white tracking-widest shadow-[4px_4px_0_0_#000] transition-transform group-hover:scale-105 group-active:scale-95 group-active:translate-y-1 group-active:shadow-[2px_2px_0_0_#000]">
                                                START
                                            </div>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border-4 border-dashed border-[#5d4037] bg-[#2d1c15]/80 p-12 text-center backdrop-blur-sm shadow-inner">
                                        <ScrollText className="h-16 w-16 text-[#8d6e63] mb-4 opacity-70" />
                                        <h3 className="font-pixel text-2xl text-[#d7ccc8] mb-2">활성화된 퀴즈가 없습니다</h3>
                                        <p className="font-bold text-[#a1887f]">
                                            선생님이 관련 역사 문제 세트를 등록하고 활성화해야<br />퀴즈를 시작할 수 있습니다.
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {gameState === "loading" && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex min-h-[580px] flex-col items-center justify-center p-8 bg-[#1c110a]"
                    >
                        <div className="relative flex flex-col items-center justify-center">
                            <Loader2 className="h-16 w-16 animate-spin text-[#ffd54f]" />
                            <p className="mt-6 font-pixel text-xl text-[#d7ccc8] animate-pulse">원정 준비 중...</p>
                        </div>
                    </motion.div>
                )}

                {gameState === "playing" && currentQuestion && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            x: feedback === "wrong" ? [-10, 10, -10, 10, 0] : 0
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            x: { duration: 0.4, type: "keyframes" }
                        }}
                        className={`relative p-4 md:p-6 min-h-[580px] flex flex-col space-y-4 ${isBossRound ? 'bg-[#3e1111]' : 'bg-[#271c19]'}`}
                    >
                        <style>{`
                            @keyframes floatNPC {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-5px); }
                            }
                        `}</style>
                        <Image
                            src={HISTORY_MAP_BG}
                            alt="History stage background"
                            fill
                            className="pointer-events-none object-cover opacity-60 mix-blend-luminosity"
                            sizes="(max-width: 768px) 100vw, 1200px"
                        />
                        <div className={`absolute inset-0 ${isBossRound ? 'bg-[radial-gradient(circle_at_center,transparent_0%,#3e1111_100%)] opacity-80' : 'bg-[radial-gradient(circle_at_center,transparent_0%,#1c110a_100%)] opacity-90'}`} />

                        <div className="relative z-10 flex flex-col space-y-4 flex-1">
                            {/* HUD Top Bar */}
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-xl border-[3px] border-[#3e2723] bg-[#2d1c15]/90 p-3 shadow-[0_4px_0_0_#1c110a]">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#d7ccc8]">
                                        <Timer className="h-4 w-4" /> TIME
                                    </div>
                                    <p className={`font-pixel text-2xl mt-1 ${timeLeft <= 30 ? 'text-[#ff7675] animate-pulse' : 'text-[#ffd54f]'}`}>{timeLeft}s</p>
                                </div>
                                <div className="rounded-xl border-[3px] border-[#3e2723] bg-[#2d1c15]/90 p-3 shadow-[0_4px_0_0_#1c110a]">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#d7ccc8]">
                                        <Heart className="h-4 w-4" /> LIFE
                                    </div>
                                    <p className="font-pixel text-2xl mt-1 text-[#ff7675]">{hearts}</p>
                                </div>
                                <div className="rounded-xl border-[3px] border-[#3e2723] bg-[#2d1c15]/90 p-3 shadow-[0_4px_0_0_#1c110a]">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#d7ccc8]">
                                        <Gem className="h-4 w-4" /> RELIC
                                    </div>
                                    <p className="font-pixel text-2xl mt-1 text-[#55efc4]">{relicCount}</p>
                                </div>
                                <div className="rounded-xl border-[3px] border-[#3e2723] bg-[#2d1c15]/90 p-3 shadow-[0_4px_0_0_#1c110a]">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#d7ccc8]">
                                        <Trophy className="h-4 w-4" /> SCORE
                                    </div>
                                    <p className="font-pixel text-2xl mt-1 text-[#74b9ff]">{score}</p>
                                </div>
                            </div>

                            {/* RPG Battle Scene Area */}
                            <div className="relative min-h-[160px] md:min-h-[220px] w-full mt-4 flex items-end justify-between px-4 pb-4">
                                <motion.div
                                    initial={{ x: 0 }}
                                    animate={feedback === "correct" ? { x: ["0px", "min(35vw, 250px)", "min(35vw, 250px)", "0px"] } : { x: 0 }}
                                    transition={{ duration: 0.5, times: [0, 0.2, 0.8, 1], type: "keyframes" }}
                                    className="relative h-24 w-24 md:h-32 md:w-32 drop-shadow-[5px_5px_0_rgba(0,0,0,0.5)] z-30"
                                >
                                    <Image src={feedback === "correct" ? HISTORY_PLAYER_ATTACK : HISTORY_PLAYER} alt="Player" fill className="object-contain" />
                                    {feedback === "wrong" && (
                                        <div className="absolute inset-0 bg-red-600/60 mix-blend-overlay animate-pulse rounded-full blur-xl z-40" />
                                    )}
                                </motion.div>

                                <motion.div
                                    initial={{ x: 0 }}
                                    animate={
                                        feedback === "wrong"
                                            ? { x: ["0px", "max(-35vw, -250px)", "max(-35vw, -250px)", "0px"] }
                                            : feedback === "correct"
                                                ? { x: [10, -10, 10, -10, 0] }
                                                : { x: 0 }
                                    }
                                    transition={{
                                        duration: 0.5,
                                        times: feedback === "wrong" ? [0, 0.2, 0.8, 1] : undefined,
                                        type: "keyframes"
                                    }}
                                    className="relative h-32 w-32 md:h-48 md:w-48 drop-shadow-[5px_5px_0_rgba(0,0,0,0.6)] z-20"
                                >
                                    <div className="relative w-full h-full" style={{ animation: 'floatNPC 2s infinite ease-in-out' }}>
                                        <div className="relative w-full h-full -scale-x-100">
                                            {isBossRound ? (
                                                <Image src={feedback === "wrong" ? HISTORY_BOSS_TIGER_ATTACK : HISTORY_BOSS_TIGER} alt="Boss Tiger" fill className="object-contain" />
                                            ) : (
                                                <Image src={feedback === "wrong" ? HISTORY_NPC_ATTACK : HISTORY_NPC} alt="Enemy NPC" fill className="object-contain" />
                                            )}
                                        </div>
                                        {feedback === "correct" && (
                                            <div className="absolute inset-0 bg-red-600/60 mix-blend-overlay animate-pulse rounded-full blur-xl z-40" />
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Quiz Box */}
                            <div className={`relative z-30 rounded-2xl border-[4px] p-5 shadow-[0_6px_0_0_#1c110a] ${isBossRound ? "border-[#c0392b] bg-[#e74c3c]" : "border-[#5d4037] bg-[#f5efe0]"}`}>
                                <div className={`mb-3 flex items-center justify-between text-sm font-bold ${isBossRound ? 'text-white' : 'text-[#3e2723]'}`}>
                                    <span className="flex items-center gap-2">
                                        <Compass className="h-4 w-4" /> STAGE {currentIndex + 1} / {questions.length}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">COMBO x{streak}</span>
                                        <div className="w-20 md:w-32 h-3 bg-black/20 rounded-full overflow-hidden border border-black/30">
                                            <motion.div
                                                className={`h-full ${streak >= 5 ? 'bg-[#ff9f43] animate-pulse' : 'bg-[#00cec9]'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((streak / 5) * 100, 100)}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isBossRound && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-[#c0392b] px-4 py-1.5 font-pixel text-lg text-white shadow-[0_4px_0_0_#000] z-40">
                                        <div className="relative h-6 w-6">
                                            <Image src={HISTORY_BOSS_BADGE} alt="Boss badge" fill className="object-contain" sizes="24px" />
                                        </div>
                                        <span className="animate-pulse">BOSS WARNING</span>
                                    </div>
                                )}

                                <h2 className={`min-h-[72px] font-pixel text-xl leading-relaxed md:text-2xl mt-2 ${isBossRound ? 'text-white' : 'text-[#2d1c15]'}`}>
                                    {currentQuestion.question_text}
                                </h2>

                                {currentQuestion.type === "multiple-choice" && (
                                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {currentQuestion.options.map((option, idx) => (
                                            <Button
                                                key={`${option}-${idx}`}
                                                variant="outline"
                                                disabled={feedback !== null}
                                                onClick={() => handleMcSubmit(idx)}
                                                className={`h-auto min-h-[56px] py-3 px-4 border-[3px] text-base font-bold whitespace-normal text-left justify-start transition-all ${isBossRound
                                                    ? 'border-[#922b21] bg-[#c0392b] text-white hover:bg-[#a93226] active:translate-y-1'
                                                    : 'border-[#5d4037] bg-white text-[#3e2723] hover:bg-[#fff9c4] active:translate-y-1'
                                                    }`}
                                            >
                                                {option}
                                            </Button>
                                        ))}
                                    </div>
                                )}

                                {currentQuestion.type === "short-answer" && (
                                    <form onSubmit={handleShortSubmit} className="mt-5 flex flex-col gap-3 md:flex-row">
                                        <Input
                                            value={inputAnswer}
                                            onChange={(event) => setInputAnswer(event.target.value)}
                                            placeholder="정답을 입력하세요"
                                            disabled={feedback !== null}
                                            className={`h-14 border-[3px] text-lg font-bold ${isBossRound
                                                ? 'border-[#922b21] bg-[#c0392b] text-white placeholder-white/60'
                                                : 'border-[#5d4037] bg-white text-[#2d1c15]'
                                                }`}
                                        />
                                        <Button
                                            type="submit"
                                            disabled={feedback !== null || inputAnswer.trim().length === 0}
                                            className={`h-14 border-[3px] border-black font-pixel font-bold shadow-[0_4px_0_0_#000] active:translate-y-1 active:shadow-none ${isBossRound ? 'bg-[#fbc531] text-black hover:bg-[#e1b12c]' : 'bg-[#00b894] text-white hover:bg-[#00cec9]'
                                                }`}
                                        >
                                            공격하기!
                                        </Button>
                                    </form>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="rounded-xl border-[3px] border-[#3e2723] bg-black/60 p-3 mt-auto">
                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#d7ccc8]">
                                    <span>퀴즈 진행도</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="relative h-4 overflow-hidden rounded-full border border-black bg-[#2d1c15]">
                                    <motion.div
                                        initial={false}
                                        animate={{ width: `${progressPercent}%` }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                        className="h-full bg-[linear-gradient(90deg,#ffd54f,#fbc531)]"
                                    />
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {showFeedbackModal && feedback && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                                >
                                    <div className={`flex flex-col items-center justify-center rounded-2xl border-[6px] border-black px-10 py-8 shadow-[8px_8px_0_0_black] ${feedback === "correct" ? "bg-[#55efc4] text-[#2d3436]" : "bg-[#ff7675] text-white"}`}>
                                        <span className="font-pixel text-4xl mb-2">{feedback === "correct" ? "명중!" : "피격!"}</span>
                                        <span className="font-bold text-lg">{feedback === "correct" ? "+ 유물 획득" : "- 하트 손실"}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
