'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireActor } from './security/guards'

export async function loginAction(formData: { id: string; password: string }) {
    const supabase = await createClient()

    // 1. 아이디를 이메일 형식으로 변환 (사용자 편의성)
    const email = idToEmail(formData.id)

    // 2. 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: formData.password,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    // 3. 사용자 역할(role) 확인
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

    const role = profile?.role || 'student'

    // 4. 경로 결정
    let destination = '/'
    if (role === 'admin') destination = '/admin/dashboard'
    else if (role === 'teacher') destination = '/teacher/dashboard'
    else if (role === 'student') destination = '/student/dashboard'

    return {
        success: true,
        role,
        destination
    }
}

function idToEmail(id: string) {
    // 입력값이 이미 이메일 형식이면 그대로 사용
    if (id.includes('@')) return id
    // 아니면 기본 도메인 추가 (교사가 생성할 때 사용하는 도메인과 일치해야 함)
    return `${id}@classquest.edu`
}

export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function changePasswordAction(password: string) {
    const supabase = await createClient()

    // 1. 현재 로그인된 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    // 2. 비밀번호 업데이트
    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.error('Password update error:', error)
        return { success: false, error: '비밀번호 변경에 실패했습니다. ' + error.message }
    }

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' }
}

export async function updateStudentNicknameAction(nickname: string) {
    const actorResult = await requireActor(['student'])
    if (!actorResult.ok) {
        return { success: false, error: actorResult.error }
    }

    const trimmed = nickname.trim()
    if (trimmed.length < 2) {
        return { success: false, error: '닉네임은 최소 2글자 이상이어야 합니다.' }
    }

    if (trimmed.length > 20) {
        return { success: false, error: '닉네임은 20글자 이하로 입력해 주세요.' }
    }

    const normalized = trimmed.replace(/\s+/g, '').toLowerCase()
    if (normalized === '익명') {
        return { success: false, error: '닉네임을 익명으로 설정할 수 없습니다.' }
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
        .from('profiles')
        .update({ nickname: trimmed })
        .eq('id', actorResult.actor.userId)

    if (error) {
        return { success: false, error: '닉네임 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.' }
    }

    revalidatePath('/student/dashboard')
    revalidatePath('/student/stats')
    revalidatePath('/student/ranking')
    revalidatePath('/student/my')

    return { success: true, message: '닉네임이 변경되었습니다.' }
}
