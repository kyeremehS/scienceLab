import { handleLogin } from "@/lib/auth-service";

export async function POST(req: Request) {
  return handleLogin(req);
}
