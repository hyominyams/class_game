'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getStoreItemById } from '@/app/constants/store-items'
import { requireActor } from '@/app/actions/security/guards'

const MAX_PURCHASE_RETRIES = 4
type AdminClient = ReturnType<typeof createAdminClient>
type LooseRpcError = { code?: string; message?: string } | null

type PurchaseItemSuccess = {
    success: true
    newBalance: number
    itemId: string
    quantity: number
    message?: string
}

type PurchaseItemFailure = {
    success: false
    error: string
    itemId?: string
}

export type PurchaseItemResult = PurchaseItemSuccess | PurchaseItemFailure

function isRpcMissingError(error: LooseRpcError) {
    if (!error) return false
    return error.code === 'PGRST202' || (error.message || '').includes('purchase_item_atomic')
}

async function restoreBalance(adminClient: AdminClient, userId: string, amount: number) {
    const { error: rpcError } = await adminClient.rpc('increment_coin_balance', {
        user_id_arg: userId,
        amount_arg: amount,
    })

    if (!rpcError) return

    const { data: profile } = await adminClient
        .from('profiles')
        .select('coin_balance')
        .eq('id', userId)
        .single()

    const currentBalance = profile?.coin_balance || 0
    await adminClient
        .from('profiles')
        .update({ coin_balance: currentBalance + amount })
        .eq('id', userId)
}

async function incrementItemQuantitySafely(adminClient: AdminClient, userId: string, itemId: string, itemName: string) {
    for (let attempt = 0; attempt < MAX_PURCHASE_RETRIES; attempt++) {
        const { data: existingItem, error: existingError } = await adminClient
            .from('student_items')
            .select('quantity')
            .eq('user_id', userId)
            .eq('item_id', itemId)
            .maybeSingle()

        if (existingError && existingError.code !== 'PGRST116') {
            return { quantity: 0, error: existingError.message }
        }

        if (!existingItem) {
            const { data: inserted, error: insertError } = await adminClient
                .from('student_items')
                .insert({
                    user_id: userId,
                    item_id: itemId,
                    item_name: itemName,
                    quantity: 1,
                })
                .select('quantity')
                .maybeSingle()

            if (!insertError && inserted) {
                return { quantity: inserted.quantity || 1, error: null }
            }

            if (insertError?.code === '23505') {
                continue
            }

            return { quantity: 0, error: insertError?.message || 'Failed to insert inventory item.' }
        }

        const currentQuantity = existingItem.quantity || 0
        const nextQuantity = currentQuantity + 1

        const { data: updated, error: updateError } = await adminClient
            .from('student_items')
            .update({
                quantity: nextQuantity,
                item_name: itemName,
            })
            .eq('user_id', userId)
            .eq('item_id', itemId)
            .eq('quantity', currentQuantity)
            .select('quantity')
            .maybeSingle()

        if (updateError && updateError.code !== 'PGRST116') {
            return { quantity: 0, error: updateError.message }
        }

        if (updated) {
            return { quantity: updated.quantity || nextQuantity, error: null }
        }
    }

    return { quantity: 0, error: 'Concurrent update conflict. Please retry.' }
}

function normalizeRpcPurchaseResult(payload: unknown, itemId: string): PurchaseItemResult | null {
    const rawRow = Array.isArray(payload) ? payload[0] : payload
    if (!rawRow || typeof rawRow !== 'object') return null
    const row = rawRow as Record<string, unknown>

    if (row.success === false) {
        return { success: false, itemId, error: typeof row.error === 'string' ? row.error : 'Purchase failed.' }
    }

    if (row.success === true || typeof row.new_balance === 'number' || typeof row.newBalance === 'number') {
        const newBalance = Number(row.new_balance ?? row.newBalance)
        const quantity = Number(row.quantity ?? 1)
        if (!Number.isFinite(newBalance)) return null

        return {
            success: true,
            itemId,
            newBalance,
            quantity: Number.isFinite(quantity) ? quantity : 1,
        }
    }

    return null
}

