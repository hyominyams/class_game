"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    getDefaultTopicForGame,
    getQuestionLimitForGame,
    type AiTopicMode,
    type DifficultyCounts,
} from "@/lib/questions/ai-config";

const GENERAL_TOPIC_PRESETS = [
    "과학",
    "수학",
    "사회",
    "문학",
    "예술",
    "스포츠",
    "환경",
    "기술",
];

const BASE_ESTIMATED_DURATION_MS = 12000;
const PER_QUESTION_ESTIMATED_DURATION_MS = 1300;
const MIN_ESTIMATED_DURATION_MS = 18000;
const MAX_PENDING_PROGRESS = 96;

function getDefaultCounts(maxQuestions: number): DifficultyCounts {
    const high = Math.min(2, Math.max(0, maxQuestions));
    const medium = Math.min(4, Math.max(0, maxQuestions - high));
    const low = Math.min(4, Math.max(0, maxQuestions - high - medium));

    return { high, medium, low };
}

function getEstimatedDurationMs(totalQuestions: number) {
    return Math.max(
        MIN_ESTIMATED_DURATION_MS,
        BASE_ESTIMATED_DURATION_MS + totalQuestions * PER_QUESTION_ESTIMATED_DURATION_MS
    );
}

export type AiGenerationConfig = {
    difficultyCounts: DifficultyCounts;
    topicMode: AiTopicMode;
    topic: string;
};

type AiQuestionGeneratePanelProps = {
    gameId: string;
    loading: boolean;
    disabled?: boolean;
    onGenerate: (config: AiGenerationConfig) => Promise<void>;
};

export function AiQuestionGeneratePanel(props: AiQuestionGeneratePanelProps) {
    return <AiQuestionGeneratePanelBody key={props.gameId} {...props} />;
}

