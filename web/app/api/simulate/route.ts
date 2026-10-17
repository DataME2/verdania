import { engineRoute } from "@/lib/engine-route";
import { runSimulation } from "@/lib/sim";

export const POST = engineRoute(runSimulation, 40);
