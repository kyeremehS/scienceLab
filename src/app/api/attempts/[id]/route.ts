import { handleGetAttempt } from "@/lib/attempts-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetAttempt(req, id);
}
