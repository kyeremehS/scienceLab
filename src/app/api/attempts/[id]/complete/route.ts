import { handleCompleteAttempt } from "@/lib/assessment-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleCompleteAttempt(req, id);
}
