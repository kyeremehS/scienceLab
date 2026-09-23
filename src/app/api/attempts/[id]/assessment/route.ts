import { handleGetAssessment, handleSubmitAssessment } from "@/lib/assessment-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetAssessment(req, id);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleSubmitAssessment(req, id);
}
