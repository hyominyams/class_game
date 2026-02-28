-- Create short_answer_questions table
CREATE TABLE IF NOT EXISTS public.short_answer_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    time_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create word_chain_questions table
CREATE TABLE IF NOT EXISTS public.word_chain_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    accepted_answers JSONB DEFAULT '[]'::JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create ox_questions table
CREATE TABLE IF NOT EXISTS public.ox_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    is_true BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create matching_questions table
CREATE TABLE IF NOT EXISTS public.matching_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    set_id UUID REFERENCES public.question_sets(id) ON DELETE CASCADE,
    item_1 TEXT NOT NULL,
    item_2 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.short_answer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_chain_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ox_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_questions ENABLE ROW LEVEL SECURITY;

-- Policies for short_answer_questions
CREATE POLICY "Enable read access for all users" ON public.short_answer_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert, update, delete for teachers/admin" ON public.short_answer_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policies for word_chain_questions
CREATE POLICY "Enable read access for all users" ON public.word_chain_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert, update, delete for teachers/admin" ON public.word_chain_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policies for ox_questions
CREATE POLICY "Enable read access for all users" ON public.ox_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert, update, delete for teachers/admin" ON public.ox_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin')
  )
);

-- Policies for matching_questions
CREATE POLICY "Enable read access for all users" ON public.matching_questions FOR SELECT USING (true);
CREATE POLICY "Enable insert, update, delete for teachers/admin" ON public.matching_questions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin')
  )
);
