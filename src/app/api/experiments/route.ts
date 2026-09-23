import { handleCreateExperiment } from "@/lib/experiment-creation-service";
import { handleListExperiments } from "@/lib/experiments-service";

export async function GET(req: Request) {
  return handleListExperiments(req);
}

export async function POST(req: Request) {
  return handleCreateExperiment(req);
}
