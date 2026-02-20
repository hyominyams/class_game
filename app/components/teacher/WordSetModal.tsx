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

export function WordSetModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [grade, setGrade] = useState("");
    const [classNum, setClassNum] = useState("");
    const [words, setWords] = useState<{ english: string; korean: string }[]>([
        { english: "", korean: "" },
    ]);
    const [loading, setLoading] = useState(false);

    const addWord = () => {
        setWords([...words, { english: "", korean: "" }]);
    };

    const removeWord = (index: number) => {
        const newWords = [...words];
        newWords.splice(index, 1);
        setWords(newWords);
    };

    const updateWord = (
        index: number,
        field: "english" | "korean",
        value: string
    ) => {
        const newWords = [...words];
        newWords[index][field] = value;
        setWords(newWords);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const questionsData = words.map((w) => ({
            question_text: w.korean, // Show Korean
            answer_text: w.english, // Expect English (or used for options)
            options: [w.english], // Just storing the answer in options for now or could generate distractors later
            type: "word-pair",
            correct_answer: 0,
        }));

        const res = await createQuestionSet(
            "word-runner",
            title,
            parseInt(grade),
            parseInt(classNum),
            questionsData
        );

        setLoading(false);
        if (res.success) {
            setOpen(false);
            setTitle("");
            setWords([{ english: "", korean: "" }]);
            // Ideally refresh the page or list
            window.location.reload();
        } else {
            alert("Error creating set: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>영단어 세트 만들기 (Word Runner)</DialogTitle>
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
                                placeholder="Ex: 5과 필수 영단어"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>단어 목록 (영어 - 한글)</Label>
                        {words.map((word, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-sm w-6">{idx + 1}</span>
                                <Input
                                    placeholder="English"
                                    value={word.english}
                                    onChange={(e) => updateWord(idx, "english", e.target.value)}
                                    required
                                />
                                <Input
                                    placeholder="한국어 뜻"
                                    value={word.korean}
                                    onChange={(e) => updateWord(idx, "korean", e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeWord(idx)}
                                    disabled={words.length === 1}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addWord}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" /> 단어 추가
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
