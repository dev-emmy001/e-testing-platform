@AGENTS.md
# CLAUDE.md — Trainee Test Platform (ighub)

This file gives Claude full context about the project: what it is, every architectural
decision made, how the codebase is structured, and the design system to use when building UI.

---

## Project overview

A web-based trainee testing platform for Innovation Growth Hub (ighub). Trainees sign in via
email magic link, take a 60-minute auto-graded test drawn randomly from a question bank, and
see their scored results immediately on submission or when time expires. An admin dashboard
lets the operator manage tests, questions, retakes, and results — including CSV export — with
no database access required.

---

## Key decisions (agreed)

| Decision | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Database & auth | Supabase (PostgreSQL + magic-link auth + RLS) |
| Question types | Multiple choice and true/false only |
| Grading | Auto-graded server-side — no manual review |
| Auth method | Email magic link — no password |
| Retakes | Admin-controlled per trainee (default 0) |
| Question delivery | Randomised subset drawn from a question bank per attempt |
| Scale | Ongoing / recurring cohorts |
| Export | CSV from admin dashboard; Supabase Table Editor for non-technical admins |
| Hosting | Vercel |
| Styling | Tailwind CSS |

---

## Design system — ighub brand

Derived from the ighub (Innovation Growth Hub) logo. The brand uses a dark indigo primary
with four vivid accent colours taken from the network-node illustration.

### Colour palette

```css
:root {
  /* Brand primaries */
  --color-indigo:       #3D3A8E;   /* ighub wordmark — primary action colour */
  --color-indigo-dark:  #2A2865;   /* hover / pressed states */
  --color-indigo-light: #EEEDF8;   /* tinted backgrounds, badges */

  /* Accent colours (from the four logo nodes) */
  --color-purple:       #7B5DA7;   /* top-left node */
  --color-cyan:         #29ABE2;   /* top-right node */
  --color-orange:       #F7941D;   /* bottom-centre node */
  --color-green:        #8DC63F;   /* large right node */

  /* Semantic mappings */
  --color-primary:      var(--color-indigo);
  --color-success:      var(--color-green);
  --color-warning:      var(--color-orange);
  --color-info:         var(--color-cyan);

  /* Neutrals */
  --color-gray-900:     #1A1A2E;
  --color-gray-700:     #3D3D5C;
  --color-gray-500:     #6B6B8A;
  --color-gray-300:     #C4C4D8;
  --color-gray-100:     #F4F4FA;
  --color-white:        #FFFFFF;
}
```

### Typography

```css
:root {
  --font-display: 'Nunito', sans-serif;   /* rounded, friendly — matches logo style */
  --font-body:    'DM Sans', sans-serif;  /* clean, legible at small sizes */
  --font-mono:    'JetBrains Mono', monospace;
}
```

Import in `app/layout.tsx`:
```ts
import { Nunito, DM_Sans } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], variable: '--font-display', weight: ['600','700','800'] })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
```

### Component conventions

- **Buttons (primary):** `bg-[#3D3A8E]` text-white, rounded-full, font-semibold.
  Hover: `bg-[#2A2865]`. Use rounded-full pills, not rectangular buttons — matches the
  logo's rounded node aesthetic.
- **Cards:** white background, `rounded-2xl`, `shadow-sm`, `border border-gray-100`.
- **Badges / status pills:** rounded-full, colour-coded by accent:
  - Submitted / passed → green (`#8DC63F` bg, white text)
  - In progress → cyan (`#29ABE2` bg, white text)
  - Expired / failed → orange (`#F7941D` bg, white text)
  - Admin / role → purple (`#7B5DA7` bg, white text)
- **Timer display:** large monospace, colour transitions from indigo → orange → red as
  time runs low (> 10 min: indigo, 2–10 min: orange, < 2 min: red).
- **Progress bars:** use `--color-indigo` fill on `--color-gray-100` track.

### Aesthetic direction

Clean, friendly, networked. The ighub logo communicates connection and collaboration —
the UI should feel approachable and organised, not clinical. Use generous whitespace,
rounded corners everywhere (prefer `rounded-2xl` / `rounded-full`), and the four accent
colours sparingly as status signals, not decoration. The indigo primary should dominate.

---

## Database schema (Supabase / PostgreSQL)

Eight tables. Run all SQL blocks in the Supabase SQL Editor in the order shown below.

