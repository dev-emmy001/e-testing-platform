import Link from "next/link";
import { requireAdminContext } from "@/utils/auth/session";

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdminContext("/admin");

  const [{ data: tests }, { data: questions }, { data: sessions }, { data: profiles }] =
    await Promise.all([
      supabase.from("tests").select("id, title, is_active"),
      supabase.from("questions").select("id, test_id"),
      supabase.from("test_sessions").select("id, status"),
      supabase.from("profiles").select("id, role"),
    ]);

  const activeTests = (tests ?? []).filter((test) => test.is_active).length;
  const questionCount = (questions ?? []).length;
  const completedSessions = (sessions ?? []).filter(
    (session) => session.status !== "in_progress",
  ).length;
  const traineeCount = (profiles ?? []).filter((profile) => profile.role === "trainee").length;

  const statCards = [
    { label: "Active tests", value: activeTests, tone: "text-[color:var(--color-indigo)]" },
    { label: "Question bank", value: questionCount, tone: "text-[color:var(--color-purple)]" },
    { label: "Completed sessions", value: completedSessions, tone: "text-[color:var(--color-green)]" },
    { label: "Trainees", value: traineeCount, tone: "text-[color:var(--color-orange)]" },
  ];

  return (
    <>
      <section className="surface-card rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
          Overview
        </p>
        <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
          Control the live assessment workspace
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
          Configure tests, maintain the question bank, monitor completions, export scores,
          and adjust retakes without touching the database directly.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article key={card.label} className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5">
              <p className="text-sm font-semibold text-[color:var(--color-gray-500)]">
                {card.label}
              </p>
              <p className={`mt-3 text-4xl font-extrabold ${card.tone}`}>{card.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="surface-card rounded-[2rem] p-6">
          <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
            Quick actions
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/tests"
              className="rounded-[1.5rem] border border-[color:var(--color-gray-300)] bg-white px-5 py-4 text-sm font-semibold text-[color:var(--color-gray-900)] transition hover:border-[color:var(--color-indigo)]"
            >
              Manage tests
            </Link>
            <Link
              href="/admin/questions"
              className="rounded-[1.5rem] border border-[color:var(--color-gray-300)] bg-white px-5 py-4 text-sm font-semibold text-[color:var(--color-gray-900)] transition hover:border-[color:var(--color-indigo)]"
            >
              Edit question bank
            </Link>
            <Link
              href="/admin/results"
              className="rounded-[1.5rem] border border-[color:var(--color-gray-300)] bg-white px-5 py-4 text-sm font-semibold text-[color:var(--color-gray-900)] transition hover:border-[color:var(--color-indigo)]"
            >
              Review results
            </Link>
            <Link
              href="/admin/trainees"
              className="rounded-[1.5rem] border border-[color:var(--color-gray-300)] bg-white px-5 py-4 text-sm font-semibold text-[color:var(--color-gray-900)] transition hover:border-[color:var(--color-indigo)]"
            >
              Track trainees
            </Link>
          </div>
        </article>

        <article className="surface-card rounded-[2rem] p-6">
          <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
            Current test inventory
          </h3>
          <div className="mt-5 space-y-3">
            {(tests ?? []).length ? (
              (tests ?? []).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-[1.5rem] border border-[color:var(--color-gray-300)] bg-white px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--color-gray-900)]">
                      {test.title}
                    </p>
                    <p className="text-sm text-[color:var(--color-gray-500)]">
                      {(questions ?? []).filter((question) => question.test_id === test.id).length}{" "}
                      questions in bank
                    </p>
                  </div>
                  <span
                    className={`status-pill ${
                      test.is_active
                        ? "bg-[color:var(--color-green)] text-white"
                        : "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]"
                    }`}
                  >
                    {test.is_active ? "Active" : "Draft"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[color:var(--color-gray-700)]">
                No tests have been configured yet.
              </p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
