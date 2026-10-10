"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// JSON call to a dashboard API route. Returns the response body, or null on failure (error is set).
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(url: string, body: unknown, method = "POST") {
    setBusy(true);
    setError("");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setError(data.error ?? "network error");
      return null;
    }
    router.refresh();
    return data;
  }
  return { busy, error, run };
}
