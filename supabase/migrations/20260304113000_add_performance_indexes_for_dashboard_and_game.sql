-- Performance indexes for dashboard/game loading paths (non-breaking).
-- Safe rollout: additive indexes only, no schema/behavior changes.

create index if not exists idx_coin_tx_user_created_at_pos
on public.coin_transactions (user_id, created_at desc)
where amount > 0;

create index if not exists idx_coin_tx_user_reason_created_at
on public.coin_transactions (user_id, reason, created_at desc);

create index if not exists idx_coin_tx_reference_id
on public.coin_transactions (reference_id);

create index if not exists idx_game_logs_user_created_at
on public.game_logs (user_id, created_at desc);

create index if not exists idx_profiles_role_grade_class
on public.profiles (role, grade, class);

create index if not exists idx_tournaments_scope_window
on public.tournaments (grade, class, is_active, start_time, end_time, game_id);

create index if not exists idx_question_sets_runtime_lookup
on public.question_sets (game_id, is_active, grade, class, created_at desc);
