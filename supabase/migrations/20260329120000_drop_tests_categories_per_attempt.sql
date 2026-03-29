alter table tests
  drop constraint if exists tests_categories_per_attempt_check;

alter table tests
  drop column if exists categories_per_attempt;
