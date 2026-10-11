import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, readSession } from "@/lib/session";

// Every dashboard page and API route needs a login. Public: the login page and route,
// /api/live (called by snippet.js on the customer's site) and static files (snippet.js, editor.js).
export function proxy(request: NextRequest) {
  if (readSession(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "not logged in" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/login|api/live|_next/|favicon.ico|.*\\.js$).*)"],
};
