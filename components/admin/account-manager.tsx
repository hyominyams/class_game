"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAccounts, deleteAccount, bulkCreateAccounts, BulkUserRow } from "@/app/admin/accounts/actions";
import { Trash2, Download, Upload, Users, GraduationCap } from "lucide-react";
import { AddAccountModal } from "./add-account-modal";

export function AccountManager() {
    const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
    const [gradeFilter, setGradeFilter] = useState<number | ''>('');
    const [classFilter, setClassFilter] = useState<number | ''>('');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadAccounts = async () => {
        setIsLoading(true);
        try {
            const data = await getAccounts(
                activeTab,
                gradeFilter ? Number(gradeFilter) : undefined,
                classFilter ? Number(classFilter) : undefined
            );
            setAccounts(data || []);
        } catch (error) {
            console.error("Failed to load accounts:", error);
            toast.error("계정 목록을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [activeTab, gradeFilter, classFilter]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`정말 ${name} 계정을 삭제하시겠습니까? 관련 데이터가 모두 삭제될 수 있습니다.`)) return;

        setIsDeleting(id);
        try {
            const res = await deleteAccount(id);
            if (res.success) {
                toast.success(`${name} 계정이 삭제되었습니다.`);
                loadAccounts();
            } else {
                toast.error(res.error || "삭제 실패");
            }
        } catch (error) {
            console.error(error);
            toast.error("오류가 발생했습니다.");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleDownloadTemplate = () => {
        const header = "학년,반,이름,로그인아이디,비밀번호(선택)\n";
        const sampleLine = "5,1,홍길동,teacher_5_1_hong,a123456789\n";
        const blob = new Blob(["\uFEFF" + header + sampleLine], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${activeTab === 'teacher' ? '교사' : '학생'}_일괄등록_양식.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple CSV parser
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length <= 1) {
                toast.error("데이터가 없거나 잘못된 양식입니다.");
                return;
            }

            const parsedUsers: BulkUserRow[] = [];
            let rowNumber = 1;

            for (let i = 1; i < lines.length; i++) {
                rowNumber++;
                const line = lines[i];
                // basic comma split, doesn't handle commas inside quotes for simplicity
                const [grade, classNum, nickname, loginId, password] = line.split(',').map(s => s.trim());

                if (!grade || !classNum || !nickname || !loginId) {
                    toast.error(`${rowNumber}번째 줄 데이터 형식이 누락되었습니다.`);
                    continue; // Skip invalid rows or you could abort
                }

                parsedUsers.push({
                    role: activeTab,
                    grade: parseInt(grade),
                    classNum: parseInt(classNum),
                    nickname,
                    loginId,
                    password: password || undefined
                });
            }

            if (parsedUsers.length === 0) {
                toast.error("업로드할 유효한 데이터가 없습니다.");
                return;
            }

            if (!confirm(`총 ${parsedUsers.length}명의 ${activeTab === 'teacher' ? '교사' : '학생'} 계정을 생성하시겠습니까?`)) {
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            setIsLoading(true);
            try {
                const res = await bulkCreateAccounts(parsedUsers);
                if (res.success) {
                    if (res.results?.failures && res.results.failures.length > 0) {
                        toast.warning(`${res.results.successCount}명 성공, ${res.results.failures.length}명 실패`, {
                            description: `실패: ${res.results.failures.map(f => f.loginId).join(', ')}`
                        });
                    } else {
                        toast.success(`총 ${res.results?.successCount || 0}개 계정이 일괄 등록되었습니다!`);
                    }
                    loadAccounts();
                } else {
                    toast.error("일괄 등록 중 오류가 발생했습니다.");
                }
            } catch (err) {
                console.error(err);
                toast.error("알 수 없는 오류가 발생했습니다.");
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file, "utf-8"); // Using utf-8 by default (the BOM helps for EXCEL generated CSVs too)
    };

    return (
        <div className="bg-white p-6 border-2 border-black rounded shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {/* Tabs */}
            <div className="flex border-b-2 border-black mb-6">
                <button
                    onClick={() => setActiveTab('teacher')}
                    className={`flex-1 py-3 px-4 font-bold text-lg border-b-4 ${activeTab === 'teacher' ? 'border-[#6c5ce7] text-[#6c5ce7]' : 'border-transparent text-gray-500 hover:text-black'} transition-colors flex justify-center items-center gap-2`}
                >
                    <GraduationCap className="w-5 h-5" />
                    교사 계정
                </button>
                <button
                    onClick={() => setActiveTab('student')}
                    className={`flex-1 py-3 px-4 font-bold text-lg border-b-4 ${activeTab === 'student' ? 'border-[#00b894] text-[#00b894]' : 'border-transparent text-gray-500 hover:text-black'} transition-colors flex justify-center items-center gap-2`}
                >
                    <Users className="w-5 h-5" />
                    학생 계정
                </button>
            </div>

            {/* Controls & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex gap-4">
                    <div className="w-24">
                        <Label htmlFor="grade" className="text-xs font-bold text-gray-600 block mb-1">학년</Label>
                        <select
                            id="grade"
                            value={gradeFilter !== null ? String(gradeFilter) : ''}
                            onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : '')}
                            className="w-full border-2 border-black p-2 rounded cursor-pointer"
                        >
                            <option value="">전체</option>
                            {[1, 2, 3, 4, 5, 6].map(g => (
                                <option key={g} value={g}>{g}학년</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-24">
                        <Label htmlFor="class" className="text-xs font-bold text-gray-600 block mb-1">반</Label>
                        <Input
                            id="class"
                            type="number"
                            placeholder="전체"
                            value={classFilter !== null ? String(classFilter) : ''}
                            onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : '')}
                            className="border-2 border-black w-full"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDownloadTemplate}
                        className="border-2 border-black shadow-[2px_2px_0_0_black] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        CSV 양식 다운로드
                    </Button>

                    <div>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#2d3436] text-white border-2 border-black shadow-[2px_2px_0_0_black] hover:bg-[#636e72] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none transition-all active:shadow-none active:translate-y-[2px] active:translate-x-[2px]"
                                disabled={isLoading}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                합계 일괄 업로드
                            </Button>

                            <AddAccountModal role={activeTab} onSuccess={loadAccounts} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="border-2 border-black rounded overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="bg-gray-100 border-b-2 border-black">
                        <tr>
                            <th className="p-3 font-bold border-r border-gray-300">소속</th>
                            <th className="p-3 font-bold border-r border-gray-300">이름 (닉네임)</th>
                            <th className="p-3 font-bold border-r border-gray-300">로그인 아이디</th>
                            <th className="p-3 font-bold text-center w-[100px]">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 font-bold">
                                    데이터 불러오는 중...
                                </td>
                            </tr>
                        ) : accounts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 border-t border-gray-200">
                                    등록된 {activeTab === 'teacher' ? '교사' : '학생'} 계정이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            accounts.map((acc, idx) => (
                                <tr key={acc.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-r border-gray-200 font-medium">
                                        {acc.grade}학년 {acc.class}반
                                    </td>
                                    <td className="p-3 border-r border-gray-200 font-bold">
                                        {acc.nickname || '-'}
                                    </td>
                                    <td className="p-3 border-r border-gray-200 font-mono text-sm text-gray-600">
                                        {acc.username || acc.id}
                                    </td>
                                    <td className="p-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(acc.id, acc.nickname || acc.username)}
                                            disabled={isDeleting === acc.id}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
