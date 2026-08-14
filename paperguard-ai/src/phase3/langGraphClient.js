function baseUrl() {
  try {
    return (import.meta.env?.VITE_LANGGRAPH_URL || "http://localhost:8000").replace(/\/$/, "");
  } catch {
    return "http://localhost:8000";
  }
}

export function isLangGraphEnabled() {
  try {
    return import.meta.env?.VITE_USE_LANGGRAPH === "true";
  } catch {
    return false;
  }
}

export async function runLangGraphVerification(claim, opts = {}) {
  const res = await fetch(`${baseUrl()}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      id: claim.id || "claim",
      text: claim.text,
      entities: claim.entities || {},
      useMock: Boolean(opts.useMock),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LangGraph API ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}
