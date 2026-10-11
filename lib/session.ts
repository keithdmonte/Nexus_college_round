import { createHmac, timingSafeEqual } from "node:crypto";

// Dashboard login session: a signed cookie holding who is logged in. Passwords are checked
// by Supabase Auth at login (app/api/login); after that this cookie is the only credential.
export const COOKIE = "pw_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type User = { name: string; email: string };

// Signing key derived from the service role key, so there is no extra secret to set up.
function sign(data: string) {
  const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("pw_session").digest();
  return createHmac("sha256", key).update(data).digest("base64url");
}

export function createSession(user: User) {
  const data = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function readSession(value: string | undefined): User | null {
  const [data, sig] = value?.split(".") ?? [];
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return s.exp > Date.now() && typeof s.name === "string" && typeof s.email === "string" ? { name: s.name, email: s.email } : null;
  } catch {
    return null;
  }
}
