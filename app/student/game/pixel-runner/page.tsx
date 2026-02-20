"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameResultModal } from "@/components/game/game-result-modal";

export default function PixelRunnerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const containerRef = useRef<HTMLDivElement>(null);
    const startRef = useRef<(() => void) | null>(null);
    const retryRef = useRef<(() => void) | null>(null);

    const [result, setResult] = React.useState<{
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
        dailyLimit: 200
    });

    const openResultModal = (data: Omit<typeof result, 'isOpen'>) => {
        setResult({ ...data, isOpen: true });
    };

    useEffect(() => {
        if (!containerRef.current) return;

        // --- User's Original JavaScript Logic (Inserted exactly) ---
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;

        // ===================================================
        // 🎵 BGM 및 사운드 시스템 (Web Audio API)
        // ===================================================
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();

        const NOTE_FREQS: Record<string, number> = {
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
            A4: 440.0, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
            A5: 880.0
        };

        const FOREST_TRACK = {
            tempo: 160,
            notes: [
                [NOTE_FREQS.C4, 0.5], [NOTE_FREQS.E4, 0.5], [NOTE_FREQS.G4, 0.5], [NOTE_FREQS.E4, 0.5],
                [NOTE_FREQS.C4, 0.5], [NOTE_FREQS.E4, 0.5], [NOTE_FREQS.G4, 0.5], [NOTE_FREQS.C5, 0.5],
                [NOTE_FREQS.F4, 0.5], [NOTE_FREQS.A4, 0.5], [NOTE_FREQS.C5, 0.5], [NOTE_FREQS.A4, 0.5],
                [NOTE_FREQS.G4, 0.5], [NOTE_FREQS.E4, 0.5], [NOTE_FREQS.D4, 0.5], [NOTE_FREQS.E4, 0.5],
                [NOTE_FREQS.C4, 1], [NOTE_FREQS.G4, 1],
                [NOTE_FREQS.E4, 0.5], [NOTE_FREQS.F4, 0.5], [NOTE_FREQS.E4, 0.5], [NOTE_FREQS.D4, 0.5],
                [NOTE_FREQS.C4, 1]
            ]
        };

        const BOSS_TRACK = {
            tempo: 240,
            notes: [
                [NOTE_FREQS.A4, 0.5], [NOTE_FREQS.A4, 0.5], [NOTE_FREQS.C5, 0.5], [NOTE_FREQS.A4, 0.5],
                [NOTE_FREQS.D5, 0.5], [NOTE_FREQS.A4, 0.5], [NOTE_FREQS.E5, 0.5], [NOTE_FREQS.D5, 0.5],
                [NOTE_FREQS.C5, 0.5], [NOTE_FREQS.C5, 0.5], [NOTE_FREQS.E5, 0.5], [NOTE_FREQS.C5, 0.5],
                [NOTE_FREQS.G5, 0.5], [NOTE_FREQS.E5, 0.5], [NOTE_FREQS.A5, 1],
                [NOTE_FREQS.G4, 0.5], [NOTE_FREQS.G4, 0.5], [NOTE_FREQS.B4, 0.5], [NOTE_FREQS.G4, 0.5],
                [NOTE_FREQS.A4, 2]
            ]
        };

        let isForestBGMPlaying = false;
        let forestTimerID: any;
        let forestNextNoteTime = 0;
        let forestCurrentNoteIndex = 0;

        let isBossBGMPlaying = false;
        let bossTimerID: any;
        let bossNextNoteTime = 0;
        let bossCurrentNoteIndex = 0;

        function playOscillator(freq: number, time: number, duration: number) {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, time);
            gainNode.gain.setValueAtTime(0.03, time);
            gainNode.gain.exponentialRampToValueAtTime(0.004, time + duration * 0.9);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start(time);
            osc.stop(time + duration);
        }

        function forestScheduler() {
            if (!isForestBGMPlaying) return;
            while (forestNextNoteTime < audioCtx.currentTime + 0.1) {
                const note = FOREST_TRACK.notes[forestCurrentNoteIndex];
                const duration = (note[1] as number) * (60.0 / FOREST_TRACK.tempo);
                playOscillator(note[0] as number, forestNextNoteTime, duration);
                forestNextNoteTime += duration;
                forestCurrentNoteIndex++;
                if (forestCurrentNoteIndex >= FOREST_TRACK.notes.length) forestCurrentNoteIndex = 0;
            }
            forestTimerID = setTimeout(forestScheduler, 25);
        }

        function bossScheduler() {
            if (!isBossBGMPlaying) return;
            while (bossNextNoteTime < audioCtx.currentTime + 0.1) {
                const note = BOSS_TRACK.notes[bossCurrentNoteIndex];
                const duration = (note[1] as number) * (60.0 / BOSS_TRACK.tempo);
                playOscillator(note[0] as number, bossNextNoteTime, duration);
                bossNextNoteTime += duration;
                bossCurrentNoteIndex++;
                if (bossCurrentNoteIndex >= BOSS_TRACK.notes.length) bossCurrentNoteIndex = 0;
            }
            bossTimerID = setTimeout(bossScheduler, 25);
        }

        function playForestRunnerBGM() {
            stopBossBattleBGM();
            if (isForestBGMPlaying) return;
            forestCurrentNoteIndex = 0;
            forestNextNoteTime = audioCtx.currentTime + 0.1;
            isForestBGMPlaying = true;
            forestScheduler();
        }

        function stopForestRunnerBGM() {
            isForestBGMPlaying = false;
            if (forestTimerID) clearTimeout(forestTimerID);
        }

        function playBossBattleBGM() {
            stopForestRunnerBGM();
            if (isBossBGMPlaying) return;
            bossCurrentNoteIndex = 0;
            bossNextNoteTime = audioCtx.currentTime + 0.1;
            isBossBGMPlaying = true;
            bossScheduler();
        }

        function stopBossBattleBGM() {
            isBossBGMPlaying = false;
            if (bossTimerID) clearTimeout(bossTimerID);
        }

        function playSound(type: string) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            const now = audioCtx.currentTime;

            try {
                if (type === 'jump') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                    gainNode.gain.setValueAtTime(0.05, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                } else if (type === 'stomp') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                } else if (type === 'hit') {
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.linearRampToValueAtTime(50, now + 0.3);
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                } else if (type === 'coin') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(987.77, now);
                    osc.frequency.setValueAtTime(1318.51, now + 0.08);
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                }
            } catch (e) { console.error(e); }
        }

        // --- Game Setup ---
        const GAME_WIDTH = 800;
        const GAME_HEIGHT = 450;
        const GROUND_Y = 415;
        const GRAVITY = 0.6;
        const MAX_QUIZ_COUNT = 10;

        let gameSpeed = 4; // Adjusted for difficulty (was 5)
        let score = 0;
        let lives = 5;
        let isGameOver = false;
        let isPlaying = false;
        let isPaused = false;
        let lastQuizTime = 0;
        let startTime = 0;
        let quizCount = 0;

        const charImg = new Image();
        charImg.src = "/images/pixel-runner/player.png"; // Local Asset
        let charImgLoaded = false;
        charImg.onload = () => { if (charImg.naturalWidth > 0) charImgLoaded = true; };
        charImg.onerror = () => { charImgLoaded = false; console.error("Character image failed to load"); };

        const bgImg = new Image();
        bgImg.src = "/images/pixel-runner/background.png"; // Local Asset
        let bgImgLoaded = false;
        bgImg.onload = () => { if (bgImg.naturalWidth > 0) { bgImgLoaded = true; background.draw(ctx); } };
        bgImg.onerror = () => { bgImgLoaded = false; console.error("Background image failed to load"); };

        const enemyImg = new Image();
        enemyImg.src = "/images/pixel-runner/enemy.png"; // Local Asset
        let enemyImgLoaded = false;
        enemyImg.onload = () => { if (enemyImg.naturalWidth > 0) enemyImgLoaded = true; };
        enemyImg.onerror = () => { enemyImgLoaded = false; };

        const airObsImg = new Image();
        airObsImg.src = "/images/pixel-runner/cloud.png"; // Local Asset
        let airObsImgLoaded = false;
        airObsImg.onload = () => { if (airObsImg.naturalWidth > 0) airObsImgLoaded = true; };
        airObsImg.onerror = () => { airObsImgLoaded = false; };

        const bossImg = new Image();
        bossImg.src = "/images/pixel-runner/boss.png"; // Local Asset
        let bossImgLoaded = false;
        bossImg.onload = () => { if (bossImg.naturalWidth > 0) bossImgLoaded = true; };
        bossImg.onerror = () => { bossImgLoaded = false; };

        console.log("Pixel Runner: Game assets v5 (Local) loaded");


        const QUIZ_DATA: { q: string, o: string[], a: number }[] = [];

        async function loadActiveQuestions() {
            try {
                const { getActiveQuestions } = await import('@/app/actions/game');
                const questions = await getActiveQuestions('pixel-runner');

                if (questions && questions.length > 0) {
                    // Filter out questions that don't have options (e.g. short-answer)
                    const validQuestions = (questions as any[]).filter((q: any) => Array.isArray(q.options) && q.options.length > 0);

                    if (validQuestions.length > 0) {
                        QUIZ_DATA.splice(0, QUIZ_DATA.length, ...validQuestions.map((q: any) => ({
                            q: q.question_text,
                            o: q.options as string[],
                            a: Number(q.correct_answer) // Ensure number
                        })));
                        console.log("Loaded dynamic questions for Pixel Runner:", validQuestions.length);
                        // showFeedback(`LOADED ${validQuestions.length} CUSTOM QUESTIONS!`, "#00cec9");
                    }
                }
            } catch (e) {
                console.warn("Failed to load questions from DB", e);
            }
        }
        loadActiveQuestions();

        const keys = { ArrowDown: false, Space: false };

        class Particle {
            x: number; y: number; size: number; color: string; speedX: number; speedY: number;
            constructor(x: number, y: number, size: number, color: string) {
                this.x = x; this.y = y; this.size = size; this.color = color;
                this.speedX = Math.random() * 3 - 1.5;
                this.speedY = Math.random() * 3 - 1.5;
            }
            update() {
                this.x += this.speedX; this.y += this.speedY; this.size -= 0.15;
            }
            draw(ctx: CanvasRenderingContext2D) {
                if (this.size <= 0) return;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        let particles: Particle[] = [];
        function createParticles(x: number, y: number, count: number, color: string) {
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, Math.random() * 5 + 3, color));
            }
        }

        class Sprite {
            image: HTMLImageElement;
            constructor(image: HTMLImageElement) { this.image = image; }
            draw(ctx: CanvasRenderingContext2D, srcX: number, srcY: number, srcW: number, srcH: number, destX: number, destY: number, destW: number, destH: number) {
                if (this.image.complete && this.image.naturalWidth > 0) {
                    ctx.drawImage(this.image, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
                }
            }
        }

        class Player {
            x: number; y: number; vy: number; scale: number; state: string; isGrounded: boolean; jumpCount: number;
            invincible: boolean; invincibleTimer: number; frameX: number; fps: number; frameInterval: number; frameTimer: number;
            animConfig: any;
            constructor() {
                this.x = 100; this.y = GROUND_Y; this.vy = 0; this.scale = 1.0;
                this.state = 'run'; this.isGrounded = true; this.jumpCount = 0;
                this.invincible = false; this.invincibleTimer = 0;
                this.frameX = 0; this.fps = 10; this.frameInterval = 1000 / this.fps; this.frameTimer = 0;

                this.animConfig = {
                    run: { sy: 0, w: 76, h: 76, oy: -77, maxFrame: 6, paddingX: 0, paddingY: 0 },
                    jump: { sy: 78, w: 84, h: 120, oy: -120, maxFrame: 4, paddingX: 4, paddingY: 0 },
                    slide: { sy: 197, w: 129, h: 120, oy: -45, maxFrame: 4, paddingX: 0, paddingY: 0 },
                    hit: { sy: 265, w: 90, h: 80, oy: -80, maxFrame: 1, paddingX: 0, paddingY: 0 },
                    dead: { sy: 265, w: 90, h: 80, oy: -80, maxFrame: 3, paddingX: 0, paddingY: 0 }
                };
            }

            update(deltaTime: number) {
                if (isPaused) return;
                const speedFactor = deltaTime / 16.67;
                this.vy += GRAVITY * speedFactor;
                this.y += this.vy * speedFactor;

                if (this.y >= GROUND_Y) {
                    this.y = GROUND_Y; this.vy = 0; this.isGrounded = true; this.jumpCount = 0;
                    if (!this.invincible && this.state === 'jump') {
                        this.state = 'run';
                    }
                } else {
                    this.isGrounded = false;
                }

                if (this.state === 'dead') {
                } else if (this.invincible && this.state === 'hit') {
                } else if (this.state === 'slide') {
                    if (!keys.ArrowDown && this.frameX >= this.animConfig.slide.maxFrame - 1) {
                        this.state = 'run';
                    }
                } else if (!this.isGrounded) {
                    this.state = 'jump';
                } else {
                    if (keys.ArrowDown) this.state = 'slide';
                    else this.state = 'run';
                }

                if (this.invincible) {
                    this.invincibleTimer -= deltaTime;
                    if (this.invincibleTimer <= 0) {
                        this.invincible = false;
                        if (this.state === 'hit') this.state = this.isGrounded ? 'run' : 'jump';
                    }
                }
                this.animate(deltaTime);
            }

            animate(deltaTime: number) {
                if (isPaused) return;
                const config = this.animConfig[this.state];
                let currentInterval = this.frameInterval;
                if (this.state === 'dead') currentInterval = 500;

                if (this.frameTimer > currentInterval) {
                    this.frameX++;
                    if (this.state === 'dead') {
                        if (this.frameX >= config.maxFrame) this.frameX = config.maxFrame - 1;
                    } else {
                        if (this.frameX >= config.maxFrame) this.frameX = 0;
                    }
                    this.frameTimer = 0;
                } else {
                    this.frameTimer += deltaTime;
                }
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0 && this.state !== 'dead') return;
                let currentState = this.state;
                let currentFrame = this.frameX;
                const config = this.animConfig[currentState];
                if (!config) return;

                const sprite = new Sprite(charImg);
                const padX = config.paddingX || 0;
                const padY = config.paddingY || 0;
                const srcX = (currentFrame * config.w) + (padX / 2);
                const srcY = config.sy + (padY / 2);
                const srcW = config.w - padX;
                const srcH = config.h - padY;
                const destX = this.x;
                const destY = this.y + config.oy;
                const destW = config.w * this.scale;
                const destH = config.h * this.scale;

                if (charImgLoaded) {
                    sprite.draw(ctx, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
                } else {
                    // Fallback: Red Rectangle
                    ctx.fillStyle = "red";
                    ctx.fillRect(destX, destY, destW, destH);
                }
            }

            jump() {
                if (this.state === 'dead' || isPaused) return;
                if (this.jumpCount < 2) {
                    playSound('jump');
                    this.vy = -12;
                    if (!this.invincible) {
                        this.state = 'jump';
                        this.frameX = 0;
                    }
                    this.jumpCount++;
                    this.isGrounded = false;
                    createParticles(this.x + 30, this.y, 5, '#fff');
                }
            }

            slide() {
                if (this.state === 'dead' || isPaused) return;
                if (!this.invincible) {
                    this.state = 'slide';
                    if (this.isGrounded) this.frameX = 0;
                }
                if (!this.isGrounded) this.vy += 5;
            }

            hit() {
                if (this.invincible || this.state === 'dead') return;
                playSound('hit');
                lives--;
                updateLives();
                if (lives <= 0) {
                    this.die();
                } else {
                    this.invincible = true;
                    this.invincibleTimer = 1500;
                    this.state = 'hit';
                    this.frameX = 0;
                    this.vy = -5;
                    createParticles(this.x + 40, this.y - 40, 10, '#ff0000');
                }
            }

            die() {
                this.state = 'dead';
                this.frameX = 0;
                isGameOver = true;
                stopForestRunnerBGM();
                stopBossBattleBGM();
                createParticles(this.x + 40, this.y - 40, 20, '#ff0000');
                setTimeout(() => {
                    showEndScreen("GAME OVER", "#ff4444");
                }, 2500);
            }

            getHitbox() {
                let w = 30; let h = 50; let xOffset = 20; let yOffset = -h;
                if (this.state === 'slide') {
                    w = 50; h = 25; xOffset = 30; yOffset = -h + 10;
                }
                else if (this.state === 'jump') { w = 30; h = 40; yOffset = -h - 10; }
                return { x: this.x + xOffset, y: this.y + yOffset, w: w, h: h };
            }
        }

        class Obstacle {
            type: string; x: number; y: number; w: number; h: number; markedForDeletion: boolean; color: string; rotation: number;
            constructor(type: string) {
                this.type = type;
                this.w = 50; this.h = 50; this.x = GAME_WIDTH;
                this.markedForDeletion = false;
                this.color = '#8B4513';
                this.rotation = 0;

                if (this.type === 'ground') {
                    this.y = GROUND_Y - 60;
                    this.w = 60; this.h = 60;
                } else {
                    const patterns = [75, 85, 95];
                    this.y = GROUND_Y - patterns[Math.floor(Math.random() * patterns.length)];
                    this.w = 50; this.h = 50;
                }
            }

            update() {
                if (isPaused) return;
                this.x -= gameSpeed;
                if (this.type === 'air') this.rotation += 0.2;
                if (this.x < -this.w) this.markedForDeletion = true;
            }

            draw(ctx: CanvasRenderingContext2D) {
                if (this.type === 'ground') {
                    if (enemyImgLoaded) ctx.drawImage(enemyImg, this.x, this.y, this.w, this.h);
                    else { ctx.fillStyle = "purple"; ctx.fillRect(this.x, this.y, this.w, this.h); }
                } else {
                    if (airObsImgLoaded) {
                        ctx.save();
                        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
                        ctx.rotate(this.rotation);
                        ctx.drawImage(airObsImg, -this.w / 2, -this.h / 2, this.w, this.h);
                        ctx.restore();
                    } else {
                        ctx.save();
                        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
                        ctx.rotate(this.rotation);
                        ctx.fillStyle = '#607D8B';
                        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
                        ctx.restore();
                    }
                }
            }

            getHitbox() {
                return { x: this.x + 10, y: this.y + 10, w: this.w - 20, h: this.h - 20 };
            }
        }

        class Coin {
            size: number; x: number; y: number; markedForDeletion: boolean; angle: number;
            constructor() {
                this.size = 24;
                this.x = GAME_WIDTH;
                this.y = Math.random() > 0.5 ? GROUND_Y - 50 : GROUND_Y - 150;
                this.markedForDeletion = false;
                this.angle = 0;
            }

            update() {
                if (isPaused) return;
                this.x -= gameSpeed;
                this.angle -= 0.1;
                if (this.x < -this.size) this.markedForDeletion = true;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.save();
                ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
                ctx.rotate(this.angle);
                const r = this.size / 2;
                ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fillStyle = "#FF0000"; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fillStyle = "#FFFFFF"; ctx.fill();
                ctx.beginPath(); ctx.rect(-r, -2, r * 2, 4); ctx.fillStyle = "#000000"; ctx.fill();
                ctx.beginPath(); ctx.arc(0, 0, r / 3, 0, Math.PI * 2); ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#000000"; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = "#000000"; ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }

            getHitbox() {
                return { x: this.x, y: this.y, w: this.size, h: this.size };
            }
        }

        class Background {
            x: number; width: number; height: number;
            constructor() { this.x = 0; this.width = 0; this.height = GAME_HEIGHT; }
            draw(ctx: CanvasRenderingContext2D) {
                if (!bgImgLoaded) return;
                const scale = GAME_HEIGHT / bgImg.height;
                const scaledWidth = bgImg.width * scale;
                if (!isPaused) this.x -= gameSpeed * 0.5;
                if (this.x <= -scaledWidth) this.x = 0;
                try {
                    ctx.drawImage(bgImg, this.x, 0, scaledWidth, GAME_HEIGHT);
                    ctx.drawImage(bgImg, this.x + scaledWidth, 0, scaledWidth, GAME_HEIGHT);
                    if (scaledWidth * 2 < GAME_WIDTH) ctx.drawImage(bgImg, this.x + scaledWidth * 2, 0, scaledWidth, GAME_HEIGHT);
                } catch (e) {
                    console.error("Background draw failed", e);
                    bgImgLoaded = false; // Disable future draw attempts
                }
            }
        }

        const player = new Player();
        const background = new Background();
        let obstacles: Obstacle[] = [];
        let coins: Coin[] = [];
        let obstacleTimer = 0;
        let coinTimer = 0;
        let lastTime = 0;

        const btnJump = document.getElementById('btnJump')!;
        const btnSlide = document.getElementById('btnSlide')!;

        const handleJump = (e: any) => {
            e.preventDefault();
            if (!isPlaying && !isGameOver) return;
            player.jump();
            keys.Space = true;
            btnJump.classList.add('active');
        };
        const handleJumpEnd = (e: any) => {
            e.preventDefault();
            keys.Space = false;
            btnJump.classList.remove('active');
        };

        const handleSlide = (e: any) => {
            e.preventDefault();
            if (!isPlaying && !isGameOver) return;
            keys.ArrowDown = true;
            player.slide();
            btnSlide.classList.add('active');
        };
        const handleSlideEnd = (e: any) => {
            e.preventDefault();
            keys.ArrowDown = false;
            btnSlide.classList.remove('active');
        };

        btnJump.addEventListener('mousedown', handleJump);
        btnJump.addEventListener('mouseup', handleJumpEnd);
        btnJump.addEventListener('touchstart', handleJump);
        btnJump.addEventListener('touchend', handleJumpEnd);

        btnSlide.addEventListener('mousedown', handleSlide);
        btnSlide.addEventListener('mouseup', handleSlideEnd);
        btnSlide.addEventListener('touchstart', handleSlide);
        btnSlide.addEventListener('touchend', handleSlideEnd);

        const handleKeyDown = (e: any) => {
            if (isPaused) return;
            if (!isPlaying && !isGameOver && (e.code === 'Space' || e.code === 'ArrowDown')) return;
            if (e.code === 'Space') { e.preventDefault(); player.jump(); keys.Space = true; }
            if (e.code === 'ArrowDown') { e.preventDefault(); keys.ArrowDown = true; player.slide(); }
        };

        const handleKeyUp = (e: any) => {
            if (e.code === 'Space') keys.Space = false;
            if (e.code === 'ArrowDown') keys.ArrowDown = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        function checkCollision(rect1: any, rect2: any) {
            return (rect1.x < rect2.x + rect2.w && rect1.x + rect1.w > rect2.x && rect1.y < rect2.y + rect2.h && rect1.y + rect1.h > rect2.y);
        }

        function updateLives() {
            let hearts = "";
            for (let i = 0; i < lives; i++) hearts += "❤️";
            const livesDisplay = document.getElementById('livesDisplay');
            if (livesDisplay) livesDisplay.innerText = hearts;
        }

        function showFeedback(text: string, color: string) {
            const msg = document.getElementById('feedbackMsg')!;
            msg.innerText = text;
            msg.style.color = color;
            msg.style.display = 'block';
            (msg as any).offsetHeight;
            msg.style.animation = 'popUp 0.8s forwards';
            setTimeout(() => { msg.style.display = 'none'; }, 800);
        }

        function checkQuiz() {
            if (isGameOver || isPaused) return;
            if (quizCount >= MAX_QUIZ_COUNT) return;
            if (QUIZ_DATA.length === 0) {
                // console.warn("No quiz data loaded. Skipping quiz.");
                return;
            }
            const now = Date.now();

            // First quiz appears quickly (e.g., 3 seconds after start)
            if (quizCount === 0) {
                if (now - startTime > 3000) {
                    isPaused = true;
                    showQuizModal();
                }
            }
            // Subsequent quizzes appear every 15 seconds (reduced from 10s to give more running time, or keep 10s?)
            // User: "Run... then pause and 1st problem appearing... total 10 problems... boss appears"
            // Let's stick to a reasonable interval like 12 seconds.
            else if (now - lastQuizTime > 12000) {
                isPaused = true;
                showQuizModal();
            }
        }

        function showQuizModal() {
            const modal = document.getElementById('quizModal')!;
            const qTitle = document.getElementById('quizTitle')!;
            const qText = document.getElementById('questionText')!;
            const qOptions = document.getElementById('quizOptions')!;

            const isFinalBoss = (quizCount === MAX_QUIZ_COUNT - 1);

            if (isFinalBoss) {
                qTitle.innerText = "WARNING! FINAL BOSS";
                qTitle.style.color = "#ff0000";
                qTitle.style.animation = "blink 0.5s infinite";
                stopForestRunnerBGM();
                playBossBattleBGM();
            } else {
                qTitle.innerText = `QUESTION ${quizCount + 1}`;
                qTitle.style.color = "#4CAF50";
                qTitle.style.animation = "none";
            }

            const quiz = QUIZ_DATA[quizCount % QUIZ_DATA.length];
            qText.innerText = quiz.q;
            qOptions.innerHTML = "";

            quiz.o.forEach((opt, idx) => {
                const btn = document.createElement('div');
                btn.className = 'option-btn';
                btn.innerText = opt;
                btn.onclick = () => handleQuizAnswer(idx === quiz.a);
                qOptions.appendChild(btn);
            });

            modal.style.display = 'block';
        }

        function handleQuizAnswer(isCorrect: boolean) {
            const modal = document.getElementById('quizModal')!;
            modal.style.display = 'none';
            isPaused = false;
            lastQuizTime = Date.now();
            quizCount++;
            const progress = document.getElementById('quizProgress');
            if (progress) progress.innerText = `QUIZ: ${quizCount}/${MAX_QUIZ_COUNT}`;

            if (isCorrect) {
                score += 100;
                showFeedback("CORRECT! +100", "#4CAF50");
                player.invincible = true;
                player.invincibleTimer = 1000;
            } else {
                lives--;
                updateLives();
                showFeedback("WRONG! LIFE -1", "#ff4444");
                player.invincible = true;
                player.invincibleTimer = 1000;
                player.state = 'hit';
                player.frameX = 0;
                if (lives <= 0) { player.die(); return; }
            }
            updateUI();

            if (quizCount >= MAX_QUIZ_COUNT) { gameClear(); }
            else { lastTime = performance.now(); requestAnimationFrame(gameLoop); }
        }

        async function gameClear() {
            isGameOver = true;
            isPlaying = false;
            stopForestRunnerBGM();
            stopBossBattleBGM();
            for (let i = 0; i < 50; i++) {
                createParticles(Math.random() * GAME_WIDTH, Math.random() * GAME_HEIGHT, 10, ["#f00", "#0f0", "#00f", "#ff0"][Math.floor(Math.random() * 4)]);
            }
            await handleGameEnd("GAME CLEAR!", "#4CAF50");
        }

        async function handleGameEnd(title: string, color: string) {
            isPlaying = false;
            isGameOver = true;
            stopForestRunnerBGM();
            stopBossBattleBGM();

            // DOM manipulation removed as 'endScreen' no longer exists in JSX
            // Directly proceed to save result and show modal

            try {
                // Show a loading indicator if needed, or just wait
                // For now, we rely on the await time. 
                // Optionally could set a "saving" state here.

                const { saveGameResult } = await import('@/app/actions/game');
                const isClear = title.includes("CLEAR");

                // Count correct answers for reward
                // Since this game is mixed action/quiz, we assume quizCount is correct count if they cleared?
                // Actually quizCount increments on answer. 
                // Let's use quizCount as correct count if they passed the quizzes.
                const correctQuizzes = quizCount;

                const saveResult = await saveGameResult(
                    'pixel-runner',
                    Math.floor(score),
                    Math.floor((performance.now() - startTime) / 1000),
                    {
                        correctCount: correctQuizzes,
                        totalQuestions: MAX_QUIZ_COUNT,
                        isPerfect: isClear && lives === 5
                    }
                );

                const mode = searchParams.get('mode');
                const tournamentId = searchParams.get('tournamentId');

                if (mode === 'tournament' && tournamentId) {
                    const { recordTournamentAttempt } = await import('@/app/actions/tournament');
                    await recordTournamentAttempt(tournamentId, Math.floor(score));
                }

                if (saveResult.success) {
                    openResultModal({
                        isClear,
                        score: Math.floor(score),
                        coinsEarned: saveResult.coinsEarned || 0,
                        dailyCoinsTotal: saveResult.dailyCoinsTotal || 0,
                        dailyLimit: saveResult.dailyLimit || 200,
                        title: title
                    });
                    if (saveResult.coinsEarned && saveResult.coinsEarned > 0) {
                        playSound('coin');
                    }
                } else {
                    // Fallback show basic alert if error or logic fail
                    console.error("Save result failed", saveResult);
                    // Still show modal but with 0 earnings?
                    openResultModal({
                        isClear,
                        score: Math.floor(score),
                        coinsEarned: 0,
                        dailyCoinsTotal: 0,
                        dailyLimit: 200,
                        title: title
                    });
                }
            } catch (err) {
                console.error("Failed to save game result:", err);
                // Show modal even on error so user isn't stuck
                openResultModal({
                    isClear: title.includes("CLEAR"),
                    score: Math.floor(score),
                    coinsEarned: 0,
                    dailyCoinsTotal: 0,
                    dailyLimit: 200,
                    title: title
                });
            }
        }

        function showEndScreen(title: string, color: string) {
            handleGameEnd(title, color);
        }

        function updateUI() {
            const scoreDisplay = document.getElementById('scoreDisplay');
            if (scoreDisplay) scoreDisplay.innerText = "SCORE: " + Math.floor(score);
        }

        function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number) {
            ctx.save();
            const bubbleX = x - 350;
            const bubbleY = y + 20;
            const bubbleW = 320;
            const bubbleH = 60;
            const radius = 10;

            ctx.beginPath();
            ctx.moveTo(bubbleX + radius, bubbleY);
            ctx.lineTo(bubbleX + bubbleW - radius, bubbleY);
            ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + radius, radius);
            ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - radius);
            ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - radius, bubbleY + bubbleH, radius);
            ctx.lineTo(bubbleX + radius, bubbleY + bubbleH);
            ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - radius, radius);
            ctx.lineTo(bubbleX, bubbleY + radius);
            ctx.arcTo(bubbleX, bubbleY, bubbleX + radius, bubbleY, radius);
            ctx.closePath();

            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(bubbleX + bubbleW, bubbleY + bubbleH / 2);
            ctx.lineTo(bubbleX + bubbleW + 20, bubbleY + bubbleH / 2 + 10);
            ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH / 2 + 20);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'black';
            ctx.font = "12px 'Press Start 2P', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("정의의 이름으로 널 용서하지 않겠다", bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
            ctx.restore();
        }

        function gameLoop(timestamp: number) {
            if (!isPlaying) return;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            if (!isPaused && !isGameOver) checkQuiz();

            ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            background.draw(ctx);

            if (quizCount === MAX_QUIZ_COUNT - 1) {
                if (bossImgLoaded) {
                    const bossX = GAME_WIDTH - 300;
                    const bossY = 50;
                    ctx.drawImage(bossImg, bossX, bossY, 250, 250);
                    drawSpeechBubble(ctx, bossX, bossY);
                }
            }

            if (isPaused) {
                obstacles.forEach(obs => obs.draw(ctx));
                coins.forEach(coin => coin.draw(ctx));
                player.draw(ctx);
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
                return;
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].size <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                particles[i].draw(ctx);
            }

            obstacleTimer += deltaTime;
            if (obstacleTimer > Math.random() * 1500 + 1000) {
                const type = Math.random() < 0.6 ? 'ground' : 'air';
                obstacles.push(new Obstacle(type));
                obstacleTimer = 0;
            }

            obstacles.forEach(obs => {
                obs.update();
                obs.draw(ctx);
                if (checkCollision(player.getHitbox(), obs.getHitbox())) {
                    if (obs.type === 'ground') {
                        const ph = player.getHitbox();
                        const oh = obs.getHitbox();
                        if (player.vy > 0 && (ph.y + ph.h < oh.y + oh.h * 0.8)) {
                            playSound('stomp');
                            createParticles(obs.x + obs.w / 2, obs.y + obs.h / 2, 10, '#8B4513');
                            obs.markedForDeletion = true;
                            player.vy = -10;
                        } else {
                            player.hit();
                        }
                    } else {
                        player.hit();
                    }
                }
            });
            obstacles = obstacles.filter(obs => !obs.markedForDeletion);

            coinTimer += deltaTime;
            if (coinTimer > 600) {
                coins.push(new Coin());
                coinTimer = 0;
            }

            coins.forEach(coin => {
                coin.update();
                coin.draw(ctx);
                if (checkCollision(player.getHitbox(), coin.getHitbox())) {
                    score += 10;
                    coin.markedForDeletion = true;
                    playSound('coin');
                    createParticles(coin.x + 15, coin.y + 15, 5, '#FFFFFF');
                }
            });
            coins = coins.filter(coin => !coin.markedForDeletion);

            player.update(deltaTime);
            player.draw(ctx);

            if (!isGameOver) {
                score += 0.05;
                gameSpeed += 0.001;
                updateUI();
                requestAnimationFrame(gameLoop);
            } else {
                player.draw(ctx);
            }
        }

        const startBtn = document.getElementById('startBtn')!;
        const handleStartClick = () => {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            document.getElementById('startScreen')!.classList.add('hidden');
            resetVariables();
            isPlaying = true;
            lastTime = performance.now();
            startTime = Date.now();
            lastQuizTime = Date.now();
            playForestRunnerBGM();
            requestAnimationFrame(gameLoop);
        };
        // startBtn.onclick = handleStartClick; // Remove double listener
        startRef.current = handleStartClick;

        const tryAgainBtn = document.getElementById('tryAgainBtn')!;
        const handleRetryClick = () => {
            document.getElementById('endScreen')!.classList.add('hidden');
            resetVariables();
            isPlaying = true;
            lastTime = performance.now();
            startTime = Date.now();
            lastQuizTime = Date.now();
            playForestRunnerBGM();
            requestAnimationFrame(gameLoop);
        };
        // tryAgainBtn.onclick = handleRetryClick; // Remove double listener
        retryRef.current = handleRetryClick;

        function resetVariables() {
            score = 0;
            lives = 5;
            gameSpeed = 4; // Adjusted for difficulty (was 5)
            obstacles = [];
            coins = [];
            particles = [];
            isGameOver = false;
            isPaused = false;
            quizCount = 0;
            player.state = 'run';
            player.y = GROUND_Y;
            player.invincible = false;
            updateLives();
            updateUI();
            const progress = document.getElementById('quizProgress');
            if (progress) progress.innerText = "QUIZ: 0/10";
        }

        bgImg.onload = () => { bgImgLoaded = true; background.draw(ctx); };

        return () => {
            // Cleanup listeners and intervals
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            btnJump.removeEventListener('mousedown', handleJump);
            btnJump.removeEventListener('mouseup', handleJumpEnd);
            btnJump.removeEventListener('touchstart', handleJump);
            btnJump.removeEventListener('touchend', handleJumpEnd);
            btnSlide.removeEventListener('mousedown', handleSlide);
            btnSlide.removeEventListener('mouseup', handleSlideEnd);
            btnSlide.removeEventListener('touchstart', handleSlide);
            btnSlide.removeEventListener('touchend', handleSlideEnd);
            stopForestRunnerBGM();
            stopBossBattleBGM();
            audioCtx.close();
        };
    }, []);

    return (
        <div className="game-body-wrapper font-pixel text-white flex flex-col justify-center items-center min-h-screen bg-[#111] overflow-hidden">

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
                
                #gameContainer {
                    position: relative;
                    width: 800px;
                    height: 450px;
                    border: 20px solid #C0C0C0;
                    border-radius: 15px;
                    box-shadow: 
                        inset 5px 5px 10px rgba(255,255,255,0.7),
                        inset -5px -5px 15px rgba(0,0,0,0.5),
                        0 20px 50px rgba(0,0,0,0.8);
                    background: #000;
                    box-sizing: content-box;
                    z-index: 1;
                    max-width: 100%;
                }

                #gameCanvas {
                    display: block;
                    background-color: #87CEEB; 
                    image-rendering: pixelated; 
                    width: 100%;
                    height: 100%;
                    border-radius: 5px;
                }

                #uiLayer {
                    position: absolute;
                    top: 15px;
                    left: 20px;
                    width: 95%;
                    pointer-events: none;
                    display: flex;
                    justify-content: space-between;
                }

                .hud-text {
                    font-family: 'Press Start 2P', cursive;
                    font-size: 18px;
                    color: #fff;
                    text-shadow: 3px 3px 0 #000;
                }

                #touchControls {
                    display: flex;
                    width: 100%;
                    max-width: 800px;
                    justify-content: space-between;
                    margin-top: 20px; 
                    padding: 0 20px;
                    box-sizing: border-box;
                }

                .control-btn {
                    width: 120px;
                    height: 80px;
                    background-color: #333;
                    border: 4px solid #666;
                    border-radius: 15px;
                    color: #fff;
                    font-family: 'Press Start 2P', cursive;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    box-shadow: 0 5px 0 #000;
                    transition: transform 0.1s, box-shadow 0.1s;
                }

                .control-btn:active, .control-btn.active {
                    transform: translateY(5px);
                    box-shadow: 0 0 0 #000;
                    background-color: #555;
                    border-color: #888;
                }

                .btn-jump { background-color: #d32f2f; border-color: #b71c1c; }
                .btn-slide { background-color: #1976d2; border-color: #0d47a1; }

                #startScreen, #endScreen {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: #000;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    z-index: 100;
                    font-family: 'Press Start 2P', cursive;
                    border-radius: 5px;
                }

                .retro-title {
                    font-size: 50px;
                    color: #ff0055;
                    text-shadow: 4px 4px #00eaff;
                    margin-bottom: 40px;
                    animation: titleFloat 2s infinite ease-in-out;
                    line-height: 1.5;
                }

                .retro-desc {
                    font-size: 14px;
                    color: #aaa;
                    margin-bottom: 10px;
                    line-height: 1.8;
                }

                .press-start {
                    margin-top: 40px;
                    font-size: 20px;
                    color: #ffff00;
                    animation: blink 0.8s infinite;
                    cursor: pointer;
                    border: 2px solid #ffff00;
                    padding: 15px 30px;
                    background: transparent;
                    font-family: inherit;
                }
                .press-start:hover { background: #ffff00; color: #000; }

                @keyframes blink { 50% { opacity: 0; } }
                @keyframes titleFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

                /* --- CRT & Scanline Effects --- */
                .scanlines {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(
                        rgba(18, 16, 16, 0) 50%, 
                        rgba(0, 0, 0, 0.1) 50%
                    ), linear-gradient(
                        90deg, 
                        rgba(255, 0, 0, 0.03), 
                        rgba(0, 255, 0, 0.01), 
                        rgba(0, 0, 255, 0.03)
                    );
                    background-size: 100% 3px, 3px 100%;
                    pointer-events: none;
                    z-index: 50;
                    opacity: 0.6;
                }

                .screen-flicker {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(18, 16, 16, 0.05);
                    opacity: 0;
                    pointer-events: none;
                    z-index: 49;
                    animation: flicker 0.15s infinite;
                }

                @keyframes flicker {
                    0% { opacity: 0.02; }
                    5% { opacity: 0.05; }
                    10% { opacity: 0.01; }
                    15% { opacity: 0.08; }
                    20% { opacity: 0.03; }
                    25% { opacity: 0.06; }
                    30% { opacity: 0.02; }
                    100% { opacity: 0.01; }
                }

                #gameContainer::after {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
                    pointer-events: none;
                    z-index: 51;
                }

                .hidden { display: none !important; }

                #quizModal {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 600px; background: rgba(0, 0, 0, 0.95);
                    border: 4px solid #4CAF50; border-radius: 0;
                    padding: 30px; text-align: center; color: white;
                    display: none; z-index: 200;
                    box-shadow: 8px 8px 0px rgba(0,0,0,0.5);
                    font-family: 'Courier New', monospace;
                }
                #quizModal h2 { margin-top: 0; color: #4CAF50; font-family: 'Press Start 2P', cursive; font-size: 20px; margin-bottom: 20px; }
                #questionText { font-size: 24px; margin: 20px 0; font-weight: bold; line-height: 1.4; }
                .options { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .option-btn {
                    background: #333; border: 2px solid #fff; color: white;
                    padding: 15px; font-size: 18px; cursor: pointer;
                    transition: 0.1s; font-family: inherit;
                }
                .option-btn:hover { background: #fff; color: #000; transform: scale(1.02); }

                #feedbackMsg {
                    position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
                    font-size: 40px; font-weight: bold; text-shadow: 4px 4px 0 #000;
                    display: none; z-index: 300; pointer-events: none;
                    white-space: nowrap;
                    font-family: 'Press Start 2P', cursive;
                }
                @keyframes popUp { 
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0; }
                }
                
                #quizProgress {
                    position: absolute; top: 50px; left: 20px;
                    font-family: 'Press Start 2P'; font-size: 12px; color: #aaa;
                }
            `}</style>

            <div className="mb-4 flex justify-start w-full max-w-[840px] px-4">
                <Button variant="outline" className="border-2 border-white bg-transparent hover:bg-white hover:text-black font-pixel text-white" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
                </Button>
            </div>

            <div id="gameContainer" ref={containerRef}>
                <div className="scanlines"></div>
                <div className="screen-flicker"></div>
                <canvas id="gameCanvas" width="800" height="450"></canvas>

                <div id="uiLayer">
                    <span id="scoreDisplay" className="hud-text">SCORE: 0</span>
                    <span id="livesDisplay" className="hud-text">❤️❤️❤️❤️❤️</span>
                </div>
                <div id="quizProgress">QUIZ: 0/10</div>

                <div id="quizModal">
                    <h2 id="quizTitle">BONUS QUIZ</h2>
                    <div id="questionText"></div>
                    <div className="options" id="quizOptions"></div>
                </div>

                <div id="feedbackMsg"></div>

                <div id="startScreen" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: '#000',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    zIndex: 100,
                    borderRadius: '5px',
                }}>
                    <div className="retro-title">PIXEL<br />RUNNER</div>
                    <div className="retro-desc">
                        PC: SPACE / DOWN<br />
                        TABLET: USE BUTTONS BELOW
                    </div>
                    <button id="startBtn" className="press-start" onClick={() => startRef.current?.()}>PRESS START</button>
                </div>

                <GameResultModal
                    isOpen={result.isOpen}
                    isClear={result.isClear}
                    score={result.score}
                    coinsEarned={result.coinsEarned}
                    dailyCoinsTotal={result.dailyCoinsTotal}
                    dailyLimit={result.dailyLimit}
                    title={result.title}
                    onRetry={() => {
                        setResult(prev => ({ ...prev, isOpen: false }));
                        retryRef.current?.();
                    }}
                    onExit={() => {
                        setResult(prev => ({ ...prev, isOpen: false }));
                        router.back();
                    }}
                />
            </div>

            <div id="touchControls">
                <div className="control-btn btn-slide" id="btnSlide">SLIDE</div>
                <div className="control-btn btn-jump" id="btnJump">JUMP</div>
            </div>

            <div className="mt-8 text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-bold font-pixel">
                Made by Junhyo Park
            </div>
        </div >
    );
}
