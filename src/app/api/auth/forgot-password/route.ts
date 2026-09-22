import { handleForgotPassword } from "@/lib/auth-service";

export async function POST(req: Request) {
  return handleForgotPassword(req);
}
