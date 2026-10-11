import { cookies } from "next/headers";
import { COOKIE } from "@/lib/session";

// POST -> clear the session cookie.
export async function POST() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true });
}
