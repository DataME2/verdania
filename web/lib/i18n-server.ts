import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { messages } from "./i18n";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./locale";

/** The visitor's language for this request: their saved choice, else their browser's preference. */
export const getLocale = cache(async (): Promise<Locale> =>
  pickLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get("accept-language")),
);

export async function getT() {
  return messages[await getLocale()];
}
