'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStudentCoin, deleteStudentAccount } from './student-actions';
// import { toast } from 'sonner';

type Student = {
    id: string;
    nickname: string;
    login_id: string;
    coin_balance: number;
    created_at: string;
};

export function StudentList({ students }: { students: Student[] }) {
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [coinAmount, setCoinAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isGrantOpen, setIsGrantOpen] = useState(false);
    const [isRevokeOpen, setIsRevokeOpen] = useState(false);

    const handleCoinAction = async (type: 'grant' | 'revoke') => {
        if (!selectedStudent || !coinAmount) return;
        const amount = parseInt(coinAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('유효한 금액을 입력해주세요.');
            return;
        }

        const finalAmount = type === 'grant' ? amount : -amount;
        const result = await updateStudentCoin(selectedStudent.id, finalAmount, reason || (type === 'grant' ? '관리자 지급' : '관리자 회수'));

        if (result.success) {
            alert(result.message || '처리되었습니다.');
            setIsGrantOpen(false);
            setIsRevokeOpen(false);
            setCoinAmount('');
            setReason('');
        } else {
            alert(result.error || '오류가 발생했습니다.');
        }
    };

    const handleDelete = async (student: Student) => {
        if (!confirm(`정말 ${student.nickname} 학생의 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        const result = await deleteStudentAccount(student.id);
        if (result.success) {
            alert('계정이 삭제되었습니다.');
        } else {
            alert(result.error || '삭제 실패');
        }
    };

    return (
        <div className="bg-white border-2 border-black rounded p-4">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="p-2">이름</th>
                        <th className="p-2">ID</th>
                        <th className="p-2">코인</th>
                        <th className="p-2">가입일</th>
                        <th className="p-2 text-right">관리</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student) => (
                        <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="p-2 font-bold">{student.nickname}</td>
                            <td className="p-2 text-gray-500">{student.login_id}</td>
                            <td className="p-2 text-yellow-600 font-bold">{student.coin_balance.toLocaleString()}</td>
                            <td className="p-2 text-sm text-gray-400">{new Date(student.created_at).toLocaleDateString()}</td>
                            <td className="p-2 text-right space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                    onClick={() => { setSelectedStudent(student); setIsGrantOpen(true); }}
                                >
                                    지급
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500 text-red-600 hover:bg-red-50"
                                    onClick={() => { setSelectedStudent(student); setIsRevokeOpen(true); }}
                                >
                                    회수
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(student)}
                                >
                                    삭제
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Grant Modal */}
            <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>코인 지급 ({selectedStudent?.nickname})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>지급할 코인 수량</Label>
                            <Input
                                type="number"
                                placeholder="ex) 100"
                                value={coinAmount}
                                onChange={(e) => setCoinAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>사유 (선택)</Label>
                            <Input
                                placeholder="ex) 이벤트 보상"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <Button onClick={() => handleCoinAction('grant')} className="w-full">지급하기</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Revoke Modal */}
            <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>코인 회수 ({selectedStudent?.nickname})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>회수할 코인 수량</Label>
                            <Input
                                type="number"
                                placeholder="ex) 50"
                                value={coinAmount}
                                onChange={(e) => setCoinAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>사유 (선택)</Label>
                            <Input
                                placeholder="ex) 오지급 회수"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <Button variant="destructive" onClick={() => handleCoinAction('revoke')} className="w-full">회수하기</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
