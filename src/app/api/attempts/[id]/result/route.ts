import { handleGetResult } from "@/lib/assessment-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetResult(req, id);
}
