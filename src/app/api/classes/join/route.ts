import { handleJoinClass } from "@/lib/classes-service";

export async function POST(req: Request) {
  return handleJoinClass(req);
}