async function purchaseWithFallback(userId: string, itemId: string, itemName: string, price: number): Promise<PurchaseItemResult> {
    const adminClient = createAdminClient()

    for (let attempt = 0; attempt < MAX_PURCHASE_RETRIES; attempt++) {
        const { data: profile, error: profileFetchError } = await adminClient
            .from('profiles')
            .select('coin_balance')
            .eq('id', userId)
            .single()

        if (profileFetchError || !profile) {
            return { success: false, itemId, error: 'Could not fetch user profile.' }
        }

        const currentBalance = profile.coin_balance || 0
        if (currentBalance < price) {
            return { success: false, itemId, error: 'Insufficient coin balance.' }
        }

        // Optimistic lock: only deduct when the observed balance is unchanged.
        const { data: updatedProfile, error: balanceUpdateError } = await adminClient
            .from('profiles')
            .update({ coin_balance: currentBalance - price })
            .eq('id', userId)
            .eq('coin_balance', currentBalance)
            .select('coin_balance')
            .maybeSingle()

        if (balanceUpdateError) {
            return { success: false, itemId, error: balanceUpdateError.message }
        }

        if (!updatedProfile) {
            continue
        }

        const newBalance = updatedProfile.coin_balance ?? (currentBalance - price)

        const { error: transactionError } = await adminClient
            .from('coin_transactions')
            .insert({
                user_id: userId,
                reason: `PURCHASE:${itemId}`,
                amount: -price,
            })

        if (transactionError) {
            await restoreBalance(adminClient, userId, price)
            return { success: false, itemId, error: 'Failed to record purchase transaction.' }
        }

        const inventoryUpdate = await incrementItemQuantitySafely(adminClient, userId, itemId, itemName)
        if (inventoryUpdate.error) {
            await restoreBalance(adminClient, userId, price)
            await adminClient.from('coin_transactions').insert({
                user_id: userId,
                reason: `PURCHASE_ROLLBACK:${itemId}`,
                amount: price,
            })
            return { success: false, itemId, error: inventoryUpdate.error }
        }

        return {
            success: true,
            newBalance,
            itemId,
            quantity: inventoryUpdate.quantity,
            message: `${itemName} purchase complete.`,
        }
    }

    return { success: false, itemId, error: 'Concurrent purchase conflict. Please retry.' }
}

export async function purchaseItem(itemId: string): Promise<PurchaseItemResult> {
    const actorResult = await requireActor(["student"]);
    if (!actorResult.ok) {
        return { success: false, itemId, error: actorResult.error }
    }
    const { actor, supabase } = actorResult;

    const item = getStoreItemById(itemId)
    if (!item) {
        return { success: false, itemId, error: 'Invalid item id.' }
    }

    // Primary path: atomic RPC (implemented by DB owner migration flow).
    const rpcClient = supabase as unknown as {
        rpc: (
            fn: string,
            params?: Record<string, unknown>
        ) => Promise<{ data: unknown; error: LooseRpcError }>
    }
    const { data: rpcData, error: rpcError } = await rpcClient.rpc('purchase_item_atomic', {
        p_user_id: actor.userId,
        p_item_id: itemId,
        p_item_name: item.name,
        p_price: item.price,
    })

    if (!rpcError) {
        const normalized = normalizeRpcPurchaseResult(rpcData, itemId)
        if (normalized) {
            if (normalized.success) {
                revalidatePath('/student/store')
                revalidatePath('/student/dashboard')
            }
            return normalized
        }

        const [{ data: profile }, { data: inventory }] = await Promise.all([
            supabase
                .from('profiles')
                .select('coin_balance')
            .eq('id', actor.userId)
            .single(),
            supabase
                .from('student_items')
                .select('quantity')
                .eq('user_id', actor.userId)
                .eq('item_id', itemId)
                .maybeSingle(),
        ])

        const newBalance = profile?.coin_balance
        if (typeof newBalance === 'number') {
            revalidatePath('/student/store')
            revalidatePath('/student/dashboard')
            return {
                success: true,
                newBalance,
                itemId,
                quantity: inventory?.quantity || 1,
                message: `${item.name} purchase complete.`,
            }
        }
    }

    if (rpcError && !isRpcMissingError(rpcError)) {
        return { success: false, itemId, error: rpcError.message || 'Atomic purchase RPC failed.' }
    }

    const fallbackResult = await purchaseWithFallback(actor.userId, itemId, item.name, item.price)

    if (fallbackResult.success) {
        revalidatePath('/student/store')
        revalidatePath('/student/dashboard')
    }

    return fallbackResult
}

export async function getUserCoins() {
    const actorResult = await requireActor(["student"]);
    if (!actorResult.ok) return 0;
    const { actor, supabase } = actorResult;

    const { data } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', actor.userId)
        .single()

    return data?.coin_balance || 0
}
