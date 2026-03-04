-- Dashboard/notification performance RPCs (behavior-preserving).
-- Security model: SECURITY INVOKER + auth.uid() == p_user_id guard.

create or replace function public.get_student_progress_metrics(
    p_user_id uuid
)
returns table (
    total_score bigint,
    total_games_played bigint,
    total_coins_earned bigint,
    attendance_count bigint
)
language plpgsql
security invoker
set search_path = public
as $$
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        raise exception 'Forbidden'
            using errcode = '42501';
    end if;

    return query
    select
        coalesce((
            select sum(gl.score)::bigint
            from public.game_logs gl
            where gl.user_id = p_user_id
        ), 0) as total_score,
        coalesce((
            select count(*)::bigint
            from public.game_logs gl
            where gl.user_id = p_user_id
        ), 0) as total_games_played,
        coalesce((
            select sum(ct.amount)::bigint
            from public.coin_transactions ct
            where ct.user_id = p_user_id
              and ct.amount > 0
        ), 0) as total_coins_earned,
        coalesce((
            select count(*)::bigint
            from public.coin_transactions ct
            where ct.user_id = p_user_id
              and ct.reason = 'ATTENDANCE'
        ), 0) as attendance_count;
end;
$$;

create or replace function public.get_student_current_rank(
    p_user_id uuid,
    p_grade integer,
    p_class integer
)
returns table (
    rank integer
)
language plpgsql
security invoker
set search_path = public
as $$
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        raise exception 'Forbidden'
            using errcode = '42501';
    end if;

    return query
    with classmates as (
        select p.id
        from public.profiles p
        where p.role = 'student'
          and p.grade = p_grade
          and p."class" = p_class
    ),
    points as (
        select
            c.id,
            coalesce(sum(
                case
                    when ct.amount > 0
                     and (
                        ct.reason = 'ATTENDANCE'
                        or ct.reason like 'GAME_REWARD:%'
                        or ct.reason like 'TOURNAMENT_REWARD:%'
                     )
                    then ct.amount
                    else 0
                end
            ), 0) as point_total
        from classmates c
        left join public.coin_transactions ct
            on ct.user_id = c.id
        group by c.id
    ),
    ranked as (
        select
            p.id,
            row_number() over (order by p.point_total desc, p.id asc)::integer as row_rank
        from points p
    )
    select coalesce((select r.row_rank from ranked r where r.id = p_user_id), 1) as rank;
end;
$$;

create or replace function public.get_student_rank_movement_snapshot(
    p_user_id uuid,
    p_grade integer,
    p_class integer,
    p_window_start timestamptz
)
returns table (
    current_rank integer,
    previous_rank integer,
    rank_changed_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        raise exception 'Forbidden'
            using errcode = '42501';
    end if;

    return query
    with classmates as (
        select p.id
        from public.profiles p
        where p.role = 'student'
          and p.grade = p_grade
          and p."class" = p_class
    ),
    points as (
        select
            c.id,
            coalesce(sum(
                case
                    when ct.amount > 0
                     and (
                        ct.reason = 'ATTENDANCE'
                        or ct.reason like 'GAME_REWARD:%'
                        or ct.reason like 'TOURNAMENT_REWARD:%'
                     )
                    then ct.amount
                    else 0
                end
            ), 0) as current_points,
            coalesce(sum(
                case
                    when ct.amount > 0
                     and ct.created_at < p_window_start
                     and (
                        ct.reason = 'ATTENDANCE'
                        or ct.reason like 'GAME_REWARD:%'
                        or ct.reason like 'TOURNAMENT_REWARD:%'
                     )
                    then ct.amount
                    else 0
                end
            ), 0) as previous_points
        from classmates c
        left join public.coin_transactions ct
            on ct.user_id = c.id
        group by c.id
    ),
    ranked_current as (
        select
            p.id,
            row_number() over (order by p.current_points desc, p.id asc)::integer as row_rank
        from points p
    ),
    ranked_previous as (
        select
            p.id,
            row_number() over (order by p.previous_points desc, p.id asc)::integer as row_rank
        from points p
    ),
    change_time as (
        select max(ct.created_at) as changed_at
        from public.coin_transactions ct
        join classmates c on c.id = ct.user_id
        where ct.amount > 0
          and ct.created_at >= p_window_start
          and (
              ct.reason = 'ATTENDANCE'
              or ct.reason like 'GAME_REWARD:%'
              or ct.reason like 'TOURNAMENT_REWARD:%'
          )
    )
    select
        coalesce((select rc.row_rank from ranked_current rc where rc.id = p_user_id), 1) as current_rank,
        coalesce((select rp.row_rank from ranked_previous rp where rp.id = p_user_id), 1) as previous_rank,
        (select changed_at from change_time) as rank_changed_at;
end;
$$;
