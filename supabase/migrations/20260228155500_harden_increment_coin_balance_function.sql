-- Harden increment_coin_balance function:
-- 1) fixed search_path for SECURITY DEFINER safety
-- 2) strict grant (service_role only)

CREATE OR REPLACE FUNCTION public.increment_coin_balance(user_id_arg UUID, amount_arg INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF user_id_arg IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF amount_arg IS NULL THEN
        RAISE EXCEPTION 'AMOUNT_REQUIRED';
    END IF;

    UPDATE public.profiles
    SET coin_balance = COALESCE(coin_balance, 0) + amount_arg
    WHERE id = user_id_arg;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_coin_balance(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_coin_balance(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.increment_coin_balance(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coin_balance(UUID, INTEGER) TO service_role;
