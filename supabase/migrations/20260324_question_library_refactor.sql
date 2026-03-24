create table question_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table test_questions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references tests on delete cascade not null,
  question_id uuid references questions on delete cascade not null,
  created_at timestamptz default now(),
  unique (test_id, question_id)
);

alter table questions
  add column category_id uuid references question_categories,
  add column title text;

insert into question_categories (name)
select distinct 'Imported: ' || tests.title
from tests
join questions on questions.test_id = tests.id
on conflict (name) do nothing;

update questions
set title = left(regexp_replace(question_text, '\s+', ' ', 'g'), 80)
where title is null;

update questions
set category_id = question_categories.id
from tests, question_categories
where questions.test_id = tests.id
  and question_categories.name = 'Imported: ' || tests.title
  and questions.category_id is null;

insert into test_questions (test_id, question_id)
select test_id, id
from questions
on conflict (test_id, question_id) do nothing;

alter table questions
  alter column category_id set not null,
  alter column title set not null;

alter table questions
  drop column test_id;

create index test_questions_test_id_idx on test_questions (test_id);
create index test_questions_question_id_idx on test_questions (question_id);
create index questions_category_id_idx on questions (category_id);

alter table question_categories enable row level security;
alter table test_questions enable row level security;

create policy "Read question categories"
  on question_categories for select using (true);

create policy "Admins manage question categories"
  on question_categories for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins manage test question links"
  on test_questions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
