import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserContext } from "@/utils/auth/session";
import {
  finalizeExpiredSessionIfNeeded,
  loadSessionExperienceForUser,
} from "@/utils/test-sessions";
import {
  formatDateTime,
  formatPercentage,
  getStatusClasses,
} from "@/utils/format";

type ResultsPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const { user } = await requireUserContext(`/results/${sessionId}`);
  let experience = await loadSessionExperienceForUser(user.id, sessionId);

  if (!experience) {
    redirect("/");
  }

  if (experience.session.status === "in_progress") {
    const expired = await finalizeExpiredSessionIfNeeded(sessionId, user.id);

    if (!expired) {
      redirect(`/test/${sessionId}`);
    }

    experience = await loadSessionExperienceForUser(user.id, sessionId);

    if (!experience) {
      redirect("/");
    }
  }

  const answeredCount = experience.questions.filter((question) => question.selectedAnswer).length;
  const score = experience.session.score ?? 0;
  const totalQuestions = experience.session.total_questions ?? experience.questions.length;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
            Assessment results
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
            {experience.test?.title ?? "Assessment"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-gray-700)]">
            Attempt {experience.session.attempt_number} completed{" "}
            {formatDateTime(experience.session.submitted_at)}
          </p>
        </div>

        <div className="flex gap-3">
          <span className={`status-pill ${getStatusClasses(experience.session.status)}`}>
            {experience.session.status.replace("_", " ")}
          </span>
          <Link href="/" className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>

      <section className="surface-card mt-8 rounded-[2rem] p-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Score
            </p>
            <p className="mt-2 text-5xl font-extrabold text-[color:var(--color-indigo)]">
              {score}
              <span className="text-2xl text-[color:var(--color-gray-500)]">/{totalQuestions}</span>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Percentage
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--color-gray-900)]">
              {formatPercentage(score, totalQuestions)}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
              Answered
            </p>
            <p className="mt-2 text-3xl font-bold text-[color:var(--color-gray-900)]">
              {answeredCount}/{experience.questions.length}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        {experience.questions.map((question) => {
          const answerState = question.isCorrect === true
            ? {
                label: "Correct",
                classes: "bg-[color:var(--color-green)] text-white",
              }
            : question.isCorrect === false
              ? {
                  label: "Incorrect",
                  classes: "bg-[color:var(--color-orange)] text-white",
                }
              : {
                  label: "Unanswered",
                  classes:
                    "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]",
                };

          return (
            <article key={question.questionId} className="surface-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
                    Question {question.position}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[color:var(--color-gray-900)]">
                    {question.questionText}
                  </h2>
                </div>

                <span className={`status-pill ${answerState.classes}`}>{answerState.label}</span>
              </div>

              <div className="mt-5 rounded-3xl bg-[color:var(--color-gray-100)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                  Your answer
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--color-gray-900)]">
                  {question.selectedAnswer ?? "No answer submitted"}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
