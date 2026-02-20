'use client';

import { useState } from "react";
import { WeeklySettlementResult } from "@/app/actions/weekly-settlement";
import { WeeklyRewardModal } from "./weekly-reward-modal";

export function WeeklyRewardModalWrapper({ result }: { result: WeeklySettlementResult }) {
    const [open, setOpen] = useState(!!result.settled);

    return (
        <WeeklyRewardModal
            result={result}
            open={open}
            onClose={() => setOpen(false)}
        />
    );
}
