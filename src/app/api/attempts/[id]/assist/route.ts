import { handleAiAssist } from "@/lib/ai-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleAiAssist(req, id);
}
