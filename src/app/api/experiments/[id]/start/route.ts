import { handleStartExperiment } from "@/lib/attempts-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleStartExperiment(req, id);
}
