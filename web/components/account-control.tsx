import Link from "next/link";
import { UserRound } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { t } from "@/lib/messages";
import { GoogleIcon } from "./icons";

const linkClass =
  "hidden items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-sm font-semibold text-ink/70 transition hover:text-forest md:inline-flex";

/** Reads the session, so it always sits inside <Suspense>. */
export async function AccountControl() {
  const viewer = await getViewer();
  if (!viewer) return <SignInLink />;
  return (
    <Link href="/account" className={linkClass}>
      <UserRound className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-32 truncate">{viewer.displayName}</span>
      <span className="sr-only">({t.cta.account})</span>
    </Link>
  );
}

export function SignInLink() {
  return (
    <Link href="/sign-in" className={linkClass}>
      <GoogleIcon /> {t.cta.google}
    </Link>
  );
}
