# ighub Testing Platform

A web-based trainee testing platform built for **Innovation Growth Hub (ighub)**. This platform enables seamless cohort assessment through automated test delivery and grading.

## Key Features

- **Magic Link Authentication**: Secure, passwordless sign-in via email.
- **Automated Testing**: 60-minute timed assessments with randomized questions drawn from a bank.
- **Instant Result Scores**: Real-time grading and feedback for trainees upon submission or session expiration.
- **Admin Dashboard**: Comprehensive control over tests, questions, retakes, and result exports (CSV).
- **Security**: Built-in Row Level Security (RLS) via Supabase to protect trainee data.

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Deployment**: [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the schema defined in `CLAUDE.md`.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd ighub-testing-platform
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env.local` file with your Supabase credentials:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
    SUPABASE_SECRET_KEY=your-service-role-key
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```

## Admin Access

To access the admin features, you must elevate your user role:

1.  **Sign in**: Go to `/sign-in` and enter your email to receive a magic link.
2.  **Confirm**: Click the link in your email to log in for the first time.
3.  **Elevate**: Open the **Supabase Dashboard** -> **Table Editor** -> **`profiles`** table. Find your record and change the `role` from `trainee` to `admin`.
4.  **Manage**: Visit `/admin` to access the dashboard.

## Contribution Guidelines

We welcome contributions! To contribute:

1.  **Branching**: Create a new branch for your feature or bugfix (`git checkout -b feature/your-feature`).
2.  **Commits**: Use descriptive commit messages (e.g., `feat: add question preview`, `fix: timer sync`).
3.  **Push**: Push your branch to the remote repository.
4.  **Pull Request**: Open a Pull Request for review.

Please ensure your code follows the established styling using Tailwind CSS and handles Supabase auth contexts correctly.
