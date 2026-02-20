"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export function ClassSettingsModal() {
    const [open, setOpen] = useState(false);
    const [className, setClassName] = useState("5학년 2반");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Class settings updated:", className);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">설정</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader>
                    <DialogTitle className="font-pixel text-2xl">학급 설정</DialogTitle>
                    <DialogDescription>
                        학급 이름과 설정을 변경합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="className" className="text-right font-bold">
                                학급명
                            </Label>
                            <Input
                                id="className"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                className="col-span-3 border-2 border-black"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="bg-[#00b894] hover:bg-[#00a885] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all">
                            저장
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
