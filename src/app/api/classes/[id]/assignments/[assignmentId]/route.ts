import { handleGetAssignment, handleUpdateAssignment } from "@/lib/assignments-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { id, assignmentId } = await params;
  return handleGetAssignment(req, id, assignmentId);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { id, assignmentId } = await params;
  return handleUpdateAssignment(req, id, assignmentId);
}
