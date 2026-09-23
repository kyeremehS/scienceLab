import { handleCreateAssignment, handleListAssignments } from "@/lib/assignments-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleListAssignments(req, id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleCreateAssignment(req, id);
}
