import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserContext } from "@/utils/auth/session";
import { getProfileDisplayName, getProfileMetaLine } from "@/utils/profile";
import {
  finalizeExpiredSessionIfNeeded,
  loadSessionExperienceForUser,
} from "@/utils/test-sessions";
import { TestExperience } from "./test-experience";

type TestPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function TestPage({ params }: TestPageProps) {
  const { sessionId } = await params;
  const { user, profile } = await requireUserContext(`/test/${sessionId}`);
  const experience = await loadSessionExperienceForUser(user.id, sessionId);
  const profileDisplayName = getProfileDisplayName(profile);
  const profileMetaLine = getProfileMetaLine(profile);

  if (!experience) {
    redirect("/");
  }

  if (experience.session.status !== "in_progress") {
    redirect(`/results/${sessionId}`);
  }

  if (await finalizeExpiredSessionIfNeeded(sessionId, user.id)) {
    redirect(`/results/${sessionId}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              Trainee assessment
            </p>
            {profileMetaLine ? (
              <span className="text-sm text-gray-500">{profileMetaLine}</span>
            ) : null}
          </div>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            {profileDisplayName} · {experience.test?.title ?? "Assessment"} · Attempt{" "}
            {experience.session.attempt_number}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Work steadily, submit once, and keep this tab open until your score
            loads.
          </p>
        </div>

        <Link
          href="/"
          className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
        >
          Back to dashboard
        </Link>
      </div>

      {experience.questions.length ? (
        <TestExperience
          sessionId={sessionId}
          testTitle={experience.test?.title ?? "Assessment"}
          expiresAt={experience.session.expires_at}
          questions={experience.questions.map((question) => ({
            ...question,
            selectedAnswer: question.selectedAnswer,
          }))}
        />
      ) : (
        <section className="surface-card rounded-4xl p-8">
          <h2 className="text-2xl font-bold text-gray-900">
            No questions were assigned to this session
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-700">
            Return to the dashboard and start the test again after the question
            bank has been reviewed by an administrator.
          </p>
        </section>
      )}
    </main>
  );
}
