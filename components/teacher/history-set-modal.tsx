"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createQuestionSet, updateQuestionSet, getQuestions } from "@/app/actions/game-data";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function HistorySetModal({
    children,
    gameId = "history-quiz",
    gameTitle = "역사 퀴즈",
    teacherProfile,
    setId,
    initialTitle = ""
}: {
    children: React.ReactNode,
    gameId?: string,
    gameTitle?: string,
    teacherProfile?: any,
    setId?: string,
    initialTitle?: string
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const [grade, setGrade] = useState(teacherProfile?.grade?.toString() || "");
    const [classNum, setClassNum] = useState(teacherProfile?.class?.toString() || "");

    type QuestionState = {
        text: string;
        type: "multiple-choice" | "short-answer";
        options: string[];
        answer: string | number;
    };

    const [questions, setQuestions] = useState<QuestionState[]>([
        { text: "", type: "multiple-choice", options: ["", "", "", ""], answer: 0 }
    ]);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        if (open && setId) {
            const loadData = async () => {
                setLoading(true);
                try {
                    const data = await getQuestions(setId);
                    if (data && data.length > 0) {
                        const formatted: QuestionState[] = data.map((q: any) => {
                            let parsedOptions = ["", "", "", ""];
                            if (q.options) {
                                if (typeof q.options === 'string') {
                                    try {
                                        parsedOptions = JSON.parse(q.options);
                                    } catch (e) {
                                        console.error("Failed to parse options string:", q.options);
                                    }
                                } else if (Array.isArray(q.options)) {
                                    parsedOptions = q.options;
                                }
                            }

                            return {
                                text: q.question_text || "",
                                type: (q.type as any) || "multiple-choice",
                                options: parsedOptions,
                                answer: q.type === "multiple-choice" ? (q.correct_answer ?? 0) : (q.answer_text ?? "")
                            };
                        });
                        setQuestions(formatted);
                    }
                } catch (e) {
                    console.error("Failed to load questions:", e);
                    toast.error("문제 정보를 불러오는 데 실패했습니다.");
                }
                setLoading(false);
            };
            loadData();
        }
    }, [open, setId]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                text: "",
                type: "multiple-choice",
                options: ["", "", "", ""],
                answer: 0,
            },
        ]);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const updateQuestion = (index: number, field: keyof QuestionState, value: any) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const questionsData = questions.map((q) => {
            return {
                question_text: q.text,
                type: q.type,
                options: q.type === "multiple-choice" ? q.options : null,
                correct_answer: q.type === "multiple-choice" ? Number(q.answer) : null,
                answer_text: q.type === "short-answer" ? String(q.answer) : null,
            };
        });

        let res;
        if (setId) {
            res = await updateQuestionSet(
                setId,
                title,
                parseInt(grade),
                parseInt(classNum),
                questionsData
            );
        } else {
            res = await createQuestionSet(
                gameId,
                title,
                parseInt(grade),
                parseInt(classNum),
                questionsData
            );
        }

        setLoading(false);
        if (res.success) {
            setOpen(false);
            if (!setId) {
                setTitle("");
                setQuestions([{ text: "", type: "multiple-choice", options: ["", "", "", ""], answer: 0 }]);
            }
            toast.success(setId ? "퀴즈 세트가 수정되었습니다." : "새 퀴즈 세트가 생성되었습니다.");
            router.refresh();
        } else {
            toast.error("Error: " + (res as any).error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-0 sm:rounded-xl">
                <DialogHeader className="bg-[#ff2e63] p-6 border-b-4 border-black">
                    <DialogTitle className="font-pixel text-2xl text-white flex items-center gap-2">
                        <span className="bg-black/20 p-2 rounded-lg backdrop-blur-sm">📝</span>
                        {gameTitle} 세트 {setId ? "수정하기" : "만들기"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border-3 border-gray-200">
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">학년 / 반</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#ff2e63] font-bold text-lg placeholder:text-gray-300 read-only:bg-gray-100 read-only:text-gray-500"
                                        placeholder="학년"
                                        required
                                        readOnly={!!teacherProfile?.grade}
                                    />
                                    <span className="absolute right-3 top-3 text-gray-400 font-medium text-xs pointer-events-none">학년</span>
                                </div>
                                <div className="relative flex-1">
                                    <Input
                                        type="number"
                                        value={classNum}
                                        onChange={(e) => setClassNum(e.target.value)}
                                        className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#ff2e63] font-bold text-lg placeholder:text-gray-300 read-only:bg-gray-100 read-only:text-gray-500"
                                        placeholder="반"
                                        required
                                        readOnly={!!teacherProfile?.class}
                                    />
                                    <span className="absolute right-3 top-3 text-gray-400 font-medium text-xs pointer-events-none">반</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-gray-700">세트 제목</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="예: 조선의 건국과 발전"
                                className="h-12 border-3 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] focus-visible:ring-0 focus-visible:border-[#ff2e63] font-bold text-lg placeholder:font-normal placeholder:opacity-60"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-pixel text-lg text-gray-800 border-b-4 border-[#ff2e63] inline-block pb-1">
                                문제 목록 ({questions.length})
                            </h3>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addQuestion}
                                className="border-3 border-black shadow-[4px_4px_0_0_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all hover:bg-yellow-100 font-bold"
                            >
                                <Plus className="h-5 w-5 mr-2" /> 문제 추가
                            </Button>
                        </div>

                        {questions.map((q, idx) => (
                            <div key={idx} className="relative p-6 border-3 border-black rounded-xl bg-white shadow-[6px_6px_0_0_rgba(0,0,0,0.1)] group transition-all hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.2)]">
                                <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#ff2e63] border-3 border-black rounded-full flex items-center justify-center text-white font-pixel shadow-[2px_2px_0_0_black] z-10">
                                    {idx + 1}
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                    onClick={() => removeQuestion(idx)}
                                >
                                    <X className="h-6 w-6" />
                                </Button>

                                <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                                        <Select
                                            value={q.type}
                                            onValueChange={(val) => updateQuestion(idx, "type", val as "multiple-choice" | "short-answer")}
                                        >
                                            <SelectTrigger className="h-12 border-3 border-black font-bold">
                                                <SelectValue placeholder="유형 선택" />
                                            </SelectTrigger>
                                            <SelectContent className="border-3 border-black font-bold">
                                                <SelectItem value="multiple-choice">4지선다형</SelectItem>
                                                <SelectItem value="short-answer">단답형</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            placeholder="문제 내용을 입력하세요 (예: 조선을 건국한 왕은?)"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                                            className="h-12 border-3 border-black font-bold text-lg focus-visible:ring-0 focus-visible:border-[#3b82f6] placeholder:font-normal placeholder:opacity-60"
                                            required
                                        />
                                    </div>

                                    {q.type === "multiple-choice" && (
                                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 grid gap-3">
                                            <Label className="text-xs text-gray-500 font-bold flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                정답 항목의 체크박스를 선택하세요
                                            </Label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`flex items-center gap-2 p-2 rounded border-2 transition-all ${q.answer === oIdx ? 'border-green-500 bg-green-50' : 'border-transparent'}`}>
                                                        <Checkbox
                                                            checked={q.answer === oIdx}
                                                            onCheckedChange={() => updateQuestion(idx, "answer", oIdx)}
                                                            className="w-6 h-6 border-2 border-black data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
                                                        />
                                                        <Input
                                                            placeholder={`보기 ${oIdx + 1}`}
                                                            value={opt}
                                                            onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                                            required
                                                            className="flex-1 h-10 border-2 border-gray-300 focus:border-black font-medium placeholder:text-gray-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {q.type === "short-answer" && (
                                        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                            <Label className="text-blue-700 font-bold mb-2 block">정답 키워드</Label>
                                            <Input
                                                placeholder="정답을 입력하세요 (예: 이성계)"
                                                value={q.answer as string}
                                                onChange={(e) => updateQuestion(idx, "answer", e.target.value)}
                                                required
                                                className="border-2 border-blue-300 focus:border-blue-600 font-bold text-blue-900 placeholder:font-normal placeholder:opacity-60"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t-2 border-gray-100">
                        <Button
                            type="submit"
                            className="w-full h-14 bg-[#2d3436] hover:bg-black text-white font-pixel text-xl border-4 border-black shadow-[6px_6px_0_0_#00b894] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="animate-pulse">저장 중...</span>
                            ) : (
                                "세트 저장하고 완료하기"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
