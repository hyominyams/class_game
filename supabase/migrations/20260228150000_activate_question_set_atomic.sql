-- Area D / Phase 2
-- P2-1: 활성 세트 단일성 제약 설계
-- P2-2: activate_question_set_atomic(...) SQL/RPC 구현

-- Keep only the newest active set per (game_id, grade, class) scope.
WITH ranked_active_sets AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY game_id, grade, class
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.question_sets
    WHERE is_active IS TRUE
)
UPDATE public.question_sets AS qs
SET is_active = FALSE
FROM ranked_active_sets AS ras
WHERE qs.id = ras.id
  AND ras.rn > 1;

-- CLASS scope singleton: only one active set per (game, grade, class).
CREATE UNIQUE INDEX IF NOT EXISTS question_sets_active_class_singleton_idx
ON public.question_sets (game_id, grade, class)
WHERE is_active IS TRUE
  AND game_id IS NOT NULL
  AND grade IS NOT NULL
  AND class IS NOT NULL;

-- GLOBAL scope singleton: only one active set per game (grade/class both null).
CREATE UNIQUE INDEX IF NOT EXISTS question_sets_active_global_singleton_idx
ON public.question_sets (game_id)
WHERE is_active IS TRUE
  AND game_id IS NOT NULL
  AND grade IS NULL
  AND class IS NULL;

CREATE OR REPLACE FUNCTION public.activate_question_set_atomic(
    p_set_id UUID,
    p_actor_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    activated_set_id UUID,
    game_id TEXT,
    applied_scope TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target public.question_sets%ROWTYPE;
    v_actor_role public.user_role;
    v_actor_grade INTEGER;
    v_actor_class INTEGER;
    v_effective_actor_id UUID;
    v_is_service_actor BOOLEAN := current_user IN ('service_role', 'postgres', 'supabase_admin');
BEGIN
    SELECT *
    INTO v_target
    FROM public.question_sets
    WHERE id = p_set_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'QUESTION_SET_NOT_FOUND';
    END IF;

    IF v_target.game_id IS NULL THEN
        RAISE EXCEPTION 'QUESTION_SET_GAME_ID_REQUIRED';
    END IF;

    v_effective_actor_id := COALESCE(p_actor_id, auth.uid());

    -- Service-role calls are allowed (server trusted path).
    IF NOT v_is_service_actor THEN
        IF v_effective_actor_id IS NULL THEN
            RAISE EXCEPTION 'UNAUTHORIZED';
        END IF;

        SELECT role, grade, class
        INTO v_actor_role, v_actor_grade, v_actor_class
        FROM public.profiles
        WHERE id = v_effective_actor_id;

        IF v_actor_role NOT IN ('admin', 'teacher') THEN
            RAISE EXCEPTION 'FORBIDDEN';
        END IF;

        IF v_actor_role = 'teacher' THEN
            IF v_target.grade IS NULL OR v_target.class IS NULL THEN
                RAISE EXCEPTION 'TEACHER_CANNOT_ACTIVATE_GLOBAL_SET';
            END IF;

            IF v_actor_grade IS DISTINCT FROM v_target.grade
                OR v_actor_class IS DISTINCT FROM v_target.class THEN
                RAISE EXCEPTION 'TEACHER_SCOPE_MISMATCH';
            END IF;
        END IF;
    END IF;

    IF v_target.grade IS NULL AND v_target.class IS NULL THEN
        -- Lock all candidate rows in the same GLOBAL scope before updates.
        PERFORM qs.id
        FROM public.question_sets AS qs
        WHERE qs.game_id = v_target.game_id
          AND qs.grade IS NULL
          AND qs.class IS NULL
        ORDER BY qs.id
        FOR UPDATE;

        UPDATE public.question_sets AS qs
        SET is_active = FALSE
        WHERE qs.game_id = v_target.game_id
          AND qs.grade IS NULL
          AND qs.class IS NULL
          AND qs.is_active IS TRUE
          AND qs.id <> v_target.id;

        UPDATE public.question_sets AS qs
        SET is_active = TRUE
        WHERE qs.id = v_target.id;

        RETURN QUERY SELECT v_target.id, v_target.game_id, 'GLOBAL'::TEXT;
        RETURN;
    END IF;

    IF v_target.grade IS NULL OR v_target.class IS NULL THEN
        RAISE EXCEPTION 'QUESTION_SET_SCOPE_INVALID';
    END IF;

    -- Lock all candidate rows in the same CLASS scope before updates.
    PERFORM qs.id
    FROM public.question_sets AS qs
    WHERE qs.game_id = v_target.game_id
      AND qs.grade = v_target.grade
      AND qs.class = v_target.class
    ORDER BY qs.id
    FOR UPDATE;

    UPDATE public.question_sets AS qs
    SET is_active = FALSE
    WHERE qs.game_id = v_target.game_id
      AND qs.grade = v_target.grade
      AND qs.class = v_target.class
      AND qs.is_active IS TRUE
      AND qs.id <> v_target.id;

    UPDATE public.question_sets AS qs
    SET is_active = TRUE
    WHERE qs.id = v_target.id;

    RETURN QUERY SELECT v_target.id, v_target.game_id, 'CLASS'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_question_set_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_question_set_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_question_set_atomic(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.activate_question_set_atomic(UUID, UUID) IS
'Atomically activate one question set per scope (CLASS or GLOBAL) with teacher/admin scope validation.';
