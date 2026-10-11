"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    if (res?.ok) {
      // refresh() re-renders the server parts of the nav with the new session.
      router.push("/");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(res ? (await res.json().catch(() => ({}))).error ?? "login failed" : "network error");
  }

  return (
    <main className="mx-auto mt-24 w-full max-w-sm p-6 text-sm">
      <h1 className="text-3xl font-extrabold tracking-tight">Log in</h1>
      <p className="mt-1 mb-6 text-zinc-500">Ask your admin for an account.</p>
      <form onSubmit={login} className="space-y-3">
        <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={busy} className="btn w-full">
          {busy ? "Logging in…" : "Log in →"}
        </button>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </main>
  );
}