function AiQuestionGeneratePanelBody({
    gameId,
    loading,
    disabled,
    onGenerate,
}: AiQuestionGeneratePanelProps) {
    const maxQuestions = getQuestionLimitForGame(gameId);
    const defaultTopic = getDefaultTopicForGame(gameId);

    const [counts, setCounts] = useState<DifficultyCounts>(() => getDefaultCounts(maxQuestions));
    const [topicMode, setTopicMode] = useState<AiTopicMode>("default");
    const [generalTopicPreset, setGeneralTopicPreset] = useState(GENERAL_TOPIC_PRESETS[0]);
    const [customTopic, setCustomTopic] = useState("");
    const [progressVisible, setProgressVisible] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const totalQuestions = counts.high + counts.medium + counts.low;
    const resolvedGeneralTopic = customTopic.trim() || generalTopicPreset;
    const resolvedDefaultTopic = customTopic.trim()
        ? `${defaultTopic} - ${customTopic.trim()}`
        : defaultTopic;

    const updateCount = (key: keyof DifficultyCounts, value: string) => {
        const parsed = Number(value);
        const next = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        setCounts((prev) => ({ ...prev, [key]: next }));
    };

    const clearProgressTimers = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            clearProgressTimers();
        };
    }, []);

    const startProgress = (questionCount: number) => {
        clearProgressTimers();

        const estimatedDurationMs = getEstimatedDurationMs(questionCount);
        const startedAt = Date.now();

        setProgressVisible(true);
        setProgressPercent(1);
        setRemainingSeconds(Math.ceil(estimatedDurationMs / 1000));

        progressIntervalRef.current = setInterval(() => {
            const elapsedMs = Date.now() - startedAt;
            const ratio = Math.min(elapsedMs / estimatedDurationMs, MAX_PENDING_PROGRESS / 100);
            const nextPercent = Math.max(1, Math.floor(ratio * 100));
            const nextRemaining = Math.max(0, Math.ceil((estimatedDurationMs - elapsedMs) / 1000));

            setProgressPercent(nextPercent);
            setRemainingSeconds(nextRemaining);
        }, 250);
    };

    const finishProgress = () => {
        clearProgressTimers();
        setProgressPercent(100);
        setRemainingSeconds(0);

        hideTimeoutRef.current = setTimeout(() => {
            setProgressVisible(false);
            setProgressPercent(0);
            setRemainingSeconds(null);
        }, 1200);
    };

    const handleGenerateClick = async () => {
        if (totalQuestions <= 0) {
            alert("문항 수를 1개 이상 입력해 주세요.");
            return;
        }

        if (totalQuestions > maxQuestions) {
            alert(`총 문항 수는 최대 ${maxQuestions}개까지 가능합니다.`);
            return;
        }

        if (topicMode === "general" && !resolvedGeneralTopic) {
            alert("General 주제를 선택하거나 직접 입력해 주세요.");
            return;
        }

        startProgress(totalQuestions);

        try {
            await onGenerate({
                difficultyCounts: counts,
                topicMode,
                topic: topicMode === "default" ? resolvedDefaultTopic : resolvedGeneralTopic,
            });
        } finally {
            finishProgress();
        }
    };

    return (
        <div className="rounded-xl border-2 border-black p-4 bg-[#edf7ff] space-y-4">
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <p className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI자동생성
                </p>
                <p className="text-xs font-bold text-gray-600">
                    총 {totalQuestions} / 최대 {maxQuestions}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                    <Label className="text-xs font-bold">상 (중학교)</Label>
                    <Input
                        type="number"
                        min={0}
                        value={counts.high}
                        onChange={(event) => updateCount("high", event.target.value)}
                        disabled={disabled || loading}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold">중 (초등 고학년)</Label>
                    <Input
                        type="number"
                        min={0}
                        value={counts.medium}
                        onChange={(event) => updateCount("medium", event.target.value)}
                        disabled={disabled || loading}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-bold">하 (초등 저학년)</Label>
                    <Input
                        type="number"
                        min={0}
                        value={counts.low}
                        onChange={(event) => updateCount("low", event.target.value)}
                        disabled={disabled || loading}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold">주제</Label>
                <Select
                    value={topicMode}
                    onValueChange={(value) => setTopicMode(value === "general" ? "general" : "default")}
                    disabled={disabled || loading}
                >
                    <SelectTrigger className="border-2 border-black bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black bg-white">
                        <SelectItem value="default">기본 주제 ({defaultTopic})</SelectItem>
                        <SelectItem value="general">General (직접 선택/입력)</SelectItem>
                    </SelectContent>
                </Select>

                {topicMode === "default" && (
                    <Input
                        value={customTopic}
                        onChange={(event) => setCustomTopic(event.target.value)}
                        placeholder={`세부 주제 입력 (예: ${defaultTopic} - 조선시대 인물/사건)`}
                        disabled={disabled || loading}
                    />
                )}

                {topicMode === "general" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Select
                            value={generalTopicPreset}
                            onValueChange={setGeneralTopicPreset}
                            disabled={disabled || loading}
                        >
                            <SelectTrigger className="border-2 border-black bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-2 border-black bg-white">
                                {GENERAL_TOPIC_PRESETS.map((preset) => (
                                    <SelectItem key={preset} value={preset}>
                                        {preset}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            value={customTopic}
                            onChange={(event) => setCustomTopic(event.target.value)}
                            placeholder="직접 입력 (입력 시 우선 적용)"
                            disabled={disabled || loading}
                        />
                    </div>
                )}
            </div>

            <Button
                type="button"
                onClick={() => void handleGenerateClick()}
                className="w-full border-2 border-black bg-[#81ecec] text-black hover:bg-[#55efc4] font-bold"
                disabled={disabled || loading}
            >
                {loading ? "AI 생성 중.." : "AI자동생성"}
            </Button>

            {progressVisible && (
                <div className="rounded-xl border-2 border-black p-3 bg-white space-y-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold flex items-center gap-2">
                            <Loader2 className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            AI 문제 생성 작업 중
                        </p>
                        <p className="text-xs font-black">{progressPercent}%</p>
                    </div>
                    <div className="h-2 w-full rounded-full border border-black bg-gray-100 overflow-hidden">
                        <div
                            className="h-full bg-[#55efc4] transition-[width] duration-200 ease-linear"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-[11px] font-bold text-gray-600">
                        {progressPercent < 100
                            ? `예상 남은 시간 약 ${remainingSeconds ?? 0}초`
                            : "생성이 완료되었습니다."}
                    </p>
                </div>
            )}
        </div>
    );
}