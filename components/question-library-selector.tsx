import type {
  QuestionCategoryRecord,
  QuestionType,
} from "@/utils/question-library";
import { getQuestionTypeLabel } from "@/utils/question-library";

type QuestionLibrarySelectorQuestion = {
  categoryId: string | null;
  id: string;
  linkedTestCount?: number;
  title: string;
  type: QuestionType;
};

type QuestionLibrarySelectorProps = {
  categories: QuestionCategoryRecord[];
  defaultOpen?: boolean;
  emptyMessage?: string;
  inputName?: string;
  questions: QuestionLibrarySelectorQuestion[];
  selectedQuestionIds?: string[];
  summaryLabel?: string;
};

export function QuestionLibrarySelector({
  categories,
  defaultOpen = false,
  emptyMessage = "No questions are available yet.",
  inputName = "questionIds",
  questions,
  selectedQuestionIds = [],
  summaryLabel = "Choose questions",
}: QuestionLibrarySelectorProps) {
  const selectedIds = new Set(selectedQuestionIds);
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  const groupedQuestions = new Map<string | null, QuestionLibrarySelectorQuestion[]>();

  for (const question of questions) {
    const existing = groupedQuestions.get(question.categoryId) ?? [];
    existing.push(question);
    groupedQuestions.set(question.categoryId, existing);
  }

  const sortedGroups = Array.from(groupedQuestions.entries()).sort(([leftId], [rightId]) => {
    const leftOrder = leftId ? categoryOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const rightOrder = rightId ? categoryOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  return (
    <details
      open={defaultOpen}
      className="rounded-[1.75rem] border border-[color:var(--color-gray-300)]/70 bg-[color:var(--color-gray-100)] p-5"
    >
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-gray-900)]">
              {summaryLabel}
            </p>
            <p className="text-sm text-[color:var(--color-gray-600)]">
              {selectedIds.size} selected from {questions.length} reusable library questions
            </p>
          </div>

          <span className="status-pill bg-white text-[color:var(--color-indigo)]">
            Expand library
          </span>
        </div>
      </summary>

      <div className="mt-5">
        {questions.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {sortedGroups.map(([categoryId, categoryQuestions]) => {
              const categoryName =
                categories.find((category) => category.id === categoryId)?.name ??
                "Uncategorized";

              return (
                <section key={categoryId ?? "uncategorized"} className="rounded-[1.5rem] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[color:var(--color-gray-900)]">
                        {categoryName}
                      </h4>
                      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-gray-500)]">
                        {categoryQuestions.length} question
                        {categoryQuestions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {categoryQuestions.map((question) => (
                      <label
                        key={question.id}
                        className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-gray-300)]/70 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          name={inputName}
                          value={question.id}
                          defaultChecked={selectedIds.has(question.id)}
                          className="mt-1 h-4 w-4 accent-[color:var(--color-indigo)]"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[color:var(--color-gray-900)]">
                            {question.title}
                          </span>
                          <span className="mt-1 block text-sm text-[color:var(--color-gray-600)]">
                            {getQuestionTypeLabel(question.type)}
                            {question.linkedTestCount != null
                              ? ` · used in ${question.linkedTestCount} test${question.linkedTestCount === 1 ? "" : "s"}`
                              : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-gray-600)]">{emptyMessage}</p>
        )}
      </div>
    </details>
  );
}
