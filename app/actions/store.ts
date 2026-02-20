'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/supabase'

export async function purchaseItem(
    itemId: string,
    price: number,
    itemName: string
) {
    const supabase = await createClient() as any

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 2. Get User Profile to check balance
        const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('coin_balance')
            .eq('id', user.id)
            .single()

        if (profileFetchError || !profile) {
            throw new Error('Could not fetch user profile')
        }

        const currentBalance = profile.coin_balance || 0

        // 3. Validate Balance
        if (currentBalance < price) {
            return { success: false, error: '코인이 부족합니다!' }
        }

        // 4. Execute Purchase (Deduct Coins + Record Transaction + Add Item)
        // Since we don't have a multi-table transaction in Supabase JS client easily,
        // we'll do it sequentially. In a real production app, an RPC would be safer.

        // 4a. Deduct Balance
        const newBalance = currentBalance - price
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ coin_balance: newBalance })
            .eq('id', user.id)

        if (updateError) throw updateError

        // 4b. Record Transaction
        const transactionData: Database['public']['Tables']['coin_transactions']['Insert'] = {
            user_id: user.id,
            amount: -price,
            reason: `PURCHASE:${itemId}`,
        }
        const { error: txError } = await supabase
            .from('coin_transactions')
            .insert(transactionData)

        if (txError) {
            // Rollback balance (best effort)
            await supabase.from('profiles').update({ coin_balance: currentBalance }).eq('id', user.id)
            throw txError
        }

        // 4c. Add/Update Item in student_items
        // We use upsert to increment quantity if they buy the same item again
        const { data: existingItem } = await supabase
            .from('student_items')
            .select('quantity')
            .eq('user_id', user.id)
            .eq('item_id', itemId)
            .maybeSingle()

        if (existingItem) {
            const { error: itemUpdateError } = await supabase
                .from('student_items')
                .update({ quantity: existingItem.quantity + 1 })
                .eq('user_id', user.id)
                .eq('item_id', itemId)
            if (itemUpdateError) throw itemUpdateError
        } else {
            const { error: itemInsertError } = await supabase
                .from('student_items')
                .insert({
                    user_id: user.id,
                    item_id: itemId,
                    item_name: itemName,
                    quantity: 1
                })
            if (itemInsertError) throw itemInsertError
        }

        revalidatePath('/student/store')
        revalidatePath('/student/dashboard')

        return {
            success: true,
            newBalance,
            message: `${itemName} 구매 완료!`
        }

    } catch (error) {
        console.error('purchaseItem Error:', error)
        return { success: false, error: '구매 처리 중 오류가 발생했습니다.' }
    }
}

export async function getUserCoins() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { data } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', user.id)
        .single()

    return data?.coin_balance || 0
}
