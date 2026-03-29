"use client";

import { useDeferredValue, useEffect, useEffectEvent, useState } from "react";
import { deleteTraineeAction, grantRetakeAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import {
  formatDateTime,
  formatPercentage,
  getStatusClasses,
} from "@/utils/format";

const TABLET_MIN_WIDTH = 768;
const DESKTOP_MIN_WIDTH = 1280;

export type AdminTraineeSession = {
  attemptNumber: number;
  expiresAt: string;
  id: string;
  isActiveTest: boolean;
  lastActivityAt: string;
  resultCapturedAfterExpiry: boolean;
  retakesRemaining: number;
  score: number | null;
  startedAt: string;
  status: "in_progress" | "submitted" | "expired";
  submittedAt: string | null;
  testId: string;
  testTitle: string;
  totalQuestions: number | null;
};

export type AdminTraineeRecord = {
  activeCompletedCount: number;
  activeTestCount: number;
  allSessions: AdminTraineeSession[];
  email: string;
  id: string;
  lastActivityAt: string | null;
  latestExpiredCount: number;
  latestInProgressCount: number;
  latestSessions: AdminTraineeSession[];
  latestSubmittedCount: number;
  resultCapturedAfterExpiryCount: number;
  role: string;
  totalAttempts: number;
};

type AdminTraineesDashboardProps = {
  trainees: AdminTraineeRecord[];
};

type ViewMode = "grid" | "list";

function getPageSizeForWidth(width: number) {
  if (width >= DESKTOP_MIN_WIDTH) {
    return 24;
  }

  if (width >= TABLET_MIN_WIDTH) {
    return 12;
  }

  return 6;
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

function getScoreLabel(session: AdminTraineeSession) {
  const baseLabel = `${session.score ?? 0}/${session.totalQuestions ?? "—"}`;
  const percentageLabel = formatPercentage(
    session.score,
    session.totalQuestions,
  );

  return percentageLabel === "—"
    ? baseLabel
    : `${baseLabel} (${percentageLabel})`;
}

function getSessionSearchText(trainee: AdminTraineeRecord) {
  return [
    trainee.email,
    trainee.id,
    trainee.role,
    ...trainee.latestSessions.map((session) => session.testTitle),
  ]
    .join(" ")
    .toLowerCase();
}

function ViewToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-(--color-indigo) shadow-[0_10px_24px_rgba(42,40,101,0.12)]"
          : "text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function TraineeGridCard({
  isSelected,
  onSelect,
  trainee,
}: {
  isSelected: boolean;
  onSelect: (traineeId: string) => void;
  trainee: AdminTraineeRecord;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(trainee.id)}
      className={`surface-card group w-full rounded-4xl p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(42,40,101,0.14)] ${
        isSelected ? "border-(--color-indigo)" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
            Trainee
          </p>
          <h3 className="mt-2 break-all text-sm font-bold text-gray-900">
            {trainee.email}
          </h3>
          <p className="mt-3 text-sm text-gray-700">
            {trainee.activeCompletedCount}/{trainee.activeTestCount} active
            tests completed
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 grid-cols-2">
        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Attempts
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {trainee.totalAttempts}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Submitted
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {trainee.latestSubmittedCount}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            In progress
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {trainee.latestInProgressCount}
          </p>
        </div>

        <div className="rounded-3xl bg-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Expired
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {trainee.latestExpiredCount}
          </p>
        </div>
      </div>
    </button>
  );
}

function TraineeListRow({
  isSelected,
  onSelect,
  trainee,
}: {
  isSelected: boolean;
  onSelect: (traineeId: string) => void;
  trainee: AdminTraineeRecord;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(trainee.id)}
      className={`surface-card w-full rounded-[1.75rem] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(42,40,101,0.12)] ${
        isSelected ? "border-(--color-indigo)" : ""
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] xl:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
            Trainee
          </p>
          <h3 className="mt-2 break-all font-bold text-gray-900">
            {trainee.email}
          </h3>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Attempts
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {trainee.totalAttempts}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Submitted
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {trainee.latestSubmittedCount}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Live / Expired
          </p>
          <p className="mt-2 text-lg font-bold text-gray-900">
            {trainee.latestInProgressCount} / {trainee.latestExpiredCount}
          </p>
        </div>
      </div>
    </button>
  );
}

