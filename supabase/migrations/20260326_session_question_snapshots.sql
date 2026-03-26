alter table session_questions
  add column if not exists question_type text,
  add column if not exists question_text text,
  add column if not exists options jsonb,
  add column if not exists correct_answer text;

update session_questions
set
  question_type = questions.type,
  question_text = questions.question_text,
  options = questions.options,
  correct_answer = questions.correct_answer
from questions
where session_questions.question_id = questions.id;

alter table session_questions
  alter column question_type set not null,
  alter column question_text set not null,
  alter column options set not null,
  alter column correct_answer set not null;

alter table session_questions
  add constraint session_questions_question_type_check
  check (question_type in ('multiple_choice', 'true_false'));

alter table session_questions
  drop constraint if exists session_questions_question_id_fkey;

alter table answers
  drop constraint if exists answers_question_id_fkey;

create index if not exists session_questions_question_id_idx
  on session_questions (question_id);

create index if not exists answers_question_id_idx
  on answers (question_id);

create index if not exists session_questions_session_id_question_id_idx
  on session_questions (session_id, question_id);

create index if not exists answers_session_id_question_id_idx
  on answers (session_id, question_id);
