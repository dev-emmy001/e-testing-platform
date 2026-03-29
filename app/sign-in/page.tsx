import { redirect } from "next/navigation";
import { AuthEntryScreen } from "@/components/auth-entry-screen";
import { getOnboardingPath, getPostAuthRedirectPath } from "@/utils/auth/redirect";
import { getCurrentUserContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import { getSearchParamValue } from "@/utils/format";
import { isProfileComplete } from "@/utils/profile";

type SignInPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [params, { error, message }, { profile, user }] = await Promise.all([
    searchParams,
    readFlash(),
    getCurrentUserContext(),
  ]);
  const nextPath = getSearchParamValue(params.next);

  if (user) {
    redirect(
      isProfileComplete(profile)
        ? getPostAuthRedirectPath(nextPath, profile?.role)
        : getOnboardingPath(nextPath),
    );
  }

  return <AuthEntryScreen error={error} message={message} nextPath={nextPath} />;
}
