"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuestionSet, getQuestions, updateQuestionSet } from "@/app/actions/game-data";
import { downloadWordChainTemplateCsv, parseWordChainCsvFile } from "./question-csv-utils";

type TeacherProfile = {
    grade?: number | null;
    class?: number | null;
} | null | undefined;

type WordChainQuestion = {
    prompt: string;
    answer: string;
    acceptedAnswers: string[];
};

type WordChainQuestionRow = {
    prompt: string | null;
    answer: string | null;
    accepted_answers: unknown;
};

function parseNumericInput(value: string) {
    if (!value || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeAcceptedAnswers(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
            }
        } catch {
            return value
                .split(value.includes("|") ? "|" : ",")
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    return [];
}

export function WordChainSetModal({
    children,
    gameId = "word-chain",
    gameTitle = "단어 연결",
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
    const [questions, setQuestions] = useState<WordChainQuestion[]>([
        { prompt: "", answer: "", acceptedAnswers: [] },
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
                const data = (await getQuestions(setId)) as WordChainQuestionRow[];
                if (data.length === 0) {
                    setQuestions([{ prompt: "", answer: "", acceptedAnswers: [] }]);
                    return;
                }

                const parsed = data.map((row) => ({
                    prompt: row.prompt || "",
                    answer: row.answer || "",
                    acceptedAnswers: normalizeAcceptedAnswers(row.accepted_answers),
                }));

                setQuestions(parsed);
            } finally {
                setLoading(false);
            }
        };

        void loadQuestions();
    }, [open, setId]);

    const addQuestion = () => {
        setQuestions((prev) => [...prev, { prompt: "", answer: "", acceptedAnswers: [] }]);
    };

    const removeQuestion = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuestion = (index: number, patch: Partial<WordChainQuestion>) => {
        setQuestions((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imported = await parseWordChainCsvFile(file);
            setQuestions(
                imported.map((row) => ({
                    prompt: row.prompt,
                    answer: row.answer,
                    acceptedAnswers: row.acceptedAnswers,
                }))
            );
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
            alert("학년/반을 올바르게 서식에 맞춰 입력해주세요. (글로벌은 빈칸)");
            return;
        }

        if ((parsedGrade === null && parsedClass !== null) || (parsedGrade !== null && parsedClass === null)) {
            alert("학년/반은 모두 입력하거나 모두 빈칸이어야 합니다.");
            return;
        }

        for (let i = 0; i < questions.length; i += 1) {
            const question = questions[i];
            if (!question.prompt.trim() || !question.answer.trim()) {
                alert(`${i + 1}번 문항의 제시어와 정답을 입력해주세요.`);
                return;
            }
        }

        setLoading(true);

        const payload = questions.map((question) => ({
            prompt: question.prompt.trim(),
            answer: question.answer.trim(),
            accepted_answers: question.acceptedAnswers.map((item) => item.trim()).filter(Boolean),
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
            setQuestions([{ prompt: "", answer: "", acceptedAnswers: [] }]);
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
                <DialogHeader className="bg-[#55efc4] p-6 border-b-4 border-black">
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
                                placeholder="예: 단어 연결 초급 세트"
                                required
                            />
                        </div>
                    </div>

                    <div className="rounded-xl border-2 border-black p-4 bg-[#e8f8f5] space-y-3">
                        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                            <p className="text-sm font-bold">CSV 업로드 (예시 양식 참고)</p>
                            <Button type="button" variant="outline" onClick={downloadWordChainTemplateCsv} className="border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold">
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
                            <Button type="button" variant="outline" onClick={addQuestion} className="border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] font-bold">
                                <Plus className="w-4 h-4 mr-1" /> 문항 추가
                            </Button>
                        </div>

                        {questions.map((question, index) => (
                            <div key={`word-chain-row-${index}`} className="border-2 border-black rounded-lg p-3 bg-white space-y-2">
                                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                    <Input
                                        placeholder="제시어"
                                        value={question.prompt}
                                        onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                                        required
                                    />
                                    <Input
                                        placeholder="정답"
                                        value={question.answer}
                                        onChange={(event) => updateQuestion(index, { answer: event.target.value })}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={questions.length <= 1}
                                        onClick={() => removeQuestion(index)}
                                        className="hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Input
                                    placeholder="유사 정답 (| 또는 , 로 구분)"
                                    value={question.acceptedAnswers.join("|")}
                                    onChange={(event) => {
                                        const raw = event.target.value;
                                        const delimiter = raw.includes("|") ? "|" : ",";
                                        const acceptedAnswers = raw
                                            .split(delimiter)
                                            .map((item) => item.trim())
                                            .filter(Boolean);
                                        updateQuestion(index, { acceptedAnswers });
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <Button type="submit" className="w-full h-14 border-4 border-black bg-blue-500 hover:bg-blue-600 text-white font-pixel text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_rgba(0,0,0,1)]" disabled={loading}>
                        {loading ? "저장 중..." : "문제세트 저장"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
