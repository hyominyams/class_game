-- Reconcile profile coin_balance cache from coin transaction ledger.

WITH ledger AS (
    SELECT user_id, COALESCE(SUM(amount), 0)::int AS ledger_balance
    FROM public.coin_transactions
    GROUP BY user_id
),
target AS (
    SELECT
        p.id AS user_id,
        COALESCE(l.ledger_balance, 0) AS expected_balance,
        COALESCE(p.coin_balance, 0)::int AS current_balance
    FROM public.profiles p
    LEFT JOIN ledger l ON l.user_id = p.id
)
UPDATE public.profiles p
SET coin_balance = t.expected_balance
FROM target t
WHERE p.id = t.user_id
  AND COALESCE(p.coin_balance, 0)::int <> t.expected_balance;
