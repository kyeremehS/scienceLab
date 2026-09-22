import { handleRemoveMember } from "@/lib/classes-service";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  return handleRemoveMember(req, id, studentId);
}
