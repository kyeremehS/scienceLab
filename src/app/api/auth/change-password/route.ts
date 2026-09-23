import { handleChangePassword } from "@/lib/auth-service";

export async function POST(req: Request) {
  return handleChangePassword(req);
}
