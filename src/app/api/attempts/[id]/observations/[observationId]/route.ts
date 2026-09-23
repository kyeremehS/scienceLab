import { handleEditObservation } from "@/lib/attempts-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; observationId: string }> },
) {
  const { id, observationId } = await params;
  return handleEditObservation(req, id, observationId);
}
