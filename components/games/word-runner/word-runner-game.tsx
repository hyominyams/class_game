"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Heart, Loader2, Shield, Timer, Trophy, Ghost, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameResultModal } from "@/components/game/game-result-modal";
import { getQuestions } from "@/app/actions/game-data";
import { saveGameResult } from "@/app/actions/game";
import { DAILY_GAME_COIN_LIMIT } from "@/app/constants/economy";
import { getTournamentQuestionSetSelection, recordTournamentAttempt } from "@/app/actions/tournament";

type GameState = "menu" | "loading" | "playing" | "gameover";
type EnemyKind = "zombie" | "bat" | "tank" | "boss";
type SfxKind = "correct" | "hit" | "kill" | "castleHit" | "shield" | "clear" | "fail";

type AssetKey =
    | "bgSky"
    | "bgMain"
    | "castle1"
    | "castle2"
    | "castle3"
    | "castleBarrier"
    | "enemyZombie"
    | "enemyBat"
    | "enemyTank"
    | "boss"
    | "effectCorrect"
    | "effectHit"
    | "effectKill";

type AnimatedEnemyAssetKey = "enemyZombie" | "enemyBat" | "enemyTank" | "boss";
type WordQuestionMode = "en_to_ko" | "ko_to_en" | "mixed";

interface EnemySpriteSheetMeta {
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    cols: number;
    rows: number;
    durationsMs: number[];
    totalDurationMs: number;
}

interface EnemySpriteAnimation extends EnemySpriteSheetMeta {
    image: HTMLImageElement;
}

interface RuntimeQuestionsData {
    setId: string | null;
    sourceScope: "CLASS" | "GLOBAL" | null;
    questionMode: WordQuestionMode;
    questions: unknown[];
}

interface StartPayload {
    setId: string;
    title: string;
    questionMode: WordQuestionMode;
    questions: unknown[];
}

interface RawQuestion {
    id: string | number;
    question_text?: unknown;
    answer_text?: unknown;
    correct_answer?: unknown;
    options?: unknown;
}

interface WordPair {
    id: string;
    promptEn: string;
    answerKo: string;
}

interface EnemyEntity {
    id: number;
    kind: EnemyKind;
    x: number;
    y: number;
    speed: number;
    hp: number;
    maxHp: number;
    size: number;
    value: number;
    pair: WordPair;
}

interface VisualEffect {
    id: number;
    kind: "correct" | "hit" | "kill";
    x: number;
    y: number;
    life: number;
    maxLife: number;
    size: number;
}

const START_LIVES = 5;
const START_TIME = 120;
const WAVE_SECONDS = 15;
const SHIELD_MAX_CHARGE = 8;
const SHIELD_DURATION_SEC = 6;
const ENEMY_SPRITE_PLAYBACK_RATE = 5;
const MAX_REGULAR_ENEMIES_ON_FIELD = 4;
const CANVAS_FONT_WORD = "bold 15px 'Press Start 2P', 'DungGeunMo', 'Malgun Gothic', sans-serif";
const CANVAS_FONT_HUD = "bold 12px 'Press Start 2P', 'DungGeunMo', 'Malgun Gothic', sans-serif";
const CANVAS_FONT_LOADING = "bold 14px 'Press Start 2P', 'DungGeunMo', 'Malgun Gothic', sans-serif";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const PATH_Y = 430;
const CASTLE_HIT_X = 188;

const ASSET_PATHS: Record<AssetKey, string> = {
    bgSky: "/bg-sky.png",
    bgMain: "/bg-main.png",
    castle1: "/castle1.png",
    castle2: "/castle2.png",
    castle3: "/castle3.png",
    castleBarrier: "/castle-barrier.png",
    enemyZombie: "/enemy-zombie.png",
    enemyBat: "/enemy-bat.png",
    enemyTank: "/enemy-tank.png",
    boss: "/boss.png",
    effectCorrect: "/effect-correct.png",
    effectHit: "/effect-hit.png",
    effectKill: "/effect-kill.png",
};

const ANIMATED_ENEMY_ASSET_KEYS: AnimatedEnemyAssetKey[] = ["enemyZombie", "enemyBat", "enemyTank", "boss"];
const ENEMY_SPRITE_PATHS: Record<AnimatedEnemyAssetKey, { image: string; meta: string }> = {
    enemyZombie: { image: "/sprites/enemy-zombie-sheet.png", meta: "/sprites/enemy-zombie-sheet.json" },
    enemyBat: { image: "/sprites/enemy-bat-sheet.png", meta: "/sprites/enemy-bat-sheet.json" },
    enemyTank: { image: "/sprites/enemy-tank-sheet.png", meta: "/sprites/enemy-tank-sheet.json" },
    boss: { image: "/sprites/boss-sheet.png", meta: "/sprites/boss-sheet.json" },
};

const ENEMY_CONFIG: Record<EnemyKind, { speed: number; hp: number; size: number; value: number; asset: AssetKey }> = {
    zombie: { speed: 36, hp: 1, size: 62, value: 120, asset: "enemyZombie" },
    bat: { speed: 48, hp: 1, size: 54, value: 140, asset: "enemyBat" },
    tank: { speed: 27, hp: 3, size: 72, value: 230, asset: "enemyTank" },
    boss: { speed: 21, hp: 8, size: 126, value: 1200, asset: "boss" },
};

const SFX_CONFIG: Record<SfxKind, { from: number; to: number; duration: number; gain: number; type: OscillatorType }> = {
    correct: { from: 560, to: 760, duration: 0.08, gain: 0.06, type: "triangle" },
    hit: { from: 420, to: 280, duration: 0.07, gain: 0.06, type: "square" },
    kill: { from: 240, to: 520, duration: 0.14, gain: 0.08, type: "sawtooth" },
    castleHit: { from: 140, to: 90, duration: 0.15, gain: 0.09, type: "sawtooth" },
    shield: { from: 460, to: 980, duration: 0.18, gain: 0.06, type: "sine" },
    clear: { from: 520, to: 980, duration: 0.22, gain: 0.08, type: "triangle" },
    fail: { from: 180, to: 100, duration: 0.24, gain: 0.08, type: "square" },
};

