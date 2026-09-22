import { handleJoinedClasses } from "@/lib/classes-service";

export async function GET(req: Request) {
  return handleJoinedClasses(req);
}
