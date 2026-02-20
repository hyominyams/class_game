import { Hero } from '@/components/main/Hero';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      if (profile.role === 'admin') redirect('/admin/dashboard');
      if (profile.role === 'teacher') redirect('/teacher/dashboard');
      if (profile.role === 'student') redirect('/student/dashboard');
    }
  }

  return (
    <main className="flex flex-col bg-zinc-950">
      <Hero />
    </main>
  );
}
