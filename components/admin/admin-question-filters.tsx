"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function AdminQuestionFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentGrade = searchParams.get("grade") || "all";
    const currentClass = searchParams.get("class") || "";

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex gap-4 items-center">
            <div className="flex gap-2">
                <Select value={currentGrade} onValueChange={(val) => handleFilterChange("grade", val)}>
                    <SelectTrigger className="w-[120px] bg-white border-2 border-black font-bold">
                        <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black">
                        <SelectItem value="all">전체 학년</SelectItem>
                        <SelectItem value="global">공통(Global)</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                            <SelectItem key={g} value={String(g)}>{g}학년</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="number"
                    placeholder="반 검색"
                    value={currentClass}
                    onChange={(e) => handleFilterChange("class", e.target.value)}
                    className="w-[100px] border-2 border-black"
                />
            </div>
        </div>
    );
}
