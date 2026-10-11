import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

// The logged-in user, or null. proxy.ts already blocks logged-out requests; API routes
// check again here because they record who did each action.
export async function currentUser() {
  await connection(); // per-request: the expiry check reads the clock
  return readSession((await cookies()).get(COOKIE)?.value);
}

export const unauthorized = () => Response.json({ error: "not logged in" }, { status: 401 });
