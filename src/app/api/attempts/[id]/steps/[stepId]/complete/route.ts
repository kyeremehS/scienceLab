import { handleCompleteStep } from "@/lib/attempts-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const { id, stepId } = await params;
  return handleCompleteStep(req, id, stepId);
}