### Block 1 — profiles (auto-populated by auth trigger)

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role text not null default 'trainee',
  created_at timestamptz default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Block 2 — tests, categories, questions, and test links

```sql
create table tests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  time_limit_mins int not null default 60,
  questions_per_attempt int not null default 30,
  is_active bool not null default false,
  created_at timestamptz default now()
);

create table question_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table questions (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references question_categories not null,
  title text not null,
  type text not null check (type in ('multiple_choice', 'true_false')),
  question_text text not null,
  options jsonb not null,
  correct_answer text not null,
  created_at timestamptz default now()
);

create table test_questions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references tests on delete cascade not null,
  question_id uuid references questions on delete cascade not null,
  created_at timestamptz default now(),
  unique (test_id, question_id)
);
```

### Block 3 — sessions, session_questions, answers

```sql
create table test_sessions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references tests not null,
  trainee_id uuid references profiles not null,
  started_at timestamptz default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),
  score int,
  total_questions int,
  attempt_number int not null default 1,
  retakes_remaining int not null default 0
);

create table session_questions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references test_sessions on delete cascade not null,
  question_id uuid references questions not null,
  position int not null
);

create table answers (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references test_sessions on delete cascade not null,
  question_id uuid references questions not null,
  selected_answer text,
  is_correct bool,
  answered_at timestamptz default now()
);
```

### Block 4 — Row Level Security

```sql
alter table profiles        enable row level security;
alter table tests           enable row level security;
alter table question_categories enable row level security;
alter table questions       enable row level security;
alter table test_questions  enable row level security;
alter table test_sessions   enable row level security;
alter table session_questions enable row level security;
alter table answers         enable row level security;

-- profiles
create policy "Trainees read own profile"
  on profiles for select using (auth.uid() = id);
create policy "Admins read all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- tests
create policy "Read active tests"
  on tests for select using (is_active = true);
create policy "Admins manage tests"
  on tests for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- question_categories
create policy "Read question categories"
  on question_categories for select using (true);
create policy "Admins manage question categories"
  on question_categories for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- questions (correct_answer is withheld in API code, not at RLS level)
create policy "Read questions"
  on questions for select using (true);
create policy "Admins manage questions"
  on questions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- test_questions
create policy "Admins manage test question links"
  on test_questions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- test_sessions
create policy "Trainees read own sessions"
  on test_sessions for select using (trainee_id = auth.uid());
create policy "Trainees insert own sessions"
  on test_sessions for insert with check (trainee_id = auth.uid());
create policy "Admins manage all sessions"
  on test_sessions for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- session_questions
create policy "Trainees read own session questions"
  on session_questions for select
  using (exists (
    select 1 from test_sessions
    where test_sessions.id = session_id and test_sessions.trainee_id = auth.uid()
  ));

-- answers
create policy "Trainees manage own answers"
  on answers for all
  using (exists (
    select 1 from test_sessions
    where test_sessions.id = session_id and test_sessions.trainee_id = auth.uid()
  ));
create policy "Admins read all answers"
  on answers for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
```

### Make yourself admin (Supabase Table Editor)

Go to Table Editor → `profiles` → find your row → set `role` to `admin` → Save.

---

## Supabase dashboard setup steps

1. Create project at supabase.com. Choose a name, set a strong DB password, pick nearest region.
2. Authentication → Providers → Email → enable "Confirm email" (triggers magic link flow).
3. Authentication → Email Templates → customise the magic link email with ighub branding.
   Keep the Supabase confirmation link variables intact. If you replace them or break the
   template, `POST /auth/v1/otp` will fail with `500 Error sending confirmation email`.
4. (Optional, recommended) Authentication → SMTP Settings → connect Resend for deliverability.
   If magic-link requests return `Error sending confirmation email`, verify SMTP credentials
   here or temporarily switch back to the default Supabase mailer while testing.
5. SQL Editor → run Block 1, 2, 3, 4 above in order.
6. Table Editor → profiles → set your row's `role` to `admin`.
7. Project Settings → API → copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   and `SUPABASE_SECRET_KEY` into `.env.local`.
8. Authentication → URL Configuration → Redirect URLs → add:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

Common auth failure:

- `POST /auth/v1/otp` returning `500` with `Error sending confirmation email` means the browser
  request reached Supabase successfully, but Supabase could not render or send the email.
  Check Email Templates and SMTP Settings first.