function hasHangul(text: string) {
    return /[\uAC00-\uD7A3]/.test(text);
}

function normalizeMeaning(text: string) {
    return text.trim().replace(/\s+/g, "").toLowerCase();
}

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

function normalizeQuestionMode(value: unknown): WordQuestionMode {
    if (value === "ko_to_en" || value === "mixed" || value === "en_to_ko") {
        return value;
    }

    return "en_to_ko";
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function loadImageAsset(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = src;
    });
}

export function WordDefenseGame({ runtimeData }: { runtimeData: RuntimeQuestionsData }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState<GameState>("menu");
    const [retryPayload, setRetryPayload] = useState<StartPayload | null>(null);
    const [wordPairs, setWordPairs] = useState<WordPair[]>([]);

    const [timeLeft, setTimeLeft] = useState(START_TIME);
    const [lives, setLives] = useState(START_LIVES);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [bestCombo, setBestCombo] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [killCount, setKillCount] = useState(0);
    const [wave, setWave] = useState(1);
    const [shieldCharge, setShieldCharge] = useState(0);
    const [shieldActive, setShieldActive] = useState(false);
    const [typedInput, setTypedInput] = useState("");
    const [statusMessage, setStatusMessage] = useState("단어 뜻을 입력해 적을 처치하세요. Enter로 제출하고 Shift/F로 보호막을 사용할 수 있습니다.");
    const [lastInputCorrect, setLastInputCorrect] = useState<boolean | null>(null);
    const [assetsReady, setAssetsReady] = useState(false);

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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef(0);
    const shieldUntilRef = useRef(0);
    const gameEndLockRef = useRef(false);
    const tournamentBootstrapRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const assetsRef = useRef<Record<AssetKey, HTMLImageElement | null>>({
        bgSky: null,
        bgMain: null,
        castle1: null,
        castle2: null,
        castle3: null,
        castleBarrier: null,
        enemyZombie: null,
        enemyBat: null,
        enemyTank: null,
        boss: null,
        effectCorrect: null,
        effectHit: null,
        effectKill: null,
    });
    const enemySpriteAnimationsRef = useRef<Partial<Record<AnimatedEnemyAssetKey, EnemySpriteAnimation>>>({});

    const runtimeRef = useRef({
        enemies: [] as EnemyEntity[],
        effects: [] as VisualEffect[],
        elapsed: 0,
        spawnTimer: 0,
        nextEnemyId: 1,
        nextEffectId: 1,
        lastTimestamp: 0,
        bossSpawned: false,
    });

    const pairsRef = useRef<WordPair[]>([]);
    const typedInputRef = useRef(typedInput);
    const timeLeftRef = useRef(timeLeft);
    const livesRef = useRef(lives);
    const scoreRef = useRef(score);
    const comboRef = useRef(combo);
    const bestComboRef = useRef(bestCombo);
    const correctCountRef = useRef(correctCount);
    const killCountRef = useRef(killCount);
    const waveRef = useRef(wave);
    const shieldChargeRef = useRef(shieldCharge);
    const shieldActiveRef = useRef(shieldActive);

    const getAudioContext = useCallback(() => {
        if (typeof window === "undefined") return null;

        if (!audioContextRef.current) {
            const AudioContextCtor =
                window.AudioContext ||
                (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextCtor) return null;
            audioContextRef.current = new AudioContextCtor();
        }

        return audioContextRef.current;
    }, []);

    const playSfx = useCallback(
        (kind: SfxKind) => {
            const ctx = getAudioContext();
            if (!ctx) return;

            if (ctx.state === "suspended") {
                void ctx.resume();
            }

            const preset = SFX_CONFIG[kind];
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = preset.type;
            osc.frequency.setValueAtTime(Math.max(60, preset.from), now);
            osc.frequency.exponentialRampToValueAtTime(Math.max(60, preset.to), now + preset.duration);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(preset.gain, now + Math.min(0.02, preset.duration * 0.35));
            gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + preset.duration + 0.02);
        },
        [getAudioContext],
    );

    useEffect(() => {
        return () => {
            if (!audioContextRef.current) return;
            void audioContextRef.current.close();
            audioContextRef.current = null;
        };
    }, []);

    useEffect(() => {
        pairsRef.current = wordPairs;
    }, [wordPairs]);

    useEffect(() => {
        typedInputRef.current = typedInput;
    }, [typedInput]);

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        livesRef.current = lives;
    }, [lives]);

    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    useEffect(() => {
        comboRef.current = combo;
    }, [combo]);

    useEffect(() => {
        bestComboRef.current = bestCombo;
    }, [bestCombo]);

    useEffect(() => {
        correctCountRef.current = correctCount;
    }, [correctCount]);

    useEffect(() => {
        killCountRef.current = killCount;
    }, [killCount]);

    useEffect(() => {
        waveRef.current = wave;
    }, [wave]);

    useEffect(() => {
        shieldChargeRef.current = shieldCharge;
    }, [shieldCharge]);

    useEffect(() => {
        shieldActiveRef.current = shieldActive;
    }, [shieldActive]);

    useEffect(() => {
        let cancelled = false;

        const loadAssets = async () => {
            const entries = await Promise.all(
                Object.entries(ASSET_PATHS).map(async ([key, src]) => [key as AssetKey, await loadImageAsset(src)] as const),
            );

            if (cancelled) return;

            const nextAssets = { ...assetsRef.current };
            for (const [key, image] of entries) {
                nextAssets[key] = image;
            }

            assetsRef.current = nextAssets;
            setAssetsReady(true);
        };

        void loadAssets();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadSpriteAnimations = async () => {
            const animationMap: Partial<Record<AnimatedEnemyAssetKey, EnemySpriteAnimation>> = {};

            await Promise.all(
                ANIMATED_ENEMY_ASSET_KEYS.map(async (key) => {
                    try {
                        const [metaResponse, sheetImage] = await Promise.all([
                            fetch(ENEMY_SPRITE_PATHS[key].meta, { cache: "force-cache" }),
                            loadImageAsset(ENEMY_SPRITE_PATHS[key].image),
                        ]);

                        if (!metaResponse.ok || !sheetImage) return;

                        const meta = (await metaResponse.json()) as EnemySpriteSheetMeta;
                        const frameCount = Math.max(1, Number(meta.frameCount) || 1);
                        const durationsMsRaw = Array.isArray(meta.durationsMs) ? meta.durationsMs : [];
                        const durationsMs =
                            durationsMsRaw.length === frameCount
                                ? durationsMsRaw.map((value) => Math.max(16, Number(value) || 16))
                                : new Array(frameCount).fill(100);
                        const totalDurationMs = durationsMs.reduce((sum, value) => sum + value, 0);
                        if (totalDurationMs <= 0) return;

                        animationMap[key] = {
                            image: sheetImage,
                            frameWidth: Math.max(1, Number(meta.frameWidth) || 1),
                            frameHeight: Math.max(1, Number(meta.frameHeight) || 1),
                            frameCount,
                            cols: Math.max(1, Number(meta.cols) || 1),
                            rows: Math.max(1, Number(meta.rows) || 1),
                            durationsMs,
                            totalDurationMs,
                        };
                    } catch {
                        // Fallback to static png assets when sprite metadata or sheet is unavailable.
                    }
                }),
            );

            if (cancelled) return;
            enemySpriteAnimationsRef.current = animationMap;
        };

        void loadSpriteAnimations();

        return () => {
            cancelled = true;
            enemySpriteAnimationsRef.current = {};
        };
    }, []);

    const addEffect = useCallback(
        (kind: VisualEffect["kind"], x: number, y: number, size = 104, maxLife = 0.3) => {
            const runtime = runtimeRef.current;
            runtime.effects.push({
                id: runtime.nextEffectId++,
                kind,
                x,
                y,
                life: maxLife,
                maxLife,
                size,
            });
        },
        [],
    );

    const spawnEnemy = useCallback(
        (forcedKind?: EnemyKind) => {
            const pairs = pairsRef.current;
            if (pairs.length === 0) return;

            const runtime = runtimeRef.current;
            const pair = pairs[Math.floor(Math.random() * pairs.length)];
            const waveLevel = waveRef.current;

            let kind: EnemyKind = forcedKind || "zombie";
            if (!forcedKind) {
                const roll = Math.random();
                if (waveLevel >= 5 && roll > 0.84) kind = "tank";
                else if (waveLevel >= 2 && roll > 0.52) kind = "bat";
            }

            const base = ENEMY_CONFIG[kind];
            const speedScale = 1 + (waveLevel - 1) * 0.025;
            const extraHp = kind === "tank" || kind === "boss" ? Math.floor((waveLevel - 1) / 3) : 0;

            const y = kind === "bat" ? PATH_Y - 86 + Math.random() * 14 : PATH_Y - 20 + Math.random() * 10;

            runtime.enemies.push({
                id: runtime.nextEnemyId++,
                kind,
                x: CANVAS_WIDTH + 80,
                y,
                speed: base.speed * speedScale,
                hp: base.hp + extraHp,
                maxHp: base.hp + extraHp,
                size: base.size,
                value: base.value,
                pair,
            });
        },
        [],
    );

    const endGame = useCallback(
        async (isClearOverride?: boolean) => {
            if (gameEndLockRef.current) return;
            gameEndLockRef.current = true;

            setGameState("gameover");

            const finalScore = scoreRef.current;
            const finalCorrect = correctCountRef.current;
            const finalKills = killCountRef.current;
            const finalLives = livesRef.current;
            const isClear = isClearOverride ?? finalLives > 0;
            const playTime = Math.floor((performance.now() - startTimeRef.current) / 1000);
            const isParticipationRun = finalCorrect > 0 || finalKills > 0 || playTime >= 40;

            const saveResult = await saveGameResult("word-runner", finalScore, playTime, {
                correctCount: finalCorrect,
                totalQuestions: Math.max(finalKills, finalCorrect),
                isPerfect: isClear && finalLives === START_LIVES,
                didClear: isClear,
                minimumReward: !isClear && isParticipationRun ? 3 : 0,
            });

            setResult({
                isOpen: true,
                isClear,
                score: finalScore,
                coinsEarned: saveResult.success ? saveResult.coinsEarned || 0 : 0,
                dailyCoinsTotal: saveResult.success ? saveResult.dailyCoinsTotal || 0 : 0,
                dailyLimit: saveResult.success ? saveResult.dailyLimit || DAILY_GAME_COIN_LIMIT : DAILY_GAME_COIN_LIMIT,
                title: isClear ? "성공! 성을 지켜냈습니다. 더 높은 점수로 다시 도전해 보세요!" : "방어 실패... 다음 판에서 다시 도전해 보세요.",
            });

            playSfx(isClear ? "clear" : "fail");

            const mode = searchParams.get("mode");
            const tournamentId = searchParams.get("tournamentId");
            if (mode === "tournament" && tournamentId) {
                await recordTournamentAttempt(tournamentId, finalScore);
            }
        },
        [playSfx, searchParams],
    );

    const triggerShield = useCallback(() => {
        if (gameState !== "playing") return;

        if (shieldActiveRef.current) {
            setStatusMessage("보호막이 이미 활성화되어 있습니다. 잠시만 기다려 주세요.");
            return;
        }

        if (shieldChargeRef.current < SHIELD_MAX_CHARGE) {
            setStatusMessage(`보호막 게이지가 부족합니다. 단어를 맞혀 게이지를 채우세요. ${shieldChargeRef.current}/${SHIELD_MAX_CHARGE}`);
            return;
        }

        shieldChargeRef.current = 0;
        shieldActiveRef.current = true;
        setShieldCharge(0);
        setShieldActive(true);
        shieldUntilRef.current = runtimeRef.current.elapsed + SHIELD_DURATION_SEC;
        addEffect("correct", 110, PATH_Y - 130, 176, 0.6);
        playSfx("shield");
        setStatusMessage("보호막 발동! 일정 시간 동안 성이 피해를 받지 않습니다. 지금 반격하세요.");

        setLastInputCorrect(true);
    }, [addEffect, gameState, playSfx]);

    const submitAnswer = useCallback(() => {
        if (gameState !== "playing") return;

        const rawInput = typedInputRef.current;
        const normalizedInput = normalizeMeaning(rawInput);
        if (!normalizedInput) return;

        const runtime = runtimeRef.current;
        let targetIndex = -1;

        for (let i = 0; i < runtime.enemies.length; i++) {
            const enemy = runtime.enemies[i];
            if (normalizeMeaning(enemy.pair.answerKo) === normalizedInput) {
                if (targetIndex === -1 || enemy.x < runtime.enemies[targetIndex].x) {
                    targetIndex = i;
                }
            }
        }

        if (targetIndex === -1) {
            comboRef.current = 0;
            setCombo(0);
            setStatusMessage("일치하는 적이 없습니다. 화면의 단어 뜻을 확인하고 다시 입력해 보세요.");
            setLastInputCorrect(false);
            playSfx("castleHit");
            typedInputRef.current = "";
            setTypedInput("");
            return;
        }

        const enemy = runtime.enemies[targetIndex];
        enemy.hp -= 1;
        addEffect("hit", enemy.x, enemy.y - 4, 96, 0.24);

        const nextCorrect = correctCountRef.current + 1;
        correctCountRef.current = nextCorrect;
        setCorrectCount(nextCorrect);

        const nextCombo = Math.min(comboRef.current + 1, 30);
        comboRef.current = nextCombo;
        setCombo(nextCombo);

        if (nextCombo > bestComboRef.current) {
            bestComboRef.current = nextCombo;
            setBestCombo(nextCombo);
        }

        const nextCharge = Math.min(SHIELD_MAX_CHARGE, shieldChargeRef.current + 1);
        shieldChargeRef.current = nextCharge;
        setShieldCharge(nextCharge);

        let gained = 40 + Math.min((nextCombo - 1) * 6, 60);

        if (enemy.hp <= 0) {
            runtime.enemies.splice(targetIndex, 1);
            addEffect("kill", enemy.x, enemy.y - 8, enemy.kind === "boss" ? 214 : 142, 0.4);
            addEffect("correct", 126, PATH_Y - 146, 132, 0.32);
            playSfx("kill");

            const nextKills = killCountRef.current + 1;
            killCountRef.current = nextKills;
            setKillCount(nextKills);

            gained += enemy.value + Math.min(nextCombo * 12, 180);
        } else {
            playSfx("hit");
        }

        const nextScore = scoreRef.current + gained;
        scoreRef.current = nextScore;
        setScore(nextScore);

        const statusAction = enemy.hp <= 0 ? "DEFEATED" : "HIT";
        setStatusMessage(`${enemy.pair.promptEn} ${statusAction} +${gained}`);

        if (nextCharge >= SHIELD_MAX_CHARGE) {
            setStatusMessage("Shield ready! Press [Shift] or the button.");
            playSfx("correct");
        }

        setLastInputCorrect(true);
        typedInputRef.current = "";
        setTypedInput("");
    }, [addEffect, gameState, playSfx]);

    const startGame = useCallback(async (payload: StartPayload) => {
        setGameState("loading");
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
            void ctx.resume();
        }

        const questionMode = normalizeQuestionMode(payload.questionMode);
        const normalized = ((payload.questions || []) as RawQuestion[])
            .map((item) => {
                const questionText = typeof item.question_text === "string" ? item.question_text.trim() : "";
                const parsedOptions = parseOptions(item.options);
                const fallbackAnswer =
                    typeof item.correct_answer === "number" && parsedOptions[item.correct_answer]
                        ? parsedOptions[item.correct_answer]
                        : "";
                const answerText =
                    typeof item.answer_text === "string" && item.answer_text.trim().length > 0
                        ? item.answer_text.trim()
                        : fallbackAnswer;

                if (!questionText || !answerText) return null;

                const questionLooksKorean = hasHangul(questionText) && !hasHangul(answerText);
                const answerLooksKorean = hasHangul(answerText) && !hasHangul(questionText);
                const koreanText = questionLooksKorean ? questionText : answerLooksKorean ? answerText : questionText;
                const englishText = questionLooksKorean ? answerText : answerLooksKorean ? questionText : answerText;

                const useKoreanPrompt =
                    questionMode === "ko_to_en" ||
                    (questionMode === "mixed" && Math.random() >= 0.5);
                const promptEn = useKoreanPrompt ? koreanText : englishText;
                const answerKo = useKoreanPrompt ? englishText : koreanText;

                return {
                    id: String(item.id),
                    promptEn,
                    answerKo,
                } satisfies WordPair;
            })
            .filter((item): item is WordPair => item !== null);

        if (normalized.length === 0) {
            alert("사용 가능한 단어 문제가 없습니다. 교사가 문제 세트를 활성화했는지 확인한 뒤 다시 시도해 주세요.");
            setGameState("menu");
            return;
        }

        setRetryPayload(payload);
        gameEndLockRef.current = false;
        startTimeRef.current = performance.now();
        shieldUntilRef.current = 0;

        runtimeRef.current = {
            enemies: [],
            effects: [],
            elapsed: 0,
            spawnTimer: 0,
            nextEnemyId: 1,
            nextEffectId: 1,
            lastTimestamp: 0,
            bossSpawned: false,
        };

        setWordPairs(normalized);

        timeLeftRef.current = START_TIME;
        livesRef.current = START_LIVES;
        scoreRef.current = 0;
        comboRef.current = 0;
        bestComboRef.current = 0;
        correctCountRef.current = 0;
        killCountRef.current = 0;
        waveRef.current = 1;
        shieldChargeRef.current = 0;
        shieldActiveRef.current = false;

        setTimeLeft(START_TIME);
        setLives(START_LIVES);
        setScore(0);
        setCombo(0);
        setBestCombo(0);
        setCorrectCount(0);
        setKillCount(0);
        setWave(1);
        setShieldCharge(0);
        setShieldActive(false);

        typedInputRef.current = "";
        setTypedInput("");
        setLastInputCorrect(null);
        setStatusMessage("단어 뜻을 입력해 적을 처치하세요. Enter로 제출하고 Shift/F로 보호막을 사용할 수 있습니다.");

        setGameState("playing");
    }, [getAudioContext]);

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

            const selection = await getTournamentQuestionSetSelection(tournamentId, "word-runner");
            if (!selection.success || !selection.questionSetId) {
                if (!cancelled) {
                    setTournamentInitError(selection.error || "토너먼트 문제 세트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
                    setIsTournamentInitializing(false);
                }
                return;
            }

            if (cancelled) return;

            const tournamentQuestions = (await getQuestions(selection.questionSetId)) as unknown as RawQuestion[];
            await startGame({
                setId: selection.questionSetId,
                title: selection.tournamentTitle ? selection.tournamentTitle + " tournament set" : "tournament set",
                questionMode: normalizeQuestionMode(selection.questionMode),
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

    useEffect(() => {
        if (gameState !== "playing") return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Shift" || event.key.toLowerCase() === "f") {
                event.preventDefault();
                triggerShield();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameState, triggerShield]);

    useEffect(() => {
        if (gameState !== "playing") return;

        const timer = window.setInterval(() => {
            const nextTime = Math.max(0, timeLeftRef.current - 1);
            timeLeftRef.current = nextTime;
            setTimeLeft(nextTime);

            const nextWave = Math.max(1, Math.floor((START_TIME - nextTime) / WAVE_SECONDS) + 1);
            if (nextWave !== waveRef.current) {
                waveRef.current = nextWave;
                setWave(nextWave);
                setStatusMessage("Wave " + String(nextWave) + " started!");
            }

            if (nextTime <= 0) {
                window.clearInterval(timer);
                void endGame(true);
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [endGame, gameState]);

    useEffect(() => {
        if (gameState !== "playing") return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Removing imageSmoothingEnabled = false to prevent text waving/rippling during movement
        // ctx.imageSmoothingEnabled = false;

        const drawEnemy = (enemy: EnemyEntity) => {
            const assetKey = ENEMY_CONFIG[enemy.kind].asset;
            const image = assetsRef.current[assetKey];
            const spriteAnimation =
                assetKey === "enemyZombie" || assetKey === "enemyBat" || assetKey === "enemyTank" || assetKey === "boss"
                    ? enemySpriteAnimationsRef.current[assetKey]
                    : null;
            const drawX = Math.round(enemy.x - enemy.size / 2);
            const drawY = Math.round(enemy.y - enemy.size / 2);

            if (spriteAnimation && spriteAnimation.totalDurationMs > 0) {
                const elapsedMs = Math.max(
                    0,
                    Math.floor(runtimeRef.current.elapsed * 1000 * ENEMY_SPRITE_PLAYBACK_RATE),
                );
                const loopMs = elapsedMs % spriteAnimation.totalDurationMs;
                let acc = 0;
                let frameIndex = 0;
                for (let i = 0; i < spriteAnimation.durationsMs.length; i++) {
                    acc += spriteAnimation.durationsMs[i];
                    if (loopMs < acc) {
                        frameIndex = i;
                        break;
                    }
                }
                const safeFrameIndex = Math.min(frameIndex, Math.max(0, spriteAnimation.frameCount - 1));
                const sx = (safeFrameIndex % spriteAnimation.cols) * spriteAnimation.frameWidth;
                const sy = Math.floor(safeFrameIndex / spriteAnimation.cols) * spriteAnimation.frameHeight;

                ctx.drawImage(
                    spriteAnimation.image,
                    sx,
                    sy,
                    spriteAnimation.frameWidth,
                    spriteAnimation.frameHeight,
                    drawX,
                    drawY,
                    enemy.size,
                    enemy.size,
                );
            } else if (image) {
                ctx.drawImage(image, drawX, drawY, enemy.size, enemy.size);
            } else {
                ctx.fillStyle = enemy.kind === "bat" ? "#a29bfe" : enemy.kind === "tank" ? "#636e72" : "#00b894";
                drawRoundedRect(ctx, drawX, drawY, enemy.size, enemy.size, 10);
                ctx.fill();
            }

            const cardWidth = Math.max(90, enemy.pair.promptEn.length * 12 + 24);
            const cardX = Math.round(enemy.x - cardWidth / 2);
            const cardY = Math.round(drawY - 32);

            ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
            drawRoundedRect(ctx, cardX, cardY, cardWidth, 24, 6);
            ctx.fill();
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#101820";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = CANVAS_FONT_WORD;
            ctx.fillText(enemy.pair.promptEn, Math.round(enemy.x), cardY + 12);

            if (enemy.maxHp > 1) {
                const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
                const barW = enemy.size;
                const barX = Math.round(enemy.x - barW / 2);
                const barY = Math.round(drawY - 12);

                ctx.fillStyle = "rgba(0,0,0,0.45)";
                drawRoundedRect(ctx, barX, barY, barW, 8, 4);
                ctx.fill();

                ctx.fillStyle = enemy.kind === "boss" ? "#ff7675" : "#55efc4";
                drawRoundedRect(ctx, barX, barY, barW * hpRatio, 8, 4);
                ctx.fill();
            }
        };

        const drawEffect = (effect: VisualEffect) => {
            const effectKey: AssetKey =
                effect.kind === "hit" ? "effectHit" : effect.kind === "kill" ? "effectKill" : "effectCorrect";
            const image = assetsRef.current[effectKey];
            const alpha = Math.max(0, effect.life / effect.maxLife);

            ctx.save();
            ctx.globalAlpha = alpha;

            const effectX = Math.round(effect.x - effect.size / 2);
            const effectY = Math.round(effect.y - effect.size / 2);
            const centerX = Math.round(effect.x);
            const centerY = Math.round(effect.y);

            if (image) {
                ctx.drawImage(image, effectX, effectY, effect.size, effect.size);
            } else {
                ctx.fillStyle = effect.kind === "correct" ? "#55efc4" : effect.kind === "kill" ? "#ff7675" : "#ffeaa7";
                ctx.beginPath();
                ctx.arc(centerX, centerY, effect.size / 4, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        };

        const drawScene = (deltaSec: number) => {
            const runtime = runtimeRef.current;
            runtime.elapsed += deltaSec;
            runtime.spawnTimer += deltaSec;

            if (shieldActiveRef.current && runtime.elapsed >= shieldUntilRef.current) {
                shieldActiveRef.current = false;
                setShieldActive(false);
                setStatusMessage("보호막 효과가 종료되었습니다. 적의 접근에 주의하세요.");
            }

            const spawnCadence = Math.max(2.2, 4.6 - runtime.elapsed * 0.006);
            if (runtime.spawnTimer >= spawnCadence) {
                runtime.spawnTimer = 0;
                if (runtime.enemies.length < MAX_REGULAR_ENEMIES_ON_FIELD) {
                    spawnEnemy();
                }
            }

            if (!runtime.bossSpawned && timeLeftRef.current <= 25) {
                runtime.bossSpawned = true;
                spawnEnemy("boss");
                setStatusMessage("경고! 보스가 등장했습니다. 처치하면 큰 점수를 획득할 수 있습니다!");
            }

            for (let i = runtime.enemies.length - 1; i >= 0; i--) {
                const enemy = runtime.enemies[i];
                enemy.x -= enemy.speed * deltaSec;

                if (enemy.kind === "bat") {
                    enemy.y += Math.sin(runtime.elapsed * 8 + enemy.id) * 0.6;
                }

                if (enemy.x <= CASTLE_HIT_X) {
                    runtime.enemies.splice(i, 1);

                    if (shieldActiveRef.current) {
                        addEffect("kill", CASTLE_HIT_X + 16, PATH_Y - 28, 122, 0.3);
                        continue;
                    }

                    addEffect("hit", 120, PATH_Y - 120, 144, 0.4);
                    playSfx("castleHit");
                    const nextLives = Math.max(0, livesRef.current - 1);
                    livesRef.current = nextLives;
                    setLives(nextLives);

                    comboRef.current = 0;
                    setCombo(0);
                    setLastInputCorrect(false);
                    setStatusMessage("적이 성벽을 공격했습니다! 남은 목숨이 감소했습니다. 빠르게 정리하세요.");

                    if (nextLives <= 0) {
                        void endGame(false);
                        return;
                    }
                }
            }

            for (let i = runtime.effects.length - 1; i >= 0; i--) {
                runtime.effects[i].life -= deltaSec;
                if (runtime.effects[i].life <= 0) {
                    runtime.effects.splice(i, 1);
                }
            }

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const sky = assetsRef.current.bgMain || assetsRef.current.bgSky;
            if (sky) {
                ctx.drawImage(sky, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else {
                const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
                gradient.addColorStop(0, "#0d0f2b");
                gradient.addColorStop(1, "#1f2a44");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            ctx.fillStyle = "rgba(9, 14, 25, 0.45)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const castleKey: AssetKey = livesRef.current <= 1 ? "castle3" : livesRef.current <= 3 ? "castle2" : "castle1";
            const castleImage = assetsRef.current[castleKey];
            if (castleImage) {
                ctx.drawImage(castleImage, 12, PATH_Y - 288, 290, 290);
            } else {
                ctx.fillStyle = "#16213e";
                drawRoundedRect(ctx, 12, PATH_Y - 220, 190, 220, 10);
                ctx.fill();
            }

            if (shieldActiveRef.current) {
                const barrier = assetsRef.current.castleBarrier;
                const pulse = 0.7 + Math.sin(runtime.elapsed * 10) * 0.2;
                ctx.save();
                ctx.globalAlpha = pulse;
                if (barrier) {
                    ctx.drawImage(barrier, 24, PATH_Y - 292, 290, 290);
                } else {
                    ctx.strokeStyle = "#74b9ff";
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(150, PATH_Y - 110, 120, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }

            for (const enemy of runtime.enemies) {
                drawEnemy(enemy);
            }

            for (const effect of runtime.effects) {
                drawEffect(effect);
            }

            ctx.fillStyle = "rgba(0,0,0,0.55)";
            drawRoundedRect(ctx, 20, 16, 330, 34, 8);
            ctx.fill();

            ctx.fillStyle = "#f5f6fa";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.font = CANVAS_FONT_HUD;
            ctx.fillText("Enter: Submit | Shift/F: Activate Shield", 32, 33);

            if (!assetsReady) {
                ctx.fillStyle = "rgba(0,0,0,0.7)";
                drawRoundedRect(ctx, CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT / 2 - 24, 260, 48, 8);
                ctx.fill();
                ctx.fillStyle = "#ffeaa7";
                ctx.textAlign = "center";
                ctx.font = CANVAS_FONT_LOADING;
                ctx.fillText("리소스를 불러오는 중입니다...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            }
        };

        const animate = (timestamp: number) => {
            const runtime = runtimeRef.current;
            if (!runtime.lastTimestamp) {
                runtime.lastTimestamp = timestamp;
            }

            const deltaSec = Math.min(0.05, (timestamp - runtime.lastTimestamp) / 1000);
            runtime.lastTimestamp = timestamp;

            drawScene(deltaSec);

            if (gameState === "playing") {
                animationRef.current = window.requestAnimationFrame(animate);
            }
        };

        (window as Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => void }).render_game_to_text =
            () => {
                const runtime = runtimeRef.current;
                return JSON.stringify({
                    coordinateSystem: "origin top-left, +x right, +y down",
                    mode: gameState,
                    score: scoreRef.current,
                    lives: livesRef.current,
                    timeLeft: timeLeftRef.current,
                    combo: comboRef.current,
                    shield: {
                        active: shieldActiveRef.current,
                        charge: shieldChargeRef.current,
                        max: SHIELD_MAX_CHARGE,
                    },
                    wave: waveRef.current,
                    enemies: runtime.enemies.map((enemy) => ({
                        id: enemy.id,
                        kind: enemy.kind,
                        x: Math.round(enemy.x),
                        y: Math.round(enemy.y),
                        hp: enemy.hp,
                        word: enemy.pair.promptEn,
                        answer: enemy.pair.answerKo,
                    })),
                });
            };

        (window as Window & { advanceTime?: (ms: number) => void }).advanceTime = (ms: number) => {
            const steps = Math.max(1, Math.round(ms / (1000 / 60)));
            for (let i = 0; i < steps; i++) {
                drawScene(1 / 60);
            }
        };

        animationRef.current = window.requestAnimationFrame(animate);

        return () => {
            if (animationRef.current !== null) {
                window.cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }

            const win = window as Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => void };
            delete win.render_game_to_text;
            delete win.advanceTime;
        };
    }, [addEffect, assetsReady, endGame, gameState, playSfx, spawnEnemy]);

    const progressPercent = useMemo(() => {
        return Math.min(100, Math.round(((START_TIME - timeLeft) / START_TIME) * 100));
    }, [timeLeft]);

    if (gameState === "menu") {
        if (isTournamentInitializing) {
            return (
                <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border-[6px] border-[#2d3436] bg-[#000] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    <Loader2 className="h-16 w-16 animate-spin text-[#fff]" />
                    <p className="mt-8 font-pixel text-xl text-[#dfe6e9] animate-pulse">차원 동기화 중...</p>
                </div>
            );
        }

        if (tournamentInitError) {
            return (
                <div className="relative flex min-h-[500px] flex-col items-center justify-center rounded-3xl border-[6px] border-[#632a2a] bg-[#1a0f0f] p-8 shadow-[10px_10px_0_0_#000000] overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/bg-noise.png')] opacity-20 mix-blend-overlay" />
                    <h2 className="relative font-pixel text-3xl text-[#ff4757] drop-shadow-[2px_2px_0_#000] mb-4">TOURNAMENT ERROR</h2>
                    <p className="relative font-bold text-[#fbc531] text-center max-w-md mb-8">{tournamentInitError}</p>
                    <Button className="relative h-14 px-8 border-[4px] border-black bg-[#ff4757] font-pixel text-lg text-white shadow-[4px_4px_0_0_#000] hover:bg-[#c23616] hover:translate-y-1 hover:shadow-[0_0_0_0_#000] transition-all" onClick={() => router.back()}>
                        돌아가기
                    </Button>
                </div>
            );
        }

        return (
            <div className="relative flex min-h-[600px] flex-col justify-center overflow-hidden rounded-[40px] border-[8px] border-[#130f24] bg-[#05030b] p-8 shadow-[0_0_40px_rgba(10,5,20,0.95)]" style={{ fontFamily: "'NeoDungGeunMo', 'Galmuri11', 'Press Start 2P', system-ui, sans-serif" }}>
                {/* Background Artwork */}
                <Image
                    src="/bg-sky.png"
                    alt="Mysterious Sky Background"
                    fill
                    className="pointer-events-none object-cover opacity-[0.85] mix-blend-luminosity brightness-50 transition-transform duration-[20000ms] ease-linear hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 1200px"
                    priority
                />

                {/* Overlays */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,3,11,0.9)_100%)] z-0" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(40,10,70,0.3)_0%,rgba(5,3,11,0.95)_100%)] z-0" />

                {/* Mysterious Fog / Light Effects */}
                <div className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-[#8c7ae6] opacity-20 blur-[120px] animate-pulse z-0" style={{ animationDuration: '4s' }} />
                <div className="pointer-events-none absolute -left-32 bottom-1/4 h-96 w-96 rounded-full bg-[#ff4757] opacity-10 blur-[120px] animate-pulse z-0" style={{ animationDelay: '2s', animationDuration: '6s' }} />

                <div className="relative z-10 flex flex-col items-center space-y-10 w-full max-w-2xl mx-auto">
                    {/* Header Area */}
                    <div className="animate-in slide-in-from-top-10 fade-in duration-1000 flex flex-col items-center">
                        <div className="relative mb-6 flex flex-col items-center">
                            <h1 className="relative flex items-center justify-center gap-4 font-pixel text-6xl md:text-7xl tracking-widest text-[#ff4757] drop-shadow-[0_0_15px_rgba(255,71,87,0.8)] [text-shadow:4px_4px_0_#000]">
                                <Skull className="h-10 w-10 md:h-12 md:w-12 animate-pulse text-[#ff4757] drop-shadow-[2px_2px_0_#000]" />
                                WORD DEFENSE
                                <Skull className="h-10 w-10 md:h-12 md:w-12 animate-pulse text-[#ff4757] drop-shadow-[2px_2px_0_#000]" style={{ animationDelay: "0.5s" }} />
                            </h1>
                        </div>

                        <div className="bg-black/40 border-[3px] border-[#2f3542] rounded-xl px-10 py-4 backdrop-blur-md mb-2 shadow-[6px_6px_0_0_#000]">
                            <h2 className="font-pixel text-[20px] text-[#2ed573] tracking-widest text-center">
                                타자 / 집중 / 반응 속도로 성을 지켜라
                            </h2>
                        </div>
                        <p className="text-center font-bold text-[#c8d6e5] max-w-lg mt-6 leading-relaxed tracking-wide text-base bg-black/60 p-4 rounded-xl border border-[#2f3542]">
                            영어 공부는 열심히 했나요? 단어를 빠르게 입력해서 몰려오는 몬스터로부터 성을 방어하세요. 콤보를 모아 점수를 증가시키고 적재적소에 보호막을 켜 위기를 넘기세요.
                        </p>
                    </div>

                    {/* Question Sets / Modes Area */}
                    <div className="w-full flex flex-col gap-5 max-w-xl">
                        {runtimeData.questions.length > 0 && runtimeData.setId ? (
                            <div className="grid grid-cols-1 gap-4">
                                <div
                                    className="group relative flex flex-col md:flex-row items-center justify-between w-full overflow-hidden rounded-2xl border-[3px] border-[#2f3542] bg-[#11151a]/80 p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#6366f1] hover:bg-[#1a1b26]/90 hover:shadow-[0_10px_30px_rgba(99,102,241,0.3)] animate-in slide-in-from-bottom-8 fade-in backdrop-blur-md"
                                >
                                    <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left mb-5 md:mb-0">
                                        <h3 className="font-pixel text-2xl text-[#f1f2f6] group-hover:text-[#ffff00] transition-colors mb-2 flex items-center gap-3">
                                            <Ghost className="h-7 w-7 text-[#10ac84] opacity-80 group-hover:animate-bounce group-hover:text-[#ffff00]" />
                                            {runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set"}
                                        </h3>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2ed573] animate-pulse shadow-[0_0_8px_#2ed573]" />
                                            <span className="text-sm font-bold text-[#a4b0be] uppercase tracking-wider">
                                                AUTO APPLIED
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="shrink-0 flex items-center justify-center relative z-10 h-14 w-full md:w-auto px-8 rounded-lg border-[3px] border-black bg-[#ff2e63] font-pixel text-[18px] text-white tracking-widest shadow-[4px_4px_0_0_#000] transition-transform hover:scale-105 active:scale-95 active:translate-y-1 active:shadow-[2px_2px_0_0_#000]"
                                        onClick={() => {
                                            void startGame({
                                                setId: runtimeData.setId!,
                                                title: runtimeData.sourceScope === "CLASS" ? "Class Active Set" : "Global Active Set",
                                                questionMode: runtimeData.questionMode,
                                                questions: runtimeData.questions,
                                            });
                                        }}
                                    >
                                        START
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-[#ff4757]/50 bg-black/50 p-12 text-center backdrop-blur-md animate-in zoom-in duration-500">
                                <Ghost className="h-14 w-14 text-[#ff4757] mb-5 opacity-60 animate-bounce" />
                                <h3 className="font-pixel text-2xl text-[#f1f2f6] mb-3 drop-shadow-[2px_2px_0_#000]">활성화된 문제 세트가 없습니다</h3>
                                <p className="font-bold text-[#b2bec3] max-w-sm">
                                    선생님이 디펜스 전용 문제 세트를 활성화해야 게임을 시작할 수 있습니다.
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
                <Loader2 className="h-10 w-10 animate-spin text-[#fdcb6e]" />
                <p className="mt-4 font-pixel text-lg">문제와 스테이지를 불러오는 중입니다...</p>
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

    return (
        <div className="space-y-4 rounded-2xl border-4 border-black bg-[#0a0d1f] p-4 text-white shadow-[8px_8px_0_0_black] md:p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <Timer className="h-4 w-4" /> TIME
                    </div>
                    <p className="font-pixel text-2xl text-[#ffeaa7]">{timeLeft}s</p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <Heart className="h-4 w-4" /> LIVES
                    </div>
                    <p className="font-pixel text-2xl text-[#ff7675]">{lives}</p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <Trophy className="h-4 w-4" /> SCORE
                    </div>
                    <p className="font-pixel text-2xl text-[#55efc4]">{score}</p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <Flame className="h-4 w-4" /> COMBO
                    </div>
                    <p className="font-pixel text-2xl text-[#fdcb6e]">x{combo}</p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                        <Shield className="h-4 w-4" /> SHIELD
                    </div>
                    <p className="font-pixel text-2xl text-[#74b9ff]">
                        {shieldCharge}/{SHIELD_MAX_CHARGE}
                    </p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#1f2a44] p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">WAVE</div>
                    <p className="font-pixel text-2xl text-[#a29bfe]">{wave}</p>
                </div>
            </div>

            <div className="rounded-2xl border-4 border-black bg-black/35 p-2">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="h-auto w-full rounded-lg border-2 border-black bg-[#101820]"
                />
            </div>

            <div className="rounded-2xl border-4 border-black bg-[#fef7d1] p-4 text-black shadow-[6px_6px_0_0_black]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-gray-700">
                    <span className="font-pixel text-xs">Kills {killCount} / Correct {correctCount}</span>
                    <span className="font-pixel text-xs">Best Combo x{bestCombo}</span>
                    <span className="font-pixel text-xs">Progress {progressPercent}%</span>
                </div>

                <div className="mb-3 h-4 overflow-hidden rounded-full border-2 border-black bg-[#2d3436]">
                    <div
                        className="h-full bg-[linear-gradient(90deg,#00cec9,#55efc4)] transition-all duration-300"
                        style={{ width: String(progressPercent) + "%" }}
                    />
                </div>

                <form
                    className="flex flex-col gap-3 md:flex-row"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submitAnswer();
                    }}
                >
                    <input
                        value={typedInput}
                        onChange={(event) => {
                            typedInputRef.current = event.target.value;
                            setTypedInput(event.target.value);
                        }}
                        placeholder="Type meaning and press Enter"
                        className="h-12 flex-1 rounded-lg border-2 border-black bg-white px-4 font-pixel text-sm font-bold outline-none focus:border-[#00b894]"
                        autoComplete="off"
                    />
                    <Button type="submit" className="h-12 border-2 border-black bg-[#00b894] font-pixel text-black hover:bg-[#55efc4]">
                        Submit
                    </Button>
                    <Button
                        type="button"
                        onClick={triggerShield}
                        className="h-12 border-2 border-black bg-[#74b9ff] font-pixel text-black hover:bg-[#81ecec]"
                    >
                        Shield (Shift/F)
                    </Button>
                </form>

                <div
                    className={"mt-3 rounded-lg border-2 border-black px-3 py-2 text-sm font-bold " + (lastInputCorrect === null
                        ? "bg-white text-gray-700"
                        : lastInputCorrect
                            ? "bg-[#dff9fb] text-[#006266]"
                            : "bg-[#ffe6e6] text-[#b33939]")}
                >
                    {statusMessage}
                </div>
            </div>
        </div>
    );
}

export const WordRunnerGame = WordDefenseGame;
