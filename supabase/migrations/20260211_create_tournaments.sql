
-- Create extension if not exists
create extension if not exists "uuid-ossp";

-- Create tournaments table
create table if not exists tournaments (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    game_id text not null,
    grade int not null,
    class int not null,
    start_time timestamptz not null,
    end_time timestamptz not null,
    created_by uuid references auth.users(id),
    is_active boolean default true,
    created_at timestamptz default now()
);

-- Create tournament_participants table
create table if not exists tournament_participants (
    id uuid primary key default uuid_generate_v4(),
    tournament_id uuid references tournaments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    attempts_used int default 0,
    best_score int default 0,
    last_played_at timestamptz,
    created_at timestamptz default now(),
    unique(tournament_id, user_id)
);

-- Create tournament_logs table
create table if not exists tournament_logs (
    id uuid primary key default uuid_generate_v4(),
    tournament_id uuid references tournaments(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    score int not null,
    play_time int,
    created_at timestamptz default now()
);

-- Enable RLS
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_logs enable row level security;

-- Policies (Basic)
create policy "Tournaments are viewable by everyone" on tournaments for select using (true);
create policy "Teachers can insert tournaments" on tournaments for insert with check (auth.role() = 'authenticated');
create policy "Teachers can update their tournaments" on tournaments for update using (auth.uid() = created_by);

create policy "Participants viewable by everyone" on tournament_participants for select using (true);
create policy "Participants can be created by authenticated users" on tournament_participants for insert with check (auth.role() = 'authenticated');
create policy "Participants can be updated by authenticated users (self)" on tournament_participants for update using (auth.uid() = user_id);

create policy "Logs viewable by everyone" on tournament_logs for select using (true);
create policy "Logs insertable by authenticated users" on tournament_logs for insert with check (auth.role() = 'authenticated');
