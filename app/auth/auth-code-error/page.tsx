export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Authentication failed</h1>
      <p className="max-w-md text-sm text-black/70">
        The sign-in link is invalid, expired, or already used. Start the auth flow
        again and request a new link if needed.
      </p>
    </main>
  );
}
