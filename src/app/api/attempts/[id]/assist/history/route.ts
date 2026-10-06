import { handleListAssists } from "@/lib/ai-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleListAssists(req, id);
}
