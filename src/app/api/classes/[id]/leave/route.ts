import { handleLeaveClass } from "@/lib/classes-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleLeaveClass(req, id);
}
