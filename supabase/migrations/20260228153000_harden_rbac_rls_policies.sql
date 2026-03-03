-- Area D / Phase 3 support
-- P3-3: RLS 정책 재정의 (RBAC + scope hardening)

CREATE OR REPLACE FUNCTION public.current_actor_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_actor_grade()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT grade
    FROM public.profiles
    WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_actor_class()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT class
    FROM public.profiles
    WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.can_access_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_grade INTEGER;
    v_class INTEGER;
    v_target_grade INTEGER;
    v_target_class INTEGER;
BEGIN
    IF auth.uid() IS NULL OR target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_role := public.current_actor_role();
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_role = 'admin'::public.user_role THEN
        RETURN TRUE;
    END IF;

    IF target_user_id = auth.uid() THEN
        RETURN TRUE;
    END IF;

    IF v_role <> 'teacher'::public.user_role THEN
        RETURN FALSE;
    END IF;

    v_grade := public.current_actor_grade();
    v_class := public.current_actor_class();
    IF v_grade IS NULL OR v_class IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT grade, class
    INTO v_target_grade, v_target_class
    FROM public.profiles
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN v_target_grade IS NOT DISTINCT FROM v_grade
       AND v_target_class IS NOT DISTINCT FROM v_class;
END;
$$;

REVOKE ALL ON FUNCTION public.current_actor_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_actor_grade() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_actor_class() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_user(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_actor_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_actor_grade() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_actor_class() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_user(UUID) TO service_role;

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.word_chain_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.short_answer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ox_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matching_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (ARRAY[
              'profiles',
              'question_sets',
              'questions',
              'word_chain_questions',
              'short_answer_questions',
              'ox_questions',
              'matching_questions',
              'game_logs',
              'coin_transactions',
              'student_items',
              'tournaments',
              'tournament_participants',
              'tournament_logs'
          ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- profiles
CREATE POLICY profiles_select_scope
ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
    )
);

CREATE POLICY profiles_update_self_or_admin
ON public.profiles
FOR UPDATE
USING (
    id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
)
WITH CHECK (
    id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
);

-- question_sets
CREATE POLICY question_sets_select_scope
ON public.question_sets
FOR SELECT
USING (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND (
            (grade IS NULL AND class IS NULL)
            OR (
                grade IS NOT DISTINCT FROM public.current_actor_grade()
                AND class IS NOT DISTINCT FROM public.current_actor_class()
            )
        )
    )
    OR (
        public.current_actor_role() = 'student'::public.user_role
        AND is_active IS TRUE
        AND (
            (grade IS NULL AND class IS NULL)
            OR (
                grade IS NOT DISTINCT FROM public.current_actor_grade()
                AND class IS NOT DISTINCT FROM public.current_actor_class()
            )
        )
    )
);

CREATE POLICY question_sets_write_teacher_admin
ON public.question_sets
FOR ALL
USING (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND grade IS NOT NULL
        AND class IS NOT NULL
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
    )
)
WITH CHECK (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND grade IS NOT NULL
        AND class IS NOT NULL
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
    )
);

-- questions + specialized question tables
CREATE POLICY questions_select_by_set_scope
ON public.questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY questions_write_by_set_scope
ON public.questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY word_chain_questions_select_by_set_scope
ON public.word_chain_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY word_chain_questions_write_by_set_scope
ON public.word_chain_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = word_chain_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY short_answer_questions_select_by_set_scope
ON public.short_answer_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY short_answer_questions_write_by_set_scope
ON public.short_answer_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = short_answer_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY ox_questions_select_by_set_scope
ON public.ox_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY ox_questions_write_by_set_scope
ON public.ox_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = ox_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

CREATE POLICY matching_questions_select_by_set_scope
ON public.matching_questions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
              OR (
                  public.current_actor_role() = 'student'::public.user_role
                  AND qs.is_active IS TRUE
                  AND (
                      (qs.grade IS NULL AND qs.class IS NULL)
                      OR (
                          qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                          AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
                      )
                  )
              )
          )
    )
);

CREATE POLICY matching_questions_write_by_set_scope
ON public.matching_questions
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.question_sets qs
        WHERE qs.id = matching_questions.set_id
          AND (
              public.current_actor_role() = 'admin'::public.user_role
              OR (
                  public.current_actor_role() = 'teacher'::public.user_role
                  AND qs.grade IS NOT DISTINCT FROM public.current_actor_grade()
                  AND qs.class IS NOT DISTINCT FROM public.current_actor_class()
              )
          )
    )
);

-- game_logs
CREATE POLICY game_logs_select_scope
ON public.game_logs
FOR SELECT
USING (public.can_access_user(user_id));

CREATE POLICY game_logs_insert_self_or_admin
ON public.game_logs
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
);

-- coin_transactions
CREATE POLICY coin_transactions_select_scope
ON public.coin_transactions
FOR SELECT
USING (public.can_access_user(user_id));

CREATE POLICY coin_transactions_insert_admin_only
ON public.coin_transactions
FOR INSERT
WITH CHECK (public.current_actor_role() = 'admin'::public.user_role);

CREATE POLICY coin_transactions_update_delete_admin_only
ON public.coin_transactions
FOR UPDATE
USING (public.current_actor_role() = 'admin'::public.user_role)
WITH CHECK (public.current_actor_role() = 'admin'::public.user_role);

CREATE POLICY coin_transactions_delete_admin_only
ON public.coin_transactions
FOR DELETE
USING (public.current_actor_role() = 'admin'::public.user_role);

-- student_items
CREATE POLICY student_items_select_scope
ON public.student_items
FOR SELECT
USING (public.can_access_user(user_id));

CREATE POLICY student_items_write_self_or_admin
ON public.student_items
FOR ALL
USING (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
)
WITH CHECK (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
);

-- tournaments
CREATE POLICY tournaments_select_scope
ON public.tournaments
FOR SELECT
USING (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
    )
    OR (
        public.current_actor_role() = 'student'::public.user_role
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND (
            class IS NULL
            OR class IS NOT DISTINCT FROM public.current_actor_class()
        )
    )
);

CREATE POLICY tournaments_write_teacher_admin
ON public.tournaments
FOR ALL
USING (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND created_by = auth.uid()
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
        AND class IS NOT NULL
    )
)
WITH CHECK (
    public.current_actor_role() = 'admin'::public.user_role
    OR (
        public.current_actor_role() = 'teacher'::public.user_role
        AND created_by = auth.uid()
        AND grade IS NOT DISTINCT FROM public.current_actor_grade()
        AND class IS NOT DISTINCT FROM public.current_actor_class()
        AND class IS NOT NULL
    )
);

-- tournament participants/logs
CREATE POLICY tournament_participants_select_scope
ON public.tournament_participants
FOR SELECT
USING (public.can_access_user(user_id));

CREATE POLICY tournament_participants_write_self_or_admin
ON public.tournament_participants
FOR ALL
USING (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
)
WITH CHECK (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
);

CREATE POLICY tournament_logs_select_scope
ON public.tournament_logs
FOR SELECT
USING (public.can_access_user(user_id));

CREATE POLICY tournament_logs_insert_self_or_admin
ON public.tournament_logs
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    OR public.current_actor_role() = 'admin'::public.user_role
);
