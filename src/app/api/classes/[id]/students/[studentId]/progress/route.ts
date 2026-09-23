import { handleStudentProgress } from "@/lib/progress-service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const { id, studentId } = await params;
  return handleStudentProgress(req, id, studentId);
}