function TraineeDetailDrawer({
  onClose,
  trainee,
}: {
  onClose: () => void;
  trainee: AdminTraineeRecord | null;
}) {
  const isOpen = Boolean(trainee);

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close trainee details"
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(26,26,46,0.38)] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="trainee-drawer-title"
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-[rgba(196,196,216,0.55)] bg-[rgba(255,255,255,0.96)] p-6 shadow-[0_24px_60px_rgba(26,26,46,0.22)] backdrop-blur-xl transition-transform duration-300 sm:p-8 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {trainee ? (
          <div className="space-y-6">
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                  Trainee profile
                </p>
                <h2
                  id="trainee-drawer-title"
                  className="mt-2 break-all text-3xl font-bold text-gray-900"
                >
                  {trainee.email}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="status-pill bg-(--color-indigo-light) text-(--color-indigo)">
                    {trainee.role}
                  </span>
                  <span className="status-pill bg-gray-100 text-gray-700">
                    {trainee.totalAttempts} total attempts
                  </span>
                  <span className="status-pill bg-(--color-green) text-white">
                    {trainee.activeCompletedCount}/{trainee.activeTestCount}{" "}
                    active tests completed
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="secondary-button px-4 py-2 text-sm"
              >
                Close
              </button>
            </header>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-gray-100 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Submitted
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {trainee.latestSubmittedCount}
                </p>
              </div>
              <div className="rounded-3xl bg-gray-100 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  In progress
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {trainee.latestInProgressCount}
                </p>
              </div>
              <div className="rounded-3xl bg-gray-100 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Expired
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {trainee.latestExpiredCount}
                </p>
              </div>
              <div className="rounded-3xl bg-gray-100 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Expired result
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {trainee.resultCapturedAfterExpiryCount}
                </p>
              </div>
            </section>

            <section className="surface-card rounded-[1.75rem] p-5">
              <h3 className="text-xl font-bold text-gray-900">
                Profile details
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    User ID
                  </dt>
                  <dd className="mt-2 break-all font-mono text-sm text-gray-900">
                    {trainee.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Last activity
                  </dt>
                  <dd className="mt-2 text-sm text-gray-900">
                    {formatDateTime(trainee.lastActivityAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[1.75rem] border border-[color:var(--color-orange)]/30 bg-[color:var(--color-orange)]/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-orange)]">
                    Danger zone
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">
                    Delete trainee
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-gray-700">
                    This removes sign-in access, the trainee profile, and all
                    recorded test attempts for {trainee.email}.
                  </p>
                </div>

                <form
                  action={deleteTraineeAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Delete ${trainee.email} and all recorded test history? This cannot be undone.`,
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                  className="shrink-0"
                >
                  <input type="hidden" name="traineeId" value={trainee.id} />
                  <SubmitButton
                    pendingLabel="Deleting..."
                    className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--color-orange)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(255,122,61,0.22)] transition hover:bg-[color:var(--color-orange)]/90"
                  >
                    Delete trainee
                  </SubmitButton>
                </form>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                    Current test status
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-gray-900">
                    Latest session for each test
                  </h3>
                </div>
              </div>

              {trainee.latestSessions.length ? (
                trainee.latestSessions.map((session) => (
                  <article
                    key={session.id}
                    className="surface-card rounded-[1.75rem] p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">
                          {session.testTitle}
                        </h4>
                        <p className="mt-2 text-sm text-gray-700">
                          Attempt {session.attemptNumber} · Started{" "}
                          {formatDateTime(session.startedAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`status-pill ${getStatusClasses(session.status)}`}
                        >
                          {session.status.replace("_", " ")}
                        </span>
                        {session.resultCapturedAfterExpiry ? (
                          <span className="status-pill bg-(--color-orange) text-white">
                            Result captured after timer
                          </span>
                        ) : null}
                        {!session.isActiveTest ? (
                          <span className="status-pill bg-gray-100 text-gray-700">
                            Inactive test
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Score
                        </p>
                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {getScoreLabel(session)}
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Last activity
                        </p>
                        <p className="mt-2 text-sm text-gray-900">
                          {formatDateTime(session.lastActivityAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Expires
                        </p>
                        <p className="mt-2 text-sm text-gray-900">
                          {formatDateTime(session.expiresAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Submitted / finalized
                        </p>
                        <p className="mt-2 text-sm text-gray-900">
                          {formatDateTime(session.submittedAt)}
                        </p>
                      </div>
                    </div>

                    <form
                      action={grantRetakeAction}
                      className="mt-5 flex flex-wrap items-end gap-3"
                    >
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-gray-700">
                          Retakes remaining
                        </span>
                        <input
                          type="number"
                          name="retakesRemaining"
                          min="0"
                          defaultValue={session.retakesRemaining}
                          className="field-shell w-28 px-3 py-2 text-sm outline-none"
                        />
                      </label>

                      <SubmitButton
                        pendingLabel="Saving..."
                        className="primary-button inline-flex items-center justify-center px-4 py-2 text-sm"
                      >
                        Update retakes
                      </SubmitButton>
                    </form>
                  </article>
                ))
              ) : (
                <section className="surface-card rounded-[1.75rem] p-5 text-sm text-gray-700">
                  No attempts recorded for this trainee yet.
                </section>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                  Full history
                </p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">
                  All recorded attempts
                </h3>
              </div>

              {trainee.allSessions.length ? (
                trainee.allSessions.map((session) => (
                  <article
                    key={`${session.id}-history`}
                    className="rounded-[1.75rem] border border-[rgba(196,196,216,0.65)] bg-white px-5 py-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">
                          {session.testTitle}
                        </h4>
                        <p className="mt-2 text-sm text-gray-700">
                          Attempt {session.attemptNumber} · Score{" "}
                          {getScoreLabel(session)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`status-pill ${getStatusClasses(session.status)}`}
                        >
                          {session.status.replace("_", " ")}
                        </span>
                        {session.resultCapturedAfterExpiry ? (
                          <span className="status-pill bg-(--color-orange) text-white">
                            Result captured after timer
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Session ID
                        </dt>
                        <dd className="mt-2 break-all font-mono text-xs text-gray-900">
                          {session.id}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Test ID
                        </dt>
                        <dd className="mt-2 break-all font-mono text-xs text-gray-900">
                          {session.testId}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Started
                        </dt>
                        <dd className="mt-2 text-sm text-gray-900">
                          {formatDateTime(session.startedAt)}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                          Submitted / finalized
                        </dt>
                        <dd className="mt-2 text-sm text-gray-900">
                          {formatDateTime(session.submittedAt)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))
              ) : (
                <section className="surface-card rounded-[1.75rem] p-5 text-sm text-gray-700">
                  No attempt history is available yet.
                </section>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function AdminTraineesDashboard({
  trainees,
}: AdminTraineesDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(
    null,
  );
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = normalizeQuery(deferredSearchQuery);

  const syncPageSize = useEffectEvent(() => {
    setPageSize(getPageSizeForWidth(window.innerWidth));
  });

  useEffect(() => {
    syncPageSize();
    window.addEventListener("resize", syncPageSize);

    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  const filteredTrainees = normalizedQuery
    ? trainees.filter((trainee) =>
        getSessionSearchText(trainee).includes(normalizedQuery),
      )
    : trainees;
  const totalPages = Math.max(1, Math.ceil(filteredTrainees.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const selectedTrainee =
    filteredTrainees.find((trainee) => trainee.id === selectedTraineeId) ??
    null;

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setSelectedTraineeId(null);
    }
  });

  useEffect(() => {
    if (!selectedTrainee) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedTrainee]);

  const pageStartIndex = (activePage - 1) * pageSize;
  const paginatedTrainees = filteredTrainees.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const showingFrom = filteredTrainees.length ? pageStartIndex + 1 : 0;
  const showingTo = Math.min(
    pageStartIndex + pageSize,
    filteredTrainees.length,
  );

  return (
    <>
      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full max-w-xl">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Search trainees
            </label>
            <div className="field-shell flex items-center gap-3 px-4 py-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                  setSelectedTraineeId(null);
                }}
                placeholder="Search by email, ID, or test title"
                className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                    setSelectedTraineeId(null);
                  }}
                  className="text-sm font-semibold text-(--color-indigo)"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:justify-end">
            <div className="rounded-[1.25rem] bg-gray-100 p-1">
              <ViewToggleButton
                active={viewMode === "grid"}
                label="Grid view"
                onClick={() => setViewMode("grid")}
              />
              <ViewToggleButton
                active={viewMode === "list"}
                label="List view"
                onClick={() => setViewMode("list")}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {pageSize} trainees per page on this screen
          </p>
          <p className="text-sm text-gray-700">
            {filteredTrainees.length
              ? `Showing ${showingFrom}-${showingTo} of ${filteredTrainees.length} trainees`
              : "No trainees match the current search"}
          </p>
          <p className="text-sm text-gray-600">
            Select a trainee to open the detail drawer
          </p>
        </div>
      </section>

      {!trainees.length ? (
        <section className="surface-card rounded-4xl p-8 text-sm text-gray-700">
          No trainee profiles are available yet.
        </section>
      ) : filteredTrainees.length ? (
        <section className="space-y-4">
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedTrainees.map((trainee) => (
                <TraineeGridCard
                  key={trainee.id}
                  trainee={trainee}
                  isSelected={selectedTraineeId === trainee.id}
                  onSelect={setSelectedTraineeId}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTrainees.map((trainee) => (
                <TraineeListRow
                  key={trainee.id}
                  trainee={trainee}
                  isSelected={selectedTraineeId === trainee.id}
                  onSelect={setSelectedTraineeId}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <section className="surface-card rounded-4xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700">
                  Page {activePage} of {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(activePage - 1, 1))}
                    disabled={activePage === 1}
                    className="secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage(Math.min(activePage + 1, totalPages))
                    }
                    disabled={activePage === totalPages}
                    className="primary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </section>
      ) : (
        <section className="surface-card rounded-4xl p-8 text-sm text-gray-700">
          No trainees matched that search. Try another email, ID, or clear the
          filter.
        </section>
      )}

      <TraineeDetailDrawer
        trainee={selectedTrainee}
        onClose={() => setSelectedTraineeId(null)}
      />
    </>
  );
}
