import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY is missing. Admin actions will fail.");
    }

    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey || '',
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
