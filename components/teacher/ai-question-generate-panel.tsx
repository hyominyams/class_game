"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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

function getDefaultCounts(maxQuestions: number): DifficultyCounts {
    const high = Math.min(2, Math.max(0, maxQuestions));
    const medium = Math.min(4, Math.max(0, maxQuestions - high));
    const low = Math.min(4, Math.max(0, maxQuestions - high - medium));

    return { high, medium, low };
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

    const totalQuestions = counts.high + counts.medium + counts.low;
    const resolvedGeneralTopic = customTopic.trim() || generalTopicPreset;

    const updateCount = (key: keyof DifficultyCounts, value: string) => {
        const parsed = Number(value);
        const next = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        setCounts((prev) => ({ ...prev, [key]: next }));
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
            alert("General 주제를 선택하거나 입력해 주세요.");
            return;
        }

        await onGenerate({
            difficultyCounts: counts,
            topicMode,
            topic: topicMode === "default" ? defaultTopic : resolvedGeneralTopic,
        });
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
                {loading ? "AI 생성 중..." : "AI자동생성"}
            </Button>
        </div>
    );
}
