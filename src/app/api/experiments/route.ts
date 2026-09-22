import { handleListExperiments } from "@/lib/experiments-service";

export async function GET(req: Request) {
  return handleListExperiments(req);
}
