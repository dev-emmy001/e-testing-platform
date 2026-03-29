import {
  createQuestionAction,
  deleteQuestionAction,
  updateQuestionAction,
} from "@/app/actions";
import { AdminQuestionsDashboard } from "@/components/admin-questions-dashboard";
import { FlashToast } from "@/components/flash-toast";
import { requireAdminContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import { getSearchParamValue } from "@/utils/format";
import {
  buildQuestionSearchText,
  buildQuestionUsageCountMap,
  type QuestionSessionUsageRecord,
  type QuestionCategoryRecord,
  type QuestionLibraryEntryRecord,
  type QuestionLinkedTestRecord,
  type QuestionRecord,
  type TestQuestionLinkRecord,
} from "@/utils/question-library";

type AdminQuestionsPageProps = {
  searchParams: Promise<{
    drawer?: string | string[];
    questionId?: string | string[];
  }>;
};

type LinkedTestRecord = QuestionLinkedTestRecord;

export default async function AdminQuestionsPage({
  searchParams,
}: AdminQuestionsPageProps) {
  const [params, { error, message }] = await Promise.all([
    searchParams,
    readFlash(),
  ]);
  const drawer = getSearchParamValue(params.drawer);
  const requestedQuestionId = getSearchParamValue(params.questionId);
  const { supabase } = await requireAdminContext("/admin/questions");

  const [
    { data: categories },
    { data: questions },
    { data: testQuestions },
    { data: sessionQuestionUsage },
  ] = await Promise.all([
    supabase
      .from("question_categories")
      .select("id, name, created_at")
      .order("name", { ascending: true })
      .returns<QuestionCategoryRecord[]>(),
    supabase
      .from("questions")
      .select(
        "id, title, question_text, type, category_id, options, correct_answer, created_at",
      )
      .order("created_at", { ascending: false })
      .returns<QuestionRecord[]>(),
    supabase
      .from("test_questions")
      .select("test_id, question_id")
      .returns<TestQuestionLinkRecord[]>(),
    supabase
      .from("session_questions")
      .select("question_id")
      .returns<QuestionSessionUsageRecord[]>(),
  ]);

  const categoryRows = categories ?? [];
  const questionRows = questions ?? [];
  const testQuestionRows = testQuestions ?? [];
  const sessionQuestionUsageRows = sessionQuestionUsage ?? [];
  const categoryNameById = new Map(
    categoryRows.map((category) => [category.id, category.name]),
  );
  const questionUsageCount = buildQuestionUsageCountMap(testQuestionRows);
  const questionSessionUsageCount = buildQuestionUsageCountMap(
    sessionQuestionUsageRows,
  );
  const linkedTestIds = Array.from(
    new Set(testQuestionRows.map((questionLink) => questionLink.test_id)),
  );
  const { data: linkedTests } = linkedTestIds.length
    ? await supabase
        .from("tests")
        .select("id, title, is_active")
        .in("id", linkedTestIds)
        .order("title", { ascending: true })
        .returns<LinkedTestRecord[]>()
    : { data: [] as LinkedTestRecord[] };
  const linkedTestsById = new Map(
    (linkedTests ?? []).map((test) => [test.id, test]),
  );
  const linkedTestsByQuestionId = new Map<string, QuestionLinkedTestRecord[]>();

  for (const questionLink of testQuestionRows) {
    const linkedTest = linkedTestsById.get(questionLink.test_id);

    if (!linkedTest) {
      continue;
    }

    const existingLinkedTests =
      linkedTestsByQuestionId.get(questionLink.question_id) ?? [];
    existingLinkedTests.push(linkedTest);
    linkedTestsByQuestionId.set(questionLink.question_id, existingLinkedTests);
  }

  const questionsWithDetails = questionRows.map<QuestionLibraryEntryRecord>(
    (question) => ({
      ...question,
      categoryName:
        categoryNameById.get(question.category_id ?? "") ?? "Uncategorized",
      linkedTests: (linkedTestsByQuestionId.get(question.id) ?? []).sort(
        (left, right) => left.title.localeCompare(right.title),
      ),
      searchableText: buildQuestionSearchText({
        ...question,
        categoryName:
          categoryNameById.get(question.category_id ?? "") ?? "Uncategorized",
      }),
      sessionUsageCount: questionSessionUsageCount.get(question.id) ?? 0,
      usageCount: questionUsageCount.get(question.id) ?? 0,
    }),
  );
  const initialSelectedQuestionId = questionsWithDetails.some(
    (question) => question.id === requestedQuestionId,
  )
    ? requestedQuestionId
    : null;
  const initialDrawerMode =
    drawer === "new" ? "new" : initialSelectedQuestionId ? "detail" : "closed";

  return (
    <>
      <FlashToast error={error} message={message} />

      <section className="surface-card rounded-4xl p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              Question library
            </p>
            <h2 className="mt-2 text-4xl font-bold text-gray-900">
              Create and manage reusable questions
            </h2>
          </div>
        </div>

      </section>

      <AdminQuestionsDashboard
        key={`${initialDrawerMode}:${initialSelectedQuestionId ?? "none"}`}
        categories={categoryRows}
        createQuestionAction={createQuestionAction}
        deleteQuestionAction={deleteQuestionAction}
        initialDrawerMode={initialDrawerMode}
        initialSelectedQuestionId={initialSelectedQuestionId}
        questions={questionsWithDetails}
        updateQuestionAction={updateQuestionAction}
      />
    </>
  );
}
