-- Insert a mock question set
INSERT INTO question_sets (title, description, is_active)
VALUES ('기본 상식 퀴즈', '학생들을 위한 기본 상식 문제 세트입니다.', true)
RETURNING id;

-- Use the returned id to insert questions (Assuming id is found or using a subquery)
INSERT INTO questions (set_id, question_text, options, correct_answer_index, "order")
SELECT id, '지구가 한 바퀴 도는 데 걸리는 시간은?', '["1시간", "1일", "1달", "1년"]'::jsonb, 1, 1 FROM question_sets WHERE title = '기본 상식 퀴즈';

INSERT INTO questions (set_id, question_text, options, correct_answer_index, "order")
SELECT id, '우리나라의 수도는?', '["부산", "서울", "인천", "대구"]'::jsonb, 1, 2 FROM question_sets WHERE title = '기본 상식 퀴즈';

INSERT INTO questions (set_id, question_text, options, correct_answer_index, "order")
SELECT id, '1m(미터)는 몇 cm(센티미터)일까?', '["10cm", "50cm", "100cm", "1000cm"]'::jsonb, 2, 3 FROM question_sets WHERE title = '기본 상식 퀴즈';
