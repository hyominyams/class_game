"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestionSet, getQuestions, updateQuestionSet } from "@/app/actions/game-data";
import { downloadHistoryTemplateCsv, parseHistoryCsvFile } from "./question-csv-utils";

type TeacherProfile = {
    grade?: number | null;
    class?: number | null;
} | null | undefined;

type QuestionType = "multiple-choice" | "short-answer";

type QuestionState = {
    text: string;
    type: QuestionType;
    options: [string, string, string, string];
    answer: number | string;
};

type HistoryQuestionRow = {
    question_text: string | null;
    type: string | null;
    options: unknown;
    correct_answer: number | null;
    answer_text: string | null;
};

const EMPTY_OPTIONS: [string, string, string, string] = ["", "", "", ""];

function parseNumericInput(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeOptions(options: unknown): [string, string, string, string] {
    let arr: string[] = [];

    if (Array.isArray(options)) {
        arr = options.map((value) => String(value ?? ""));
    } else if (typeof options === "string") {
        try {
            const parsed = JSON.parse(options) as unknown;
            if (Array.isArray(parsed)) {
                arr = parsed.map((value) => String(value ?? ""));
            }
        } catch {
            arr = [];
        }
    }

    return [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
}

export function HistorySetModal({
    children,
    gameId = "history-quiz",
    gameTitle = "역사 퀴즈 어택",
    teacherProfile,
    setId,
    initialTitle = "",
    initialGrade,
    initialClass,
}: {
    children: React.ReactNode;
    gameId?: string;
    gameTitle?: string;
    teacherProfile?: TeacherProfile;
    setId?: string;
    initialTitle?: string;
    initialGrade?: number | null;
    initialClass?: number | null;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

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
    const [questions, setQuestions] = useState<QuestionState[]>([
        { text: "", type: "multiple-choice", options: [...EMPTY_OPTIONS], answer: 0 },
    ]);

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
        setTitle(initialTitle);
    }, [initialTitle]);

    useEffect(() => {
        setGrade(defaultGrade);
    }, [defaultGrade]);

    useEffect(() => {
        setClassNum(defaultClass);
    }, [defaultClass]);

    useEffect(() => {
        if (!open || !setId) return;

        const loadQuestions = async () => {
            setLoading(true);
            try {
                const data = (await getQuestions(setId)) as HistoryQuestionRow[];
                if (data.length === 0) {
                    setQuestions([{ text: "", type: "multiple-choice", options: [...EMPTY_OPTIONS], answer: 0 }]);
                    return;
                }

                const parsed: QuestionState[] = data.map((row) => {
                    const type: QuestionType = row.type === "short-answer" ? "short-answer" : "multiple-choice";
                    const options = normalizeOptions(row.options);

                    return {
                        text: row.question_text || "",
                        type,
                        options,
                        answer: type === "short-answer" ? row.answer_text || "" : Number(row.correct_answer ?? 0),
                    };
                });

                setQuestions(parsed);
            } finally {
                setLoading(false);
            }
        };

        void loadQuestions();
    }, [open, setId]);

    const addQuestion = () => {
        setQuestions((prev) => [...prev, { text: "", type: "multiple-choice", options: [...EMPTY_OPTIONS], answer: 0 }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, patch: Partial<QuestionState>) => {
        setQuestions((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
        setQuestions((prev) => {
            const next = [...prev];
            const nextOptions = [...next[questionIndex].options] as [string, string, string, string];
            nextOptions[optionIndex] = value;
            next[questionIndex] = { ...next[questionIndex], options: nextOptions };
            return next;
        });
    };

    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imported = await parseHistoryCsvFile(file);
            const next: QuestionState[] = imported.map((row) => {
                const options: [string, string, string, string] = row.type === "multiple-choice"
                    ? [
                        row.options[0] || "",
                        row.options[1] || "",
                        row.options[2] || "",
                        row.options[3] || "",
                    ]
                    : [...EMPTY_OPTIONS];

                return {
                    text: row.text,
                    type: row.type,
                    options,
                    answer: row.answer,
                };
            });
            setQuestions(next);
        } catch (error) {
            const message = error instanceof Error ? error.message : "CSV 파싱에 실패했습니다.";
            alert(message);
        } finally {
            event.target.value = "";
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const parsedGrade = parseNumericInput(grade);
        const parsedClass = parseNumericInput(classNum);

        if (!title.trim()) {
            alert("세트 제목을 입력해주세요.");
            return;
        }

        if (Number.isNaN(parsedGrade) || Number.isNaN(parsedClass)) {
            alert("학년/반을 올바르게 입력해주세요.");
            return;
        }

        for (let i = 0; i < questions.length; i += 1) {
            const current = questions[i];
            if (!current.text.trim()) {
                alert(`${i + 1}번 문항의 문제 텍스트를 입력해주세요.`);
                return;
            }

            if (current.type === "multiple-choice") {
                if (current.options.some((option) => !option.trim())) {
                    alert(`${i + 1}번 객관식 문항의 보기를 모두 입력해주세요.`);
                    return;
                }

                const answerIndex = Number(current.answer);
                if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
                    alert(`${i + 1}번 객관식 문항의 정답 보기를 선택해주세요.`);
                    return;
                }
            } else if (!String(current.answer || "").trim()) {
                alert(`${i + 1}번 주관식 문항의 정답을 입력해주세요.`);
                return;
            }
        }

        setLoading(true);

        const payload = questions.map((question) => ({
            question_text: question.text.trim(),
            type: question.type,
            options: question.type === "multiple-choice" ? question.options.map((option) => option.trim()) : null,
            correct_answer: question.type === "multiple-choice" ? Number(question.answer) : null,
            answer_text: question.type === "short-answer" ? String(question.answer).trim() : null,
        }));

        const result = setId
            ? await updateQuestionSet(setId, title.trim(), parsedGrade, parsedClass, payload)
            : await createQuestionSet(gameId, title.trim(), parsedGrade, parsedClass, payload);

        setLoading(false);

        if (!result.success) {
            alert(result.error || "문제세트 저장에 실패했습니다.");
            return;
        }

        setOpen(false);
        if (!setId) {
            setTitle("");
            setQuestions([{ text: "", type: "multiple-choice", options: [...EMPTY_OPTIONS], answer: 0 }]);
        }
        router.refresh();
    };

    const gradeReadOnly = typeof teacherProfile?.grade === "number";
    const classReadOnly = typeof teacherProfile?.class === "number";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black p-0 sm:rounded-xl"
                onKeyDownCapture={handleModalKeyDownCapture}
            >
                <DialogHeader className="bg-[#ff2e63] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-2xl text-white">
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
                                    placeholder="학년"
                                    required
                                    readOnly={gradeReadOnly}
                                />
                                <Input
                                    type="number"
                                    value={classNum}
                                    onChange={(event) => setClassNum(event.target.value)}
                                    placeholder="반"
                                    required
                                    readOnly={classReadOnly}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">세트 제목</Label>
                            <Input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="예: 역사 퀴즈 어택 1단원"
                                required
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border-2 border-black p-4 bg-[#ffe9ef] space-y-3">
                        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                            <p className="text-sm font-bold">CSV 업로드 (예시 파일 컬럼 그대로 작성)</p>
                            <Button type="button" variant="outline" onClick={downloadHistoryTemplateCsv}>
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
                            <Label className="text-lg font-pixel">문항 목록 ({questions.length})</Label>
                            <Button type="button" variant="outline" onClick={addQuestion}>
                                <Plus className="w-4 h-4 mr-1" /> 문항 추가
                            </Button>
                        </div>

                        {questions.map((question, questionIndex) => (
                            <div key={`history-row-${questionIndex}`} className="border-2 border-black rounded-lg p-3 bg-white space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 flex-1">
                                        <Select
                                            value={question.type}
                                            onValueChange={(value) => {
                                                const nextType = value as QuestionType;
                                                updateQuestion(questionIndex, {
                                                    type: nextType,
                                                    answer: nextType === "multiple-choice" ? 0 : "",
                                                    options: [...EMPTY_OPTIONS],
                                                });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="multiple-choice">객관식 4지선다</SelectItem>
                                                <SelectItem value="short-answer">주관식</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Input
                                            placeholder="문제 텍스트"
                                            value={question.text}
                                            onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled={questions.length <= 1}
                                        onClick={() => removeQuestion(questionIndex)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {question.type === "multiple-choice" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {question.options.map((option, optionIndex) => (
                                            <div key={`${questionIndex}-${optionIndex}`} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={Number(question.answer) === optionIndex}
                                                    onCheckedChange={() => updateQuestion(questionIndex, { answer: optionIndex })}
                                                />
                                                <Input
                                                    placeholder={`보기 ${optionIndex + 1}`}
                                                    value={option}
                                                    onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        placeholder="주관식 정답"
                                        value={String(question.answer || "")}
                                        onChange={(event) => updateQuestion(questionIndex, { answer: event.target.value })}
                                        required
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <Button type="submit" className="w-full h-12 border-2 border-black" disabled={loading}>
                        {loading ? "저장 중..." : "문제세트 저장"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
