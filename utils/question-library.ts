import { parseOptions } from "@/utils/format";

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

export type QuestionSessionUsageRecord = {
  question_id: string;
};

export type QuestionLinkedTestRecord = {
  id: string;
  is_active: boolean;
  title: string;
};

export type QuestionLibraryEntryRecord = QuestionRecord & {
  categoryName: string;
  linkedTests: QuestionLinkedTestRecord[];
  searchableText: string;
  sessionUsageCount: number;
  usageCount: number;
};

export function coerceQuestionType(value: string): QuestionType {
  return value === "true_false" ? "true_false" : "multiple_choice";
}

export function getQuestionTypeLabel(type: QuestionType) {
  return type === "true_false" ? "True / False" : "Multiple choice";
}

function normalizeQuestionText(questionText: string) {
  return questionText.replace(/\s+/g, " ").trim();
}

export function getStoredQuestionTitle(questionText: string) {
  const normalized = normalizeQuestionText(questionText);

  if (normalized.length <= 80) {
    return normalized;
  }

  return normalized.slice(0, 80).trimEnd();
}

export function getQuestionTitle(question: Pick<QuestionRecord, "question_text">) {
  const normalized = normalizeQuestionText(question.question_text);

  if (normalized.length <= 84) {
    return normalized;
  }

  return `${normalized.slice(0, 81).trimEnd()}...`;
}

export function buildQuestionSearchText(
  question: Pick<
    QuestionRecord,
    "correct_answer" | "options" | "question_text" | "title" | "type"
  > & {
    categoryName?: string;
  },
) {
  return [
    question.categoryName ?? "",
    question.title ?? "",
    question.question_text,
    question.correct_answer,
    getQuestionTypeLabel(question.type),
    ...parseOptions(question.options),
  ]
    .map((value) => normalizeQuestionText(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildQuestionUsageCountMap<
  TQuestionLink extends {
    question_id: string;
  },
>(questionLinks: TQuestionLink[]) {
  const map = new Map<string, number>();

  for (const link of questionLinks) {
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
