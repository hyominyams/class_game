"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestionSet, getQuestions, updateQuestionSet } from "@/app/actions/game-data";
import { generateQuestionsWithAI } from "@/app/actions/question-ai";
import { AiQuestionGeneratePanel, type AiGenerationConfig } from "./ai-question-generate-panel";
import { downloadWordDefenseTemplateCsv, parseWordDefenseCsvFile } from "./question-csv-utils";

type TeacherProfile = {
    grade?: number | null;
    class?: number | null;
} | null | undefined;

type WordPair = {
    english: string;
    korean: string;
};

type WordQuestionMode = "en_to_ko" | "ko_to_en" | "mixed";

type MultipleChoiceQuestionRow = {
    question_text: string | null;
    answer_text: string | null;
};

type GeneratedWordPair = {
    english?: unknown;
    korean?: unknown;
};

function normalizeNumericInput(value: string) {
    if (!value || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeQuestionMode(value: unknown): WordQuestionMode {
    if (value === "ko_to_en" || value === "mixed" || value === "en_to_ko") {
        return value;
    }

    return "en_to_ko";
}

function getQuestionModeDescription(mode: WordQuestionMode) {
    if (mode === "ko_to_en") {
        return "한글 뜻이 나오고 영어 단어를 입력합니다.";
    }

    if (mode === "mixed") {
        return "영어/한글 문제가 섞여서 출제됩니다.";
    }

    return "영어 단어가 나오고 한글 뜻을 입력합니다.";
}

export function WordSetModal({
    children,
    gameId = "word-runner",
    gameTitle = "단어 디펜스",
    teacherProfile,
    setId,
    initialTitle = "",
    initialGrade,
    initialClass,
    initialQuestionMode = "en_to_ko",
}: {
    children: React.ReactNode;
    gameId?: string;
    gameTitle?: string;
    teacherProfile?: TeacherProfile;
    setId?: string;
    initialTitle?: string;
    initialGrade?: number | null;
    initialClass?: number | null;
    initialQuestionMode?: string | null;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const defaultGrade = useMemo(() => {
        if (typeof initialGrade === "number") return String(initialGrade);
        if (typeof teacherProfile?.grade === "number") return String(teacherProfile.grade);
        return "";
    }, [initialGrade, teacherProfile?.grade]);

    const defaultClass = useMemo(() => {
        if (typeof initialClass === "number") return String(initialClass);
        if (typeof teacherProfile?.class === "number") return String(teacherProfile.class);
        return "";
    }, [initialClass, teacherProfile?.class]);

    const [title, setTitle] = useState(initialTitle);
    const [grade, setGrade] = useState(defaultGrade);
    const [classNum, setClassNum] = useState(defaultClass);
    const [questionMode, setQuestionMode] = useState<WordQuestionMode>(normalizeQuestionMode(initialQuestionMode));
    const [words, setWords] = useState<WordPair[]>([{ english: "", korean: "" }]);

    useEffect(() => {
        setTitle(initialTitle);
    }, [initialTitle]);

    useEffect(() => {
        setGrade(defaultGrade);
    }, [defaultGrade]);

    useEffect(() => {
        setClassNum(defaultClass);
    }, [defaultClass]);

    useEffect(() => {
        setQuestionMode(normalizeQuestionMode(initialQuestionMode));
    }, [initialQuestionMode]);

    const handleModalKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const target = event.target;
        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLElement && target.isContentEditable
        ) {
            event.stopPropagation();
        }
    };

    useEffect(() => {
        if (!open || !setId) return;

        const loadSetQuestions = async () => {
            setLoading(true);
            try {
                const data = (await getQuestions(setId)) as MultipleChoiceQuestionRow[];
                if (data.length === 0) {
                    setWords([{ english: "", korean: "" }]);
                    return;
                }

                const parsed = data.map((row) => ({
                    english: row.answer_text || "",
                    korean: row.question_text || "",
                }));
                setWords(parsed);
            } catch (error) {
                console.error("Failed to load word-defense questions:", error);
                alert("문제 세트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
            } finally {
                setLoading(false);
            }
        };

        void loadSetQuestions();
    }, [open, setId]);

    const addWord = () => {
        setWords((prev) => [...prev, { english: "", korean: "" }]);
    };

    const removeWord = (index: number) => {
        setWords((prev) => prev.filter((_, i) => i !== index));
    };

    const updateWord = (index: number, field: keyof WordPair, value: string) => {
        setWords((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imported = await parseWordDefenseCsvFile(file);
            setWords(imported.map((row) => ({ english: row.english, korean: row.korean })));
        } catch (error) {
            const message = error instanceof Error ? error.message : "CSV 파싱에 실패했습니다.";
            alert(message);
        } finally {
            event.target.value = "";
        }
    };

    const handleAiGenerate = async (config: AiGenerationConfig) => {
        setAiLoading(true);

        try {
            const result = await generateQuestionsWithAI({
                gameId,
                difficultyCounts: config.difficultyCounts,
                topicMode: config.topicMode,
                topic: config.topic,
            });

            if (!result.success) {
                alert(result.error || "AI 문제 생성에 실패했습니다.");
                return;
            }

            const generatedRows = Array.isArray(result.questions) ? result.questions : [];
            const nextWords = generatedRows
                .map((item) => {
                    const row = item as GeneratedWordPair;
                    const english = typeof row.english === "string" ? row.english.trim() : "";
                    const korean = typeof row.korean === "string" ? row.korean.trim() : "";

                    if (!english || !korean) return null;

                    return { english, korean };
                })
                .filter((row): row is WordPair => Boolean(row));

            if (nextWords.length === 0) {
                alert("AI가 유효한 문항을 생성하지 못했습니다. 다시 시도해 주세요.");
                return;
            }

            setWords(nextWords);
            alert(`${nextWords.length}개 문항을 자동 생성했습니다.`);
        } catch (error) {
            console.error("Failed to generate AI word questions:", error);
            alert("AI 문제 생성 중 오류가 발생했습니다.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const parsedGrade = normalizeNumericInput(grade);
        const parsedClass = normalizeNumericInput(classNum);

        if (!title.trim()) {
            alert("세트 제목을 입력해 주세요.");
            return;
        }

        if (Number.isNaN(parsedGrade) || Number.isNaN(parsedClass)) {
            alert("학년/반을 올바른 숫자 형식으로 입력해 주세요. (공통은 빈칸)");
            return;
        }

        if ((parsedGrade === null && parsedClass !== null) || (parsedGrade !== null && parsedClass === null)) {
            alert("학년/반은 모두 입력하거나 모두 빈칸이어야 합니다.");
            return;
        }

        if (words.some((word) => !word.english.trim() || !word.korean.trim())) {
            alert("모든 문항에 영어/뜻을 입력해 주세요.");
            return;
        }

        setLoading(true);
        try {
            const questionsData = words.map((word) => ({
                question_text: word.korean.trim(),
                answer_text: word.english.trim(),
                options: [word.english.trim()],
                type: "word-pair",
                correct_answer: 0,
            }));

            const result = setId
                ? await updateQuestionSet(setId, title.trim(), parsedGrade, parsedClass, questionsData, { questionMode })
                : await createQuestionSet(gameId, title.trim(), parsedGrade, parsedClass, questionsData, { questionMode });

            if (!result.success) {
                alert(result.error || "문제세트 저장에 실패했습니다.");
                return;
            }

            setOpen(false);
            if (!setId) {
                setTitle("");
                setQuestionMode("en_to_ko");
                setWords([{ english: "", korean: "" }]);
            }
            router.refresh();
        } catch (error) {
            console.error("Failed to save word-defense set:", error);
            alert("문제 세트 저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const isEditMode = Boolean(setId);
    const gradeReadOnly = isEditMode || typeof teacherProfile?.grade === "number";
    const classReadOnly = isEditMode || typeof teacherProfile?.class === "number";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black p-0 sm:rounded-xl"
                onKeyDownCapture={handleModalKeyDownCapture}
            >
                <DialogHeader className="bg-[#fdcb6e] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-2xl text-black">
                        {gameTitle} 문제세트 {setId ? "수정" : "생성"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                        <div className="space-y-2">
                            <Label className="font-bold">학년 / 반</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={grade}
                                    onChange={(event) => setGrade(event.target.value)}
                                    placeholder={gradeReadOnly ? "학년" : "공통(빈칸)"}
                                    required={gradeReadOnly}
                                    readOnly={gradeReadOnly}
                                />
                                <Input
                                    type="number"
                                    value={classNum}
                                    onChange={(event) => setClassNum(event.target.value)}
                                    placeholder={classReadOnly ? "반" : "공통(빈칸)"}
                                    required={classReadOnly}
                                    readOnly={classReadOnly}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">세트 제목</Label>
                            <Input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="예: 단어 디펜스 기초 20"
                                required
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="font-bold">출제 모드</Label>
                            <Select value={questionMode} onValueChange={(value) => setQuestionMode(normalizeQuestionMode(value))}>
                                <SelectTrigger className="border-2 border-black bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-black bg-white">
                                    <SelectItem value="en_to_ko">영어→한글 모드</SelectItem>
                                    <SelectItem value="ko_to_en">한글→영어 모드</SelectItem>
                                    <SelectItem value="mixed">혼합 모드</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs font-bold text-gray-500">{getQuestionModeDescription(questionMode)}</p>
                        </div>
                    </div>

                    <AiQuestionGeneratePanel
                        gameId={gameId}
                        loading={aiLoading}
                        disabled={loading}
                        onGenerate={handleAiGenerate}
                    />

                    <div className="rounded-xl border-2 border-black p-4 bg-[#fff7df] space-y-3">
                        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                            <p className="text-sm font-bold">CSV 업로드 (예시 양식 참고)</p>
                            <Button type="button" variant="outline" onClick={downloadWordDefenseTemplateCsv} className="border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold">
                                예시 CSV 다운로드
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <Input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-lg font-pixel">문항 목록 ({words.length})</Label>
                            <Button type="button" variant="outline" onClick={addWord} className="border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold">
                                <Plus className="w-4 h-4 mr-1" /> 단어 추가
                            </Button>
                        </div>

                        {words.map((word, idx) => (
                            <div
                                key={`word-row-${idx}`}
                                className="grid grid-cols-[40px_1fr_1fr_auto] gap-2 items-center border-2 border-black rounded-lg p-2 bg-white"
                            >
                                <span className="text-center text-xs font-black">{idx + 1}</span>
                                <Input
                                    placeholder="English"
                                    value={word.english}
                                    onChange={(event) => updateWord(idx, "english", event.target.value)}
                                    required
                                />
                                <Input
                                    placeholder="한글(뜻)"
                                    value={word.korean}
                                    onChange={(event) => updateWord(idx, "korean", event.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    disabled={words.length <= 1}
                                    onClick={() => removeWord(idx)}
                                    className="hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button type="submit" className="w-full h-14 border-4 border-black bg-blue-500 hover:bg-blue-600 text-white font-pixel text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_rgba(0,0,0,1)]" disabled={loading || aiLoading}>
                        {loading ? "저장 중..." : "문제세트 저장"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
