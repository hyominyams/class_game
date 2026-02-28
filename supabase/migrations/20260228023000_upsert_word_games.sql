-- Normalize game labels for question authoring and runtime.
insert into public.games (id, title, description, thumbnail_url)
values
    ('word-runner', 'word defense', '뜻에 맞는 단어를 빠르게 입력해 성문을 지키는 영어 디펜스 게임', null),
    ('word-chain', 'word chain', '제시어를 보고 단어를 이어 입력하는 연쇄 정답 게임', null)
on conflict (id) do update
set
    title = excluded.title,
    description = excluded.description,
    thumbnail_url = coalesce(excluded.thumbnail_url, public.games.thumbnail_url);
