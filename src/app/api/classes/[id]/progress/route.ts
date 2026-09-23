import { handleClassProgress } from "@/lib/progress-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleClassProgress(req, id);
}
