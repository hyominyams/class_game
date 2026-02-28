insert into public.games (id, title, description, thumbnail_url)
values
    ('word-runner', 'word defense', '뜻에 맞는 단어를 빠르게 입력해 성문을 지키는 영어 디펜스 게임', null),
    ('history-quiz', '역사 퀴즈 탐험', '역사 상식을 퀴즈로 풀어보세요.', null),
    ('pixel-runner', '픽셀 러너', '장애물을 피하고 퀴즈를 풀며 달려보세요!', null)
on conflict (id) do update
set
    title = excluded.title,
    description = excluded.description;
