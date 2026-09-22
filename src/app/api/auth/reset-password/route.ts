import { handleResetPassword } from "@/lib/auth-service";

export async function POST(req: Request) {
  return handleResetPassword(req);
}
