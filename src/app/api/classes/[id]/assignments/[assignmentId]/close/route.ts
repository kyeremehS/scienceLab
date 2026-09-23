import { handleCloseAssignment } from "@/lib/assignments-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { id, assignmentId } = await params;
  return handleCloseAssignment(req, id, assignmentId);
}