---

## Environment variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
SUPABASE_SECRET_KEY=your-service-role-key
```

---

## Supabase client utilities

Location: `utils/supabase/`

### `utils/supabase/client.ts` — browser / Client Components

```ts
import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/utils/supabase/env";

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
```

### `utils/supabase/server.ts` — Server Components, Server Actions, Route Handlers

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/utils/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
```

### `utils/supabase/admin.ts` — service-role client (bypasses RLS)

Use ONLY in Route Handlers for grading, the sweep job, and CSV export.
Never import in client code or Server Components.

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
}
```

---

## Middleware

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## Auth callback route

Location: `app/auth/callback/route.ts`

Required for magic link flow — Supabase redirects here after the user clicks their link.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no proxy in between in local dev,
        // so we can use the default redirect.
        return NextResponse.redirect(`${new URL(request.url).origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${new URL(request.url).origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${new URL(request.url).origin}/auth/auth-code-error`);
}
```

---

## File structure

```
your-project/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          ← magic link handler
│   ├── sign-in/
│   │   └── page.tsx              ← email input form
│   ├── admin/
│   │   ├── page.tsx              ← admin dashboard home
│   │   ├── tests/                ← create/edit tests + select library questions
│   │   ├── questions/            ← question library index + dynamic question editor
│   │   ├── results/              ← results table + CSV export
│   │   └── trainees/             ← completion tracker + retake management
│   ├── test/
│   │   └── [sessionId]/
│   │       └── page.tsx          ← trainee test-taking UI
│   └── layout.tsx
├── proxy.ts                  ← session refresh + route guard
└── utils/
    └── supabase/
        ├── client.ts             ← browser client
        ├── server.ts             ← SSR / RSC client
        └── admin.ts              ← service-role client (bypasses RLS)
```

---

## Core implementation rules

### Timer
- `expires_at` is written **once** at session start and is **read-only** to the client.
- Every API route that accepts answers checks `now() < expires_at` server-side before writing.
- A Vercel Cron Job (or Supabase Edge Function) runs every 5 minutes:
  selects `status = 'in_progress' AND expires_at < now()`, scores existing answers, marks
  session `status = 'expired'`.
- Client-side countdown syncs to `expires_at` from the server. It is display-only.

### Randomisation
On session start, one server action runs:
```sql
SELECT question_id FROM test_questions WHERE test_id = $1 ORDER BY RANDOM() LIMIT $2
```
Results are written to `session_questions` with positions. The question set is locked.

### Grading
The submission API route:
1. Receives the trainee's answers.
2. Joins against `questions.correct_answer` using the admin client (bypasses RLS).
3. Writes `is_correct` per answer row.
4. Sums the score and writes it to `test_sessions`.
`correct_answer` is **never** included in any client-facing API response.

### Admin route protection
Middleware checks `role = 'admin'` on every `/admin/*` request server-side.
No admin UI is shipped to the browser until this passes.

### CSV export
Route: `GET /api/admin/export/[testId]`
Joins `test_sessions` + `answers` + `questions` + `profiles`, streams a CSV response with
`Content-Disposition: attachment; filename="results-[testId].csv"`.

### Client selection guide
| Where | Import from |
|---|---|
| Client Component (`'use client'`) | `utils/supabase/client` |
| Server Component / Server Action | `utils/supabase/server` |
| Route Handler — public reads | `utils/supabase/server` |
| Route Handler — grading / export | `utils/supabase/admin` |

---

## What's been built so far

- [x] PRD and system architecture defined
- [x] Database schema designed (6 tables)
- [x] Supabase project configured (auth, RLS, tables)
- [x] Supabase client utilities created (client, server, admin)
- [x] Middleware wired up (session refresh + route guards)
- [x] Auth callback route created

## Still to build

- [ ] Sign-in page (magic link request form)
- [ ] Trainee test session flow (start, answer, timer, submit)
- [ ] Results screen
- [ ] Admin dashboard — question bank editor
- [ ] Admin dashboard — test configuration
- [ ] Admin dashboard — results table + CSV export
- [ ] Admin dashboard — completion tracker
- [ ] Admin dashboard — retake management
- [ ] Sweep cron job (Vercel Cron or Supabase Edge Function)
