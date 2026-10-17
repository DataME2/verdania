import { enClient, type ClientMessages } from "./messages.client";
import { esClient } from "./messages.es.client";
import type { Locale } from "./locale";

/** The copy client components (and components shared with them) read; the server has the full catalogue. */
export const clientMessages: Record<Locale, ClientMessages> = { en: enClient, es: esClient };
