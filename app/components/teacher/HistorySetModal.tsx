"use client";

import { useState } from "react";
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
import { createQuestionSet } from "@/app/actions/game-data";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function HistorySetModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [grade, setGrade] = useState("");
    const [classNum, setClassNum] = useState("");

    // Define a type for our question state
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
        // Use type assertion carefully or restructuring
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
            // Prepare the data based on type
            // For Multiple Choice: answer is index (number)
            // For Short Answer: answer is text (string)

            return {
                question_text: q.text,
                type: q.type,
                options: q.type === "multiple-choice" ? q.options : null,
                correct_answer: q.type === "multiple-choice" ? Number(q.answer) : null,
                answer_text: q.type === "short-answer" ? String(q.answer) : null,
            };
        });

        const res = await createQuestionSet(
            "history-quiz",
            title,
            parseInt(grade),
            parseInt(classNum),
            questionsData
        );

        setLoading(false);
        if (res.success) {
            setOpen(false);
            setTitle("");
            setQuestions([{ text: "", type: "multiple-choice", options: ["", "", "", ""], answer: 0 }]);
            // Refresh
            window.location.reload();
        } else {
            alert("Error creating set: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>역사 퀴즈 세트 만들기 (History Quiz)</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Label>학년</Label>
                            <Input
                                type="number"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <Label>반</Label>
                            <Input
                                type="number"
                                value={classNum}
                                onChange={(e) => setClassNum(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-span-3">
                            <Label>세트 제목</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: 조선의 건국"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-6 border-t pt-4">
                        {questions.map((q, idx) => (
                            <div key={idx} className="p-4 border rounded bg-gray-50 relative">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-red-500"
                                    onClick={() => removeQuestion(idx)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <div className="flex gap-4 mb-2 items-center">
                                    <span className="font-bold">Q{idx + 1}</span>
                                    <Select
                                        value={q.type}
                                        onValueChange={(val) => updateQuestion(idx, "type", val as "multiple-choice" | "short-answer")}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="유형 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="multiple-choice">4지선다형</SelectItem>
                                            <SelectItem value="short-answer">단답형</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Input
                                    placeholder="문제 내용을 입력하세요"
                                    value={q.text}
                                    onChange={(e) => updateQuestion(idx, "text", e.target.value)}
                                    className="mb-2"
                                    required
                                />

                                {q.type === "multiple-choice" && (
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label className="text-xs text-gray-500 mb-1">정답에 체크하세요</Label>
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={q.answer === oIdx}
                                                    onCheckedChange={() =>
                                                        updateQuestion(idx, "answer", oIdx)
                                                    }
                                                />
                                                <span className="w-6 text-center text-sm font-bold">{oIdx + 1}</span>
                                                <Input
                                                    placeholder={`보기 ${oIdx + 1}`}
                                                    value={opt}
                                                    onChange={(e) =>
                                                        updateOption(idx, oIdx, e.target.value)
                                                    }
                                                    required
                                                    className="flex-1"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.type === "short-answer" && (
                                    <div>
                                        <Label>정답</Label>
                                        <Input
                                            placeholder="정답 입력"
                                            value={q.answer as string}
                                            onChange={(e) =>
                                                updateQuestion(idx, "answer", e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addQuestion}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" /> 문제 추가
                        </Button>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "저장 중..." : "세트 저장"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
