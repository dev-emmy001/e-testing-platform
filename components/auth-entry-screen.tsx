import Image from "next/image";
import { FlashToast } from "@/components/flash-toast";
import { SignInForm } from "@/components/sign-in-form";

type AuthEntryScreenProps = {
  error?: string | null;
  message?: string | null;
  nextPath?: string | null;
};

export function AuthEntryScreen({
  error,
  message,
  nextPath,
}: AuthEntryScreenProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12 lg:px-8">
      <FlashToast error={error} message={message} />

      <div className="grid gap-12 text-center lg:items-center">
        <section className="flex flex-col items-center">
          <Image
            src="/images/innovation-growth-hub.webp"
            alt="Innovation Growth Hub"
            width={200}
            height={200}
            className="mb-6"
          />

          <h1 className="max-w-2xl text-5xl font-display font-black tracking-tight text-gray-900 sm:text-6xl">
            Digital Skills{" "}
            <span className="text-(--color-indigo)">Testing Platform</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-700">
            Welcome to your final assessment. Sign in to get started.
          </p>
        </section>

        <section className="surface-card mx-auto max-w-md rounded-4xl p-8 lg:p-12">
          <div>
            <SignInForm nextPath={nextPath} />
          </div>

          <p className="mt-8 text-xs leading-5 text-gray-500">
            By signing in, you agree to our assessment guidelines and platform
            terms.
          </p>
        </section>
      </div>
    </main>
  );
}
