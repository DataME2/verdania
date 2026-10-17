import { engineRoute } from "@/lib/engine-route";
import { runSimulation } from "@/lib/sim";
import { localized } from "@/lib/sim-localized";

export const POST = engineRoute(runSimulation, 40, localized);
