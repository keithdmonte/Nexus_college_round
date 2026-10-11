import { cookies } from "next/headers";
import { readJson } from "@/lib/json";
import { COOKIE, MAX_AGE, createSession } from "@/lib/session";

// POST { email, password } -> check the password with Supabase Auth, then set the session cookie.
// Users are added in the Supabase dashboard (Authentication > Users); there is no sign-up page.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.email !== "string" || typeof body?.password !== "string")
    return Response.json({ error: "email and password required" }, { status: 400 });

  // Plain REST call: signing in through the shared service-role client would swap its key for the user's.
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return Response.json({ error: "wrong email or password" }, { status: 401 });

  const { user } = await res.json();
  const email: string = user.email;
  const name: string = user.user_metadata?.name || email.split("@")[0];
  (await cookies()).set(COOKIE, createSession({ name, email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return Response.json({ name });
}
