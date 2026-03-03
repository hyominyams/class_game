-- Area D monitoring queries (2026-02-28)
-- Run after migrations are applied.

-- 1) Active question set singleton violations (CLASS scope)
SELECT
    game_id,
    grade,
    class,
    COUNT(*) AS active_count
FROM public.question_sets
WHERE is_active IS TRUE
  AND grade IS NOT NULL
  AND class IS NOT NULL
GROUP BY game_id, grade, class
HAVING COUNT(*) > 1;

-- 2) Active question set singleton violations (GLOBAL scope)
SELECT
    game_id,
    COUNT(*) AS active_count
FROM public.question_sets
WHERE is_active IS TRUE
  AND grade IS NULL
  AND class IS NULL
GROUP BY game_id
HAVING COUNT(*) > 1;

-- 3) Negative play_time violations (should be zero)
SELECT COUNT(*) AS negative_game_log_play_time
FROM public.game_logs
WHERE play_time < 0;

SELECT COUNT(*) AS negative_tournament_log_play_time
FROM public.tournament_logs
WHERE play_time < 0;

-- 4) Coin balance vs ledger mismatch count
WITH ledger AS (
    SELECT
        user_id,
        COALESCE(SUM(amount), 0) AS ledger_balance
    FROM public.coin_transactions
    GROUP BY user_id
)
SELECT COUNT(*) AS mismatch_count
FROM public.profiles p
LEFT JOIN ledger l
    ON p.id = l.user_id
WHERE COALESCE(p.coin_balance, 0) <> COALESCE(l.ledger_balance, 0);
