-- Area D / Cross-phase support
-- P4-1: purchase_item_atomic(...)
-- P5-2: tournament 3-attempt server/DB hardening

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tournament_participants'
          AND column_name = 'attempts_used'
    ) THEN
        UPDATE public.tournament_participants
        SET attempts_used = LEAST(3, GREATEST(0, COALESCE(attempts_used, 0))),
            best_score = GREATEST(0, COALESCE(best_score, 0));

        ALTER TABLE public.tournament_participants
        ALTER COLUMN attempts_used SET DEFAULT 0;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'tournament_participants_attempts_used_range'
              AND conrelid = 'public.tournament_participants'::regclass
        ) THEN
            ALTER TABLE public.tournament_participants
            ADD CONSTRAINT tournament_participants_attempts_used_range
            CHECK (attempts_used >= 0 AND attempts_used <= 3);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'tournament_participants_best_score_non_negative'
              AND conrelid = 'public.tournament_participants'::regclass
        ) THEN
            ALTER TABLE public.tournament_participants
            ADD CONSTRAINT tournament_participants_best_score_non_negative
            CHECK (best_score IS NULL OR best_score >= 0);
        END IF;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.purchase_item_atomic(
    p_user_id UUID,
    p_item_id TEXT,
    p_item_name TEXT DEFAULT NULL,
    p_price INTEGER DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance INTEGER,
    item_id TEXT,
    quantity INTEGER,
    error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_requested_by UUID := auth.uid();
    v_is_service_actor BOOLEAN := current_user IN ('service_role', 'postgres', 'supabase_admin');
    v_catalog_price INTEGER;
    v_effective_item_name TEXT;
    v_balance INTEGER;
    v_new_balance INTEGER;
    v_quantity INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, 'USER_ID_REQUIRED';
        RETURN;
    END IF;

    IF p_item_id IS NULL OR btrim(p_item_id) = '' THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, 'ITEM_ID_REQUIRED';
        RETURN;
    END IF;

    IF NOT v_is_service_actor AND v_requested_by IS DISTINCT FROM p_user_id THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, 'FORBIDDEN';
        RETURN;
    END IF;

    v_catalog_price := CASE p_item_id
        WHEN 'item_role_change' THEN 350
        WHEN 'item_lunch_priority' THEN 650
        WHEN 'item_snack' THEN 900
        WHEN 'item_cleaning_exemption' THEN 1200
        WHEN 'item_free_time' THEN 2500
        WHEN 'item_group_selection' THEN 3000
        ELSE NULL
    END;

    IF v_catalog_price IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, 'INVALID_ITEM';
        RETURN;
    END IF;

    v_effective_item_name := COALESCE(NULLIF(p_item_name, ''), p_item_id);

    SELECT coin_balance
    INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, 'PROFILE_NOT_FOUND';
        RETURN;
    END IF;

    v_balance := COALESCE(v_balance, 0);
    IF v_balance < v_catalog_price THEN
        RETURN QUERY SELECT FALSE, v_balance, p_item_id, 0, 'INSUFFICIENT_BALANCE';
        RETURN;
    END IF;

    UPDATE public.profiles
    SET coin_balance = v_balance - v_catalog_price
    WHERE id = p_user_id
    RETURNING coin_balance INTO v_new_balance;

    INSERT INTO public.coin_transactions (user_id, amount, reason, type)
    VALUES (p_user_id, -v_catalog_price, 'PURCHASE:' || p_item_id, 'purchase');

    INSERT INTO public.student_items (user_id, item_id, item_name, quantity)
    VALUES (p_user_id, p_item_id, v_effective_item_name, 1)
    ON CONFLICT (user_id, item_id)
    DO UPDATE SET
        quantity = public.student_items.quantity + 1,
        item_name = EXCLUDED.item_name
    RETURNING public.student_items.quantity INTO v_quantity;

    RETURN QUERY SELECT TRUE, v_new_balance, p_item_id, COALESCE(v_quantity, 1), NULL::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, p_item_id, 0, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_item_atomic(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_item_atomic(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item_atomic(UUID, TEXT, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.purchase_item_atomic(UUID, TEXT, TEXT, INTEGER) IS
'Atomic store purchase. Ignores client price and uses server-side catalog price by item_id.';

CREATE OR REPLACE FUNCTION public.record_tournament_attempt_atomic(
    p_tournament_id UUID,
    p_score INTEGER,
    p_play_time INTEGER DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    attempts_used INTEGER,
    attempts_left INTEGER,
    best_score INTEGER,
    error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile_role public.user_role;
    v_profile_grade INTEGER;
    v_profile_class INTEGER;
    v_tournament_grade INTEGER;
    v_tournament_class INTEGER;
    v_tournament_start TIMESTAMPTZ;
    v_tournament_end TIMESTAMPTZ;
    v_tournament_active BOOLEAN;
    v_now TIMESTAMPTZ := now();
    v_score INTEGER := GREATEST(COALESCE(p_score, 0), 0);
    v_play_time INTEGER := CASE
        WHEN p_play_time IS NULL THEN NULL
        ELSE GREATEST(p_play_time, 0)
    END;
    v_attempts_used INTEGER;
    v_best_score INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'AUTH_REQUIRED';
        RETURN;
    END IF;

    SELECT role, grade, class
    INTO v_profile_role, v_profile_grade, v_profile_class
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_profile_role IS DISTINCT FROM 'student'::public.user_role THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'ONLY_STUDENT_ALLOWED';
        RETURN;
    END IF;

    SELECT grade, class, start_time, end_time, is_active
    INTO v_tournament_grade, v_tournament_class, v_tournament_start, v_tournament_end, v_tournament_active
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_NOT_FOUND';
        RETURN;
    END IF;

    IF COALESCE(v_tournament_active, FALSE) = FALSE THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_NOT_ACTIVE';
        RETURN;
    END IF;

    IF v_tournament_start IS NOT NULL AND v_tournament_start > v_now THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_NOT_STARTED';
        RETURN;
    END IF;

    IF v_tournament_end IS NOT NULL AND v_tournament_end < v_now THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_ENDED';
        RETURN;
    END IF;

    IF v_profile_grade IS NULL OR v_tournament_grade IS NULL OR v_profile_grade <> v_tournament_grade THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_SCOPE_MISMATCH';
        RETURN;
    END IF;

    IF v_tournament_class IS NOT NULL AND v_profile_class IS DISTINCT FROM v_tournament_class THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, 'TOURNAMENT_SCOPE_MISMATCH';
        RETURN;
    END IF;

    INSERT INTO public.tournament_participants (
        tournament_id,
        user_id,
        attempts_used,
        best_score,
        last_played_at
    )
    VALUES (
        p_tournament_id,
        v_user_id,
        1,
        v_score,
        v_now
    )
    ON CONFLICT (tournament_id, user_id)
    DO UPDATE SET
        attempts_used = public.tournament_participants.attempts_used + 1,
        best_score = GREATEST(public.tournament_participants.best_score, EXCLUDED.best_score),
        last_played_at = v_now
    WHERE public.tournament_participants.attempts_used < 3
    RETURNING public.tournament_participants.attempts_used, public.tournament_participants.best_score
    INTO v_attempts_used, v_best_score;

    IF v_attempts_used IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 0, NULL::INTEGER, 'NO_ATTEMPTS_LEFT';
        RETURN;
    END IF;

    INSERT INTO public.tournament_logs (tournament_id, user_id, score, play_time)
    VALUES (p_tournament_id, v_user_id, v_score, v_play_time);

    RETURN QUERY
    SELECT
        TRUE,
        v_attempts_used,
        GREATEST(0, 3 - v_attempts_used),
        v_best_score,
        NULL::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, NULL::INTEGER, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.record_tournament_attempt_atomic(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tournament_attempt_atomic(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_tournament_attempt_atomic(UUID, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.record_tournament_attempt_atomic(UUID, INTEGER, INTEGER) IS
'Atomic tournament attempt writer with server-side scope validation and max 3 attempts guarantee.';
