export const QUESTION_TYPE_VALUES = [
  "multiple_choice",
  "true_false",
] as const;

export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

export type QuestionCategoryRecord = {
  created_at: string | null;
  id: string;
  name: string;
};

export type QuestionRecord = {
  category_id: string | null;
  correct_answer: string;
  created_at: string | null;
  id: string;
  options: unknown;
  question_text: string;
  title: string | null;
  type: QuestionType;
};

export type TestQuestionLinkRecord = {
  question_id: string;
  test_id: string;
};

export function coerceQuestionType(value: string): QuestionType {
  return value === "true_false" ? "true_false" : "multiple_choice";
}

export function getQuestionTypeLabel(type: QuestionType) {
  return type === "true_false" ? "True / False" : "Multiple choice";
}

export function getQuestionTitle(question: Pick<QuestionRecord, "title" | "question_text">) {
  const title = question.title?.trim();

  if (title) {
    return title;
  }

  if (question.question_text.length <= 84) {
    return question.question_text;
  }

  return `${question.question_text.slice(0, 81).trimEnd()}...`;
}

export function buildQuestionUsageCountMap(testQuestionLinks: TestQuestionLinkRecord[]) {
  const map = new Map<string, number>();

  for (const link of testQuestionLinks) {
    map.set(link.question_id, (map.get(link.question_id) ?? 0) + 1);
  }

  return map;
}

export function buildTestQuestionCountMap(testQuestionLinks: TestQuestionLinkRecord[]) {
  const map = new Map<string, number>();

  for (const link of testQuestionLinks) {
    map.set(link.test_id, (map.get(link.test_id) ?? 0) + 1);
  }

  return map;
}

export function buildTestQuestionIdsMap(testQuestionLinks: TestQuestionLinkRecord[]) {
  const map = new Map<string, string[]>();

  for (const link of testQuestionLinks) {
    const existing = map.get(link.test_id) ?? [];
    existing.push(link.question_id);
    map.set(link.test_id, existing);
  }

  return map;
}
