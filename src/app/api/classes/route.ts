import { handleCreateClass, handleListClasses } from "@/lib/classes-service";

export async function POST(req: Request) {
  return handleCreateClass(req);
}

export async function GET(req: Request) {
  return handleListClasses(req);
}
