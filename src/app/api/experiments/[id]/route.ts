import { handleGetExperiment } from "@/lib/experiments-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetExperiment(req, id);
}
