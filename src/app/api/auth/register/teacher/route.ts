import { handleRegister } from "@/lib/auth-service";

export async function POST(req: Request) {
  return handleRegister("TEACHER", req);
}
