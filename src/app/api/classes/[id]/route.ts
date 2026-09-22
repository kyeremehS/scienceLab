import { handleGetClass } from "@/lib/classes-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetClass(req, id);
}
