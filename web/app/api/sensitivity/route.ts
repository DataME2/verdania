import { engineRoute } from "@/lib/engine-route";
import { runSensitivity } from "@/lib/sim";
import { localizedSensitivity } from "@/lib/sim-localized";

// ponytail: about a second of engine time per new request, so a tighter limit than /api/simulate.
export const POST = engineRoute(runSensitivity, 15, localizedSensitivity);
